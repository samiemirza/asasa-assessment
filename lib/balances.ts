import { getPool, iso, num } from "./db";

export interface Balances {
  pkr: number;
  customerGoldG: number;
  inventoryGoldG: number;
  updatedAt: string;
}

export function balancesFromJson(j: Record<string, unknown> | null | undefined): Omit<Balances, "updatedAt"> {
  return {
    pkr: num(j?.pkr),
    customerGoldG: num(j?.customer_gold_g),
    inventoryGoldG: num(j?.inventory_gold_g),
  };
}

export async function getBalances(): Promise<Balances> {
  const { rows } = await getPool().query("select * from balances where id = 1");
  const r = rows[0] ?? {};
  return { ...balancesFromJson(r), updatedAt: iso(r.updated_at) ?? new Date().toISOString() };
}
