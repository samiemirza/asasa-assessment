import { Pool, type PoolClient } from "pg";
import { env } from "./env";

const globalForPg = globalThis as unknown as { __asasaPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__asasaPool) {
    if (!env.databaseUrl) throw new Error("DATABASE_URL is not set");
    globalForPg.__asasaPool = new Pool({
      connectionString: env.databaseUrl,
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return globalForPg.__asasaPool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    try { await client.query("rollback"); } catch { /* connection already gone */ }
    throw e;
  } finally {
    client.release();
  }
}

/** pg returns numeric columns as strings; jsonb numbers arrive as numbers. */
export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function iso(v: unknown): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
}
