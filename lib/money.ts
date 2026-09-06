// Pure money and unit math. Shared by server and client, covered by unit tests.
export const TROY_OZ_G = 31.1035;
export const TOLA_G = 11.6638;

export const LIMITS = {
  pkr: { min: 100, max: 100_000_000, dp: 2 },
  gold: { min: 0.001, max: 10_000, dp: 4 },
} as const;

export type Side = "buy" | "sell";
export type InputMode = "pkr" | "gold";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10_000) / 10_000;
}
export function floor4(n: number): number {
  return Math.floor((n + Number.EPSILON) * 10_000) / 10_000;
}

export interface DerivedPrices {
  buy: number;
  sell: number;
  guardrailApplied: boolean;
}

/** customer buy = max(market x markup, guardrail); customer sell = market x markdown */
export function derivePrices(
  market: number,
  opts: { markup: number; markdown: number; floor: number },
): DerivedPrices {
  const marked = round2(market * opts.markup);
  const floor = round2(opts.floor);
  const guardrailApplied = floor > marked;
  return {
    buy: guardrailApplied ? floor : marked,
    sell: round2(market * opts.markdown),
    guardrailApplied,
  };
}

export interface Leg {
  pkr: number;
  gold: number;
}

/**
 * Convert the user's input into an exact (pkr, gold) pair at a unit price.
 * Gold entered: grams to 4 dp, PKR derived and rounded to 2 dp.
 * PKR entered: grams rounded DOWN to 4 dp so the PKR actually charged never exceeds the amount typed.
 */
export function computeLeg(mode: InputMode, amount: number, unitPrice: number): Leg {
  if (mode === "gold") {
    const gold = round4(amount);
    return { gold, pkr: round2(gold * unitPrice) };
  }
  let gold = floor4(amount / unitPrice);
  let pkr = round2(gold * unitPrice);
  while (pkr > amount && gold > 0) {
    gold = round4(gold - 0.0001);
    pkr = round2(gold * unitPrice);
  }
  return { gold, pkr };
}

export type ParsedAmount = { ok: true; value: number } | { ok: false; message: string };

export function parseAmount(mode: InputMode, raw: string | number): ParsedAmount {
  const text = String(raw ?? "").replace(/,/g, "").trim();
  if (text === "") return { ok: false, message: "Enter an amount" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, message: "Enter a valid number" };
  const value = Number(text);
  const lim = LIMITS[mode];
  const dp = (text.split(".")[1] ?? "").length;
  if (dp > lim.dp) return { ok: false, message: `Use at most ${lim.dp} decimal places` };
  if (value < lim.min) {
    return { ok: false, message: mode === "pkr" ? `Minimum is PKR ${formatNumber(lim.min)}` : `Minimum is ${lim.min} g` };
  }
  if (value > lim.max) {
    return { ok: false, message: mode === "pkr" ? `Maximum is PKR ${formatNumber(lim.max)}` : `Maximum is ${formatNumber(lim.max)} g` };
  }
  return { ok: true, value };
}

export function formatNumber(n: number, dp = 0): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);
}
export function formatPKR(n: number, dp = 0): string {
  return `PKR ${formatNumber(n, dp)}`;
}
export function formatGold(g: number, dp = 4): string {
  return `${formatNumber(g, dp)} g`;
}
