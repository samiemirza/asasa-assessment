import { after } from "next/server";
import type { PoolClient } from "pg";
import { getPool, iso, num, withTransaction } from "../db";
import { env } from "../env";
import { derivePrices, round2, TOLA_G } from "../money";
import { goldprice, pakgold } from "./adapters";
import { classify, needsRefresh } from "./freshness";
import { SOURCE_LABEL, type DemoSettings, type PriceView, type Snapshot, type SourceId } from "./types";

const REFRESH_LOCK_KEY = 4207;
const DEVIATION_WARN_PCT = 5;

type Queryable = Pick<PoolClient, "query">;

function rowToSnapshot(r: Record<string, unknown>): Snapshot {
  return {
    id: String(r.id),
    fetchedAt: iso(r.fetched_at)!,
    ok: Boolean(r.ok),
    source: (r.source as SourceId | null) ?? null,
    marketPkrPerG: r.market_pkr_per_g == null ? null : num(r.market_pkr_per_g),
    upstreamTs: iso(r.upstream_ts),
    fallbackUsed: Boolean(r.fallback_used),
    primaryPkrPerG: r.primary_pkr_per_g == null ? null : num(r.primary_pkr_per_g),
    fallbackPkrPerG: r.fallback_pkr_per_g == null ? null : num(r.fallback_pkr_per_g),
    deviationPct: r.deviation_pct == null ? null : num(r.deviation_pct),
    primaryError: (r.primary_error as string | null) ?? null,
    fallbackError: (r.fallback_error as string | null) ?? null,
  };
}

function settingsFromRow(r: Record<string, unknown>): DemoSettings {
  return {
    primaryDown: Boolean(r.primary_down),
    fallbackDown: Boolean(r.fallback_down),
    forceStale: Boolean(r.force_stale),
    quoteTtlSeconds: num(r.quote_ttl_seconds) || 75,
    buyFloorPkrPerG: num(r.buy_floor_pkr_per_g),
    refreshRequestedAt: iso(r.refresh_requested_at) ?? new Date(0).toISOString(),
    updatedAt: iso(r.updated_at) ?? new Date(0).toISOString(),
  };
}

export async function getDemoSettings(db: Queryable = getPool()): Promise<DemoSettings> {
  const { rows } = await db.query("select * from demo_settings where id = 1");
  return settingsFromRow(rows[0] ?? {});
}

const SNAPSHOT_COLS =
  "id, fetched_at, ok, source, market_pkr_per_g, upstream_ts, fallback_used, primary_pkr_per_g, fallback_pkr_per_g, deviation_pct, primary_error, fallback_error";

export interface PriceState {
  settings: DemoSettings;
  latest: Snapshot | null;
  good: Snapshot | null;
}

/** Settings, latest attempt and latest good snapshot in one round trip. */
async function readState(db: Queryable = getPool()): Promise<PriceState> {
  const { rows } = await db.query(
    `select
       (select row_to_json(d) from demo_settings d where d.id = 1) as settings,
       (select row_to_json(t) from (select ${SNAPSHOT_COLS} from price_snapshots order by fetched_at desc limit 1) t) as latest,
       (select row_to_json(t) from (select ${SNAPSHOT_COLS} from price_snapshots where ok order by fetched_at desc limit 1) t) as good`,
  );
  const r = rows[0] ?? {};
  return {
    settings: settingsFromRow(r.settings ?? {}),
    latest: r.latest ? rowToSnapshot(r.latest) : null,
    good: r.good ? rowToSnapshot(r.good) : null,
  };
}

export async function listSnapshots(limit = 24): Promise<Snapshot[]> {
  const { rows } = await getPool().query("select * from price_snapshots order by fetched_at desc limit $1", [limit]);
  return rows.map(rowToSnapshot);
}

interface FetchOutcome {
  ok: boolean;
  source: SourceId | null;
  market: number | null;
  upstreamTs: string | null;
  fallbackUsed: boolean;
  primary: number | null;
  fallback: number | null;
  deviationPct: number | null;
  primaryError: string | null;
  fallbackError: string | null;
  raw: Record<string, unknown>;
}

async function fetchAllSources(settings: DemoSettings): Promise<FetchOutcome> {
  const simulated = () => Promise.reject(new Error("Simulated outage via demo controls"));
  const [p, f] = await Promise.allSettled([
    settings.primaryDown ? simulated() : pakgold.fetch(),
    settings.fallbackDown ? simulated() : goldprice.fetch(),
  ]);
  const primary = p.status === "fulfilled" ? p.value : null;
  const fallback = f.status === "fulfilled" ? f.value : null;
  const primaryError = p.status === "rejected" ? String((p.reason as Error)?.message ?? p.reason) : null;
  const fallbackError = f.status === "rejected" ? String((f.reason as Error)?.message ?? f.reason) : null;
  const chosen = primary ?? fallback;
  const deviationPct =
    primary && fallback ? round2(((fallback.pkrPerGram - primary.pkrPerGram) / primary.pkrPerGram) * 100) : null;
  return {
    ok: Boolean(chosen),
    source: primary ? "pakgold" : fallback ? "goldprice" : null,
    market: chosen?.pkrPerGram ?? null,
    upstreamTs: chosen?.upstreamTs ?? null,
    fallbackUsed: !primary && Boolean(fallback),
    primary: primary?.pkrPerGram ?? null,
    fallback: fallback?.pkrPerGram ?? null,
    deviationPct,
    primaryError,
    fallbackError,
    raw: { pakgold: primary?.raw ?? null, goldprice: fallback?.raw ?? null },
  };
}

/**
 * Upstream is called at most once per refresh window. The transaction-scoped advisory lock
 * makes concurrent requests wait for one refresh instead of each calling upstream; on Neon's
 * pooled endpoint a session-scoped lock could leak to another client, so xact scope is required.
 */
async function runRefresh(settings: DemoSettings): Promise<void> {
  await withTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [REFRESH_LOCK_KEY]);
    const again = await readState(c);
    if (!needsRefresh(again.latest, settings, new Date(), env.refreshSeconds)) return;
    const out = await fetchAllSources(settings);
    await c.query(
      `insert into price_snapshots
         (ok, source, market_pkr_per_g, upstream_ts, fallback_used, primary_pkr_per_g, fallback_pkr_per_g,
          deviation_pct, primary_error, fallback_error, raw)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [out.ok, out.source, out.market, out.upstreamTs, out.fallbackUsed, out.primary, out.fallback,
       out.deviationPct, out.primaryError, out.fallbackError, JSON.stringify(out.raw)],
    );
  });
}

/**
 * Returns true when a refresh ran before returning. When `block` is false and a good price exists,
 * the refresh is scheduled after the response so page renders never wait on upstream.
 */
async function refreshIfDue(state: PriceState, block: boolean): Promise<boolean> {
  if (!needsRefresh(state.latest, state.settings, new Date(), env.refreshSeconds)) return false;
  const task = () => runRefresh(state.settings).catch((e) => console.error("price refresh failed", e));
  if (block || !state.good) {
    await task();
    return true;
  }
  try {
    after(task);
  } catch {
    void task();
  }
  return false;
}

/** Blocking refresh, used before issuing quotes and after demo changes. */
export async function ensureFreshSnapshot(): Promise<void> {
  await refreshIfDue(await readState(), true);
}

export async function getPriceView(opts: { block?: boolean } = {}): Promise<PriceView> {
  let state = await readState();
  if (await refreshIfDue(state, opts.block ?? false)) state = await readState();
  const { settings, latest, good } = state;
  const now = new Date();
  const c = classify({ good, latest, settings, now, refreshSeconds: env.refreshSeconds, staleCapSeconds: env.staleCapSeconds });
  const market = c.status === "paused" ? null : good?.marketPkrPerG ?? null;
  const derived = market ? derivePrices(market, { markup: env.buyMarkup, markdown: env.sellMarkdown, floor: settings.buyFloorPkrPerG }) : null;
  const nextRefreshAt = latest ? new Date(new Date(latest.fetchedAt).getTime() + env.refreshSeconds * 1000) : null;
  const shown = c.status === "paused" ? null : good;
  return {
    status: c.status,
    tier: c.tier,
    serverNow: now.toISOString(),
    market,
    buy: derived?.buy ?? null,
    sell: derived?.sell ?? null,
    perTola: market ? round2(market * TOLA_G) : null,
    guardrail: settings.buyFloorPkrPerG,
    guardrailApplied: derived?.guardrailApplied ?? false,
    markup: env.buyMarkup,
    markdown: env.sellMarkdown,
    source: shown?.source ?? null,
    sourceLabel: shown?.source ? SOURCE_LABEL[shown.source] : null,
    fallbackUsed: shown?.fallbackUsed ?? false,
    fetchedAt: shown?.fetchedAt ?? good?.fetchedAt ?? null,
    upstreamTs: shown?.upstreamTs ?? null,
    ageSeconds: c.ageSeconds,
    lastAttemptAt: latest?.fetchedAt ?? null,
    lastAttemptOk: latest?.ok ?? null,
    nextRefreshAt: nextRefreshAt?.toISOString() ?? null,
    nextRefreshInSeconds: nextRefreshAt ? Math.max(0, Math.round((nextRefreshAt.getTime() - now.getTime()) / 1000)) : null,
    refreshSeconds: env.refreshSeconds,
    staleCapSeconds: env.staleCapSeconds,
    primaryPkrPerG: latest?.primaryPkrPerG ?? null,
    fallbackPkrPerG: latest?.fallbackPkrPerG ?? null,
    deviationPct: latest?.deviationPct ?? null,
    deviationWarning: latest?.deviationPct != null && Math.abs(latest.deviationPct) > DEVIATION_WARN_PCT,
    primaryError: latest?.primaryError ?? null,
    fallbackError: latest?.fallbackError ?? null,
    pausedReason: c.pausedReason,
    quoteTtlSeconds: settings.quoteTtlSeconds,
    demo: { primaryDown: settings.primaryDown, fallbackDown: settings.fallbackDown, forceStale: settings.forceStale },
  };
}

export interface DemoPatch {
  primaryDown?: boolean;
  fallbackDown?: boolean;
  forceStale?: boolean;
  quoteTtlSeconds?: number;
  buyFloorPkrPerG?: number;
}

/** Any change requests a refresh outside the window so the effect is visible immediately. */
export async function updateDemoSettings(patch: DemoPatch): Promise<DemoSettings> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  const add = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (patch.primaryDown !== undefined) add("primary_down", patch.primaryDown);
  if (patch.fallbackDown !== undefined) add("fallback_down", patch.fallbackDown);
  if (patch.forceStale !== undefined) add("force_stale", patch.forceStale);
  if (patch.quoteTtlSeconds !== undefined) add("quote_ttl_seconds", patch.quoteTtlSeconds);
  if (patch.buyFloorPkrPerG !== undefined) add("buy_floor_pkr_per_g", patch.buyFloorPkrPerG);
  const sourcesChanged = patch.primaryDown !== undefined || patch.fallbackDown !== undefined;
  if (sourcesChanged) sets.push("refresh_requested_at = now()");
  if (sets.length) {
    sets.push("updated_at = now()");
    await getPool().query(`update demo_settings set ${sets.join(", ")} where id = 1`, vals);
  }
  if (sourcesChanged) await ensureFreshSnapshot();
  return getDemoSettings();
}

export async function resetDemo(): Promise<void> {
  await getPool().query("select reset_demo()");
  await ensureFreshSnapshot();
}
