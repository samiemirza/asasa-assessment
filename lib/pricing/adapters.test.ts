import { describe, expect, it } from "vitest";
import { parseGoldprice, parsePakgold } from "./adapters";

describe("parsePakgold", () => {
  it("normalizes XAU/USD x USD/PKR per troy ounce to PKR per gram", () => {
    const r = parsePakgold(
      { price: 4431.100098, updatedAt: "2026-09-06T12:57:35Z" },
      { rates: { PKR: 277.545452 }, time_last_update_utc: "x" },
    );
    expect(r.pkrPerGram).toBe(39539.98);
    expect(r.upstreamTs).toBe("2026-09-06T12:57:35.000Z");
  });
  it("fails on missing fields", () => {
    expect(() => parsePakgold({}, { rates: { PKR: 277 } })).toThrow(/XAU/);
    expect(() => parsePakgold({ price: 4431 }, {})).toThrow(/PKR/);
  });
  it("rejects implausible values (unit mix-ups)", () => {
    expect(() => parsePakgold({ price: 4431 }, { rates: { PKR: 1 } })).toThrow(/Implausible/);
  });
});

describe("parseGoldprice", () => {
  it("converts PKR per ounce to per gram", () => {
    const r = parseGoldprice({ ts: 1757163000000, items: [{ curr: "PKR", xauPrice: 1229792 }] });
    expect(r.pkrPerGram).toBe(39538.7);
    expect(r.upstreamTs).toBe(new Date(1757163000000).toISOString());
  });
  it("fails on rate-limit text or wrong currency", () => {
    expect(() => parseGoldprice("You've attempted too many requests.")).toThrow();
    expect(() => parseGoldprice({ items: [{ curr: "USD", xauPrice: 4431 }] })).toThrow(/PKR/);
  });
});
