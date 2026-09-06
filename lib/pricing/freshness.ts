import type { DemoSettings, FreshnessTier, PriceStatus, Snapshot } from "./types";

export interface Classification {
  status: PriceStatus;
  tier: FreshnessTier;
  ageSeconds: number | null;
  pausedReason: string | null;
}

/** Pure freshness rule. `good` is the latest successful snapshot, `latest` the latest attempt. */
export function classify(args: {
  good: Snapshot | null;
  latest: Snapshot | null;
  settings: Pick<DemoSettings, "forceStale">;
  now: Date;
  refreshSeconds: number;
  staleCapSeconds: number;
}): Classification {
  const { good, latest, settings, now, refreshSeconds, staleCapSeconds } = args;
  if (!good) {
    return { status: "paused", tier: "paused", ageSeconds: null, pausedReason: "No price source has answered yet" };
  }
  const ageSeconds = Math.max(0, Math.round((now.getTime() - new Date(good.fetchedAt).getTime()) / 1000));
  if (settings.forceStale) {
    return { status: "paused", tier: "paused", ageSeconds, pausedReason: "Last good price marked untrusted by demo controls" };
  }
  if (ageSeconds > staleCapSeconds) {
    const mins = Math.round(staleCapSeconds / 60);
    return { status: "paused", tier: "paused", ageSeconds, pausedReason: `No trusted price in the last ${mins} minutes` };
  }
  const latestIsGood = latest?.id === good.id;
  if (latestIsGood && ageSeconds <= refreshSeconds + 30) {
    return { status: "live", tier: "fresh", ageSeconds, pausedReason: null };
  }
  return { status: "last_good", tier: "aging", ageSeconds, pausedReason: null };
}

export function needsRefresh(latest: Snapshot | null, settings: Pick<DemoSettings, "refreshRequestedAt">, now: Date, refreshSeconds: number): boolean {
  if (!latest) return true;
  const fetched = new Date(latest.fetchedAt).getTime();
  if (now.getTime() - fetched >= refreshSeconds * 1000) return true;
  return fetched < new Date(settings.refreshRequestedAt).getTime();
}
