import { getPool, iso, num } from "../db";
import { balancesFromJson, getBalances, type Balances } from "../balances";
import { computeLeg, floor4, parseAmount, round2, type InputMode, type Side } from "../money";
import { getDemoSettings, getPriceView } from "../pricing/engine";
import { SOURCE_LABEL, type SourceId } from "../pricing/types";

export type ErrorCode =
  | "VALIDATION"
  | "PRICING_UNAVAILABLE"
  | "AMOUNT_TOO_SMALL"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_GOLD"
  | "INSUFFICIENT_INVENTORY"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "TRADE_NOT_FOUND";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface QuoteView {
  id: string;
  side: Side;
  inputMode: InputMode;
  inputAmount: number;
  pkr: number;
  goldG: number;
  unitPrice: number;
  marketPrice: number;
  guardrailApplied: boolean;
  source: SourceId;
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  ttlSeconds: number;
  status: "locked" | "filled" | "expired";
  tradeId: string | null;
  serverNow: string;
  secondsLeft: number;
}

export interface TradeView {
  id: string;
  quoteId: string;
  side: Side;
  pkr: number;
  goldG: number;
  unitPrice: number;
  marketPrice: number;
  source: SourceId;
  sourceLabel: string;
  executedAt: string;
  before: Omit<Balances, "updatedAt">;
  after: Omit<Balances, "updatedAt">;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

function quoteFromRow(r: Record<string, unknown>, serverNow: Date): QuoteView {
  const expiresAt = new Date(String(iso(r.expires_at)));
  const createdAt = new Date(String(iso(r.created_at)));
  const secondsLeft = Math.max(0, (expiresAt.getTime() - serverNow.getTime()) / 1000);
  const dbStatus = String(r.status) as "locked" | "filled";
  const source = String(r.source) as SourceId;
  return {
    id: String(r.id),
    side: String(r.side) as Side,
    inputMode: String(r.input_mode) as InputMode,
    inputAmount: num(r.input_amount),
    pkr: num(r.pkr),
    goldG: num(r.gold_g),
    unitPrice: num(r.unit_price),
    marketPrice: num(r.market_price),
    guardrailApplied: Boolean(r.guardrail_applied),
    source,
    sourceLabel: SOURCE_LABEL[source] ?? source,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ttlSeconds: Math.round((expiresAt.getTime() - createdAt.getTime()) / 1000),
    status: dbStatus === "filled" ? "filled" : secondsLeft <= 0 ? "expired" : "locked",
    tradeId: (r.trade_id as string | null) ?? null,
    serverNow: serverNow.toISOString(),
    secondsLeft: Math.round(secondsLeft * 10) / 10,
  };
}

function tradeFromRow(r: Record<string, unknown>): TradeView {
  const source = String(r.source) as SourceId;
  return {
    id: String(r.id),
    quoteId: String(r.quote_id),
    side: String(r.side) as Side,
    pkr: num(r.pkr),
    goldG: num(r.gold_g),
    unitPrice: num(r.unit_price),
    marketPrice: num(r.market_price),
    source,
    sourceLabel: SOURCE_LABEL[source] ?? source,
    executedAt: String(iso(r.executed_at)),
    before: balancesFromJson(r.balances_before as Record<string, unknown>),
    after: balancesFromJson(r.balances_after as Record<string, unknown>),
  };
}

export async function createQuote(input: { side?: unknown; mode?: unknown; amount?: unknown }): Promise<Result<QuoteView>> {
  const side = input.side;
  const mode = input.mode;
  if (side !== "buy" && side !== "sell") return fail("VALIDATION", "side must be buy or sell");
  if (mode !== "pkr" && mode !== "gold") return fail("VALIDATION", "mode must be pkr or gold");
  const parsed = parseAmount(mode, input.amount as string | number);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const price = await getPriceView({ block: true });
  if (price.status === "paused" || price.buy == null || price.sell == null || price.market == null || !price.source) {
    return fail("PRICING_UNAVAILABLE", price.pausedReason ?? "Pricing is paused", { pausedReason: price.pausedReason });
  }
  const unitPrice = side === "buy" ? price.buy : price.sell;
  const leg = computeLeg(mode, parsed.value, unitPrice);
  if (leg.gold < 0.0001 || leg.pkr <= 0) return fail("AMOUNT_TOO_SMALL", "Amount is below the smallest tradable unit");

  const b = await getBalances();
  if (side === "buy") {
    // Report whichever constraint binds first so the "up to" hint is always achievable.
    const maxByCash = floor4(b.pkr / unitPrice);
    const maxByInventory = b.inventoryGoldG;
    if (leg.gold > maxByInventory && maxByInventory <= maxByCash) {
      return fail("INSUFFICIENT_INVENTORY", "Not enough gold in platform inventory", { available: b.inventoryGoldG, required: leg.gold, maxGold: maxByInventory, maxPkr: round2(maxByInventory * unitPrice) });
    }
    if (leg.pkr > b.pkr) {
      return fail("INSUFFICIENT_CASH", "Not enough PKR in the wallet", { available: b.pkr, required: leg.pkr, maxGold: maxByCash, maxPkr: round2(maxByCash * unitPrice) });
    }
    if (leg.gold > maxByInventory) {
      return fail("INSUFFICIENT_INVENTORY", "Not enough gold in platform inventory", { available: b.inventoryGoldG, required: leg.gold, maxGold: maxByInventory, maxPkr: round2(maxByInventory * unitPrice) });
    }
  } else if (leg.gold > b.customerGoldG) {
    return fail("INSUFFICIENT_GOLD", "Not enough gold in your holdings", { available: b.customerGoldG, required: leg.gold, maxGold: b.customerGoldG, maxPkr: round2(b.customerGoldG * unitPrice) });
  }

  const settings = await getDemoSettings();
  const { rows } = await getPool().query(
    `insert into quotes (side, input_mode, input_amount, pkr, gold_g, unit_price, market_price, guardrail_applied, source, snapshot_id, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,
             (select id from price_snapshots where ok order by fetched_at desc limit 1),
             now() + make_interval(secs => $10))
     returning *, now() as server_now`,
    [side, mode, parsed.value, leg.pkr, leg.gold, unitPrice, price.market, price.guardrailApplied, price.source, settings.quoteTtlSeconds],
  );
  const r = rows[0];
  return { ok: true, data: quoteFromRow(r, new Date(String(iso(r.server_now)))) };
}

export async function getQuote(id: string): Promise<QuoteView | null> {
  if (!isUuid(id)) return null;
  const { rows } = await getPool().query("select *, now() as server_now from quotes where id = $1", [id]);
  if (!rows[0]) return null;
  return quoteFromRow(rows[0], new Date(String(iso(rows[0].server_now))));
}

export interface ConfirmOk {
  trade: TradeView;
  repeated: boolean;
  balances: Balances;
}

export async function confirmQuote(id: string): Promise<Result<ConfirmOk>> {
  if (!isUuid(id)) return fail("QUOTE_NOT_FOUND", "Quote not found");
  const { rows } = await getPool().query("select confirm_quote($1) as r", [id]);
  const r = rows[0].r as Record<string, unknown>;
  if (!r.ok) {
    const code = String(r.code) as ErrorCode;
    const messages: Partial<Record<ErrorCode, string>> = {
      QUOTE_NOT_FOUND: "Quote not found",
      QUOTE_EXPIRED: "This quote has expired",
      INSUFFICIENT_CASH: "Not enough PKR in the wallet",
      INSUFFICIENT_GOLD: "Not enough gold in your holdings",
      INSUFFICIENT_INVENTORY: "Not enough gold in platform inventory",
    };
    const { ok: _ok, code: _code, ...details } = r;
    return fail(code, messages[code] ?? "Could not confirm", details);
  }
  const trade = tradeFromRow(r.trade as Record<string, unknown>);
  const balances = await getBalances();
  return { ok: true, data: { trade, repeated: Boolean(r.repeated), balances } };
}

export async function getTrade(id: string): Promise<TradeView | null> {
  if (!isUuid(id)) return null;
  const { rows } = await getPool().query("select * from trades where id = $1", [id]);
  return rows[0] ? tradeFromRow(rows[0]) : null;
}

export async function listTrades(limit = 50): Promise<TradeView[]> {
  const { rows } = await getPool().query("select * from trades order by executed_at desc limit $1", [limit]);
  return rows.map(tradeFromRow);
}

function fail<T>(code: ErrorCode, message: string, details?: Record<string, unknown>): Result<T> {
  return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
}
