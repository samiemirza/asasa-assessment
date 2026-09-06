import { ok, serverError } from "@/lib/api";
import { listTrades } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ trades: await listTrades() });
  } catch (e) {
    return serverError(e);
  }
}
