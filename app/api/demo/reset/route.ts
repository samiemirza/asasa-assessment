import { ok, serverError } from "@/lib/api";
import { getBalances } from "@/lib/balances";
import { getDemoSettings, resetDemo } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetDemo();
    const [balances, settings] = await Promise.all([getBalances(), getDemoSettings()]);
    return ok({ balances, settings });
  } catch (e) {
    return serverError(e);
  }
}
