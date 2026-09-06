import { describe, expect, it } from "vitest";
import { classify, needsRefresh } from "./freshness";
import type { Snapshot } from "./types";

const now = new Date("2026-09-06T12:00:00Z");
const snap = (id: string, secondsAgo: number, ok = true): Snapshot => ({
  id, ok, fetchedAt: new Date(now.getTime() - secondsAgo * 1000).toISOString(),
  source: ok ? "pakgold" : null, marketPkrPerG: ok ? 40000 : null, upstreamTs: null, fallbackUsed: false,
  primaryPkrPerG: null, fallbackPkrPerG: null, deviationPct: null, primaryError: null, fallbackError: null,
});
const base = { settings: { forceStale: false }, now, refreshSeconds: 300, staleCapSeconds: 900 };

describe("classify", () => {
  it("is paused with no good snapshot", () => {
    expect(classify({ ...base, good: null, latest: snap("a", 10, false) }).status).toBe("paused");
  });
  it("is live when the latest attempt succeeded recently", () => {
    const g = snap("a", 60);
    expect(classify({ ...base, good: g, latest: g })).toMatchObject({ status: "live", tier: "fresh", ageSeconds: 60 });
  });
  it("serves the last good price when the latest attempt failed", () => {
    const c = classify({ ...base, good: snap("a", 400), latest: snap("b", 10, false) });
    expect(c).toMatchObject({ status: "last_good", tier: "aging", ageSeconds: 400 });
  });
  it("pauses past the stale cap", () => {
    const c = classify({ ...base, good: snap("a", 901), latest: snap("b", 10, false) });
    expect(c.status).toBe("paused");
    expect(c.pausedReason).toMatch(/15 minutes/);
  });
  it("pauses when demo controls force stale", () => {
    const g = snap("a", 10);
    expect(classify({ ...base, settings: { forceStale: true }, good: g, latest: g }).status).toBe("paused");
  });
});

describe("needsRefresh", () => {
  const settings = { refreshRequestedAt: new Date(now.getTime() - 3600 * 1000).toISOString() };
  it("refreshes when nothing exists or the window has passed", () => {
    expect(needsRefresh(null, settings, now, 300)).toBe(true);
    expect(needsRefresh(snap("a", 300), settings, now, 300)).toBe(true);
    expect(needsRefresh(snap("a", 299), settings, now, 300)).toBe(false);
  });
  it("refreshes when demo settings changed after the last attempt", () => {
    const recent = { refreshRequestedAt: new Date(now.getTime() - 5 * 1000).toISOString() };
    expect(needsRefresh(snap("a", 30), recent, now, 300)).toBe(true);
    expect(needsRefresh(snap("a", 2), recent, now, 300)).toBe(false);
  });
});
