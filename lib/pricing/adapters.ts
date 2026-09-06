import { round2, TROY_OZ_G } from "../money";
import type { AdapterResult, PriceAdapter } from "./types";

const TIMEOUT_MS = 5000;
/** A slow upstream gets one quick second chance before the check counts as failed. */
const RETRY_TIMEOUT_MS = 3000;
// GoldPrice.org's data host answers 403 to non-browser requests. Verified from Vercel on 2026-09-06:
// user agent alone is not enough, the Referer, Origin and Sec-Fetch headers are what unlock it.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://goldprice.org/",
  Origin: "https://goldprice.org",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

/** Reject values that cannot be a 24K PKR per gram price (catches unit mix-ups). */
export function assertPlausible(pkrPerGram: number): number {
  if (!Number.isFinite(pkrPerGram) || pkrPerGram < 5_000 || pkrPerGram > 500_000) {
    throw new Error(`Implausible PKR/g value: ${pkrPerGram}`);
  }
  return pkrPerGram;
}

async function fetchOnce(url: string, headers: Record<string, string>, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`Timed out after ${timeoutMs} ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Timeouts and network errors get one retry; HTTP errors (403, 429, 5xx) do not. */
async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  try {
    return await fetchOnce(url, headers, TIMEOUT_MS);
  } catch (e) {
    if (/^HTTP \d+/.test((e as Error).message)) throw e;
    try {
      return await fetchOnce(url, headers, RETRY_TIMEOUT_MS);
    } catch (e2) {
      throw new Error(`${(e as Error).message}, retry: ${(e2 as Error).message}`);
    }
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 80).replace(/\s+/g, " ")}`);
  }
}

/** PakGold publishes spot XAU/USD x USD/PKR / 31.1035. Both feeds are keyless JSON. */
export function parsePakgold(xau: unknown, fx: unknown): AdapterResult {
  const x = xau as { price?: unknown; updatedAt?: unknown };
  const f = fx as { rates?: { PKR?: unknown }; time_last_update_utc?: unknown };
  const usdPerOz = Number(x?.price);
  const pkrPerUsd = Number(f?.rates?.PKR);
  if (!Number.isFinite(usdPerOz) || usdPerOz <= 0) throw new Error("gold-api.com: missing XAU price");
  if (!Number.isFinite(pkrPerUsd) || pkrPerUsd <= 0) throw new Error("er-api.com: missing USD/PKR rate");
  const pkrPerGram = assertPlausible(round2((usdPerOz * pkrPerUsd) / TROY_OZ_G));
  const ts = typeof x.updatedAt === "string" ? new Date(x.updatedAt) : null;
  return {
    pkrPerGram,
    upstreamTs: ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : null,
    raw: { usdPerOz, pkrPerUsd, xauUpdatedAt: x.updatedAt ?? null, fxUpdatedAt: f.time_last_update_utc ?? null },
  };
}

/** GoldPrice.org returns PKR per troy ounce in items[].xauPrice. */
export function parseGoldprice(json: unknown): AdapterResult {
  const j = json as { items?: Array<{ curr?: string; xauPrice?: unknown }>; ts?: unknown };
  const item = Array.isArray(j?.items) ? j.items.find((i) => i?.curr === "PKR") : undefined;
  const pkrPerOz = Number(item?.xauPrice);
  if (!Number.isFinite(pkrPerOz) || pkrPerOz <= 0) throw new Error("goldprice.org: missing PKR xauPrice");
  const pkrPerGram = assertPlausible(round2(pkrPerOz / TROY_OZ_G));
  const ts = typeof j.ts === "number" ? new Date(j.ts) : null;
  return {
    pkrPerGram,
    upstreamTs: ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : null,
    raw: { pkrPerOz, ts: j.ts ?? null },
  };
}

export const pakgold: PriceAdapter = {
  id: "pakgold",
  label: "PakGold",
  async fetch() {
    const [xauText, fxText] = await Promise.all([
      fetchText("https://api.gold-api.com/price/XAU"),
      fetchText("https://open.er-api.com/v6/latest/USD"),
    ]);
    return parsePakgold(parseJson(xauText), parseJson(fxText));
  },
};

export const goldprice: PriceAdapter = {
  id: "goldprice",
  label: "GoldPrice.org",
  async fetch() {
    const text = await fetchText("https://data-asg.goldprice.org/dbXRates/PKR", BROWSER_HEADERS);
    return parseGoldprice(parseJson(text));
  },
};
