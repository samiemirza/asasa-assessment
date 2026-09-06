import { describe, expect, it } from "vitest";
import { computeLeg, derivePrices, parseAmount, round2, TROY_OZ_G } from "./money";

describe("derivePrices", () => {
  it("applies markup and markdown", () => {
    const p = derivePrices(40000, { markup: 1.1, markdown: 0.9, floor: 30000 });
    expect(p.buy).toBe(44000);
    expect(p.sell).toBe(36000);
    expect(p.guardrailApplied).toBe(false);
  });
  it("binds the guardrail when the floor is above market x markup", () => {
    const p = derivePrices(40000, { markup: 1.1, markdown: 0.9, floor: 45000 });
    expect(p.buy).toBe(45000);
    expect(p.guardrailApplied).toBe(true);
    expect(p.sell).toBe(36000);
  });
  it("does not bind when the floor equals market x markup", () => {
    const p = derivePrices(40000, { markup: 1.1, markdown: 0.9, floor: 44000 });
    expect(p.guardrailApplied).toBe(false);
  });
});

describe("computeLeg", () => {
  it("rounds grams to 4 dp and derives PKR", () => {
    const leg = computeLeg("gold", 1.23456, 43493.21);
    expect(leg.gold).toBe(1.2346);
    expect(leg.pkr).toBe(round2(1.2346 * 43493.21));
  });
  it("never charges more than the PKR typed", () => {
    for (const price of [43493.21, 39138, 12345.67, 99999.99]) {
      for (const amount of [100, 999.99, 5000, 123456.78, 500000]) {
        const leg = computeLeg("pkr", amount, price);
        expect(leg.pkr).toBeLessThanOrEqual(amount);
        expect(leg.gold * 10000).toBeCloseTo(Math.round(leg.gold * 10000), 6);
        expect(amount - leg.pkr).toBeLessThan(price * 0.0001 + 0.01);
      }
    }
  });
});

describe("parseAmount", () => {
  it("accepts commas and rejects junk", () => {
    expect(parseAmount("pkr", "50,000")).toEqual({ ok: true, value: 50000 });
    expect(parseAmount("pkr", "abc").ok).toBe(false);
    expect(parseAmount("pkr", "-5").ok).toBe(false);
    expect(parseAmount("pkr", "").ok).toBe(false);
    expect(parseAmount("pkr", "1e5").ok).toBe(false);
  });
  it("enforces decimal places and bounds", () => {
    expect(parseAmount("pkr", "10.123").ok).toBe(false);
    expect(parseAmount("gold", "1.12345").ok).toBe(false);
    expect(parseAmount("gold", "0.0001").ok).toBe(false);
    expect(parseAmount("gold", "0.001").ok).toBe(true);
    expect(parseAmount("pkr", "99").ok).toBe(false);
    expect(parseAmount("pkr", "100000001").ok).toBe(false);
  });
});

describe("units", () => {
  it("uses the troy ounce", () => {
    expect(round2(1229792 / TROY_OZ_G)).toBe(39538.7);
  });
});
