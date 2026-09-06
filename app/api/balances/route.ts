import { ok, serverError } from "@/lib/api";
import { getBalances } from "@/lib/balances";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getBalances());
  } catch (e) {
    return serverError(e);
  }
}
