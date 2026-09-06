import { fail, ok, serverError } from "@/lib/api";
import { getTrade } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const t = await getTrade(id);
    return t ? ok(t) : fail({ code: "TRADE_NOT_FOUND", message: "Trade not found" });
  } catch (e) {
    return serverError(e);
  }
}
