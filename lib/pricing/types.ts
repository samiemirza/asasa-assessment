export type SourceId = "pakgold" | "goldprice";

export const SOURCE_LABEL: Record<SourceId, string> = {
  pakgold: "PakGold",
  goldprice: "GoldPrice.org",
};

export interface AdapterResult {
  pkrPerGram: number;
  upstreamTs: string | null;
  raw: Record<string, unknown>;
}

export interface PriceAdapter {
  id: SourceId;
  label: string;
  fetch(): Promise<AdapterResult>;
}

export interface Snapshot {
  id: string;
  fetchedAt: string;
  ok: boolean;
  source: SourceId | null;
  marketPkrPerG: number | null;
  upstreamTs: string | null;
  fallbackUsed: boolean;
  primaryPkrPerG: number | null;
  fallbackPkrPerG: number | null;
  deviationPct: number | null;
  primaryError: string | null;
  fallbackError: string | null;
}

export interface DemoSettings {
  primaryDown: boolean;
  fallbackDown: boolean;
  forceStale: boolean;
  quoteTtlSeconds: number;
  buyFloorPkrPerG: number;
  refreshRequestedAt: string;
  updatedAt: string;
}

export type PriceStatus = "live" | "last_good" | "paused";
export type FreshnessTier = "fresh" | "aging" | "paused";

export interface PriceView {
  status: PriceStatus;
  tier: FreshnessTier;
  serverNow: string;
  market: number | null;
  buy: number | null;
  sell: number | null;
  perTola: number | null;
  guardrail: number;
  guardrailApplied: boolean;
  markup: number;
  markdown: number;
  source: SourceId | null;
  sourceLabel: string | null;
  fallbackUsed: boolean;
  fetchedAt: string | null;
  upstreamTs: string | null;
  ageSeconds: number | null;
  lastAttemptAt: string | null;
  lastAttemptOk: boolean | null;
  nextRefreshAt: string | null;
  nextRefreshInSeconds: number | null;
  refreshSeconds: number;
  staleCapSeconds: number;
  primaryPkrPerG: number | null;
  fallbackPkrPerG: number | null;
  deviationPct: number | null;
  deviationWarning: boolean;
  primaryError: string | null;
  fallbackError: string | null;
  pausedReason: string | null;
  quoteTtlSeconds: number;
  demo: { primaryDown: boolean; fallbackDown: boolean; forceStale: boolean };
}
