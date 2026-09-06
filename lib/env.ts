// Server-only configuration. Never import from client components.
function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  refreshSeconds: numberEnv("PRICE_REFRESH_SECONDS", 300),
  staleCapSeconds: numberEnv("PRICE_STALE_CAP_SECONDS", 900),
  buyMarkup: numberEnv("BUY_MARKUP", 1.1),
  sellMarkdown: numberEnv("SELL_MARKDOWN", 0.9),
};
