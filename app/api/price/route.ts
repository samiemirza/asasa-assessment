import { ok, serverError } from "@/lib/api";
import { getPriceView } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getPriceView());
  } catch (e) {
    return serverError(e);
  }
}
