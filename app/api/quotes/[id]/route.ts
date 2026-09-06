import { fail, ok, serverError } from "@/lib/api";
import { getQuote } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const q = await getQuote(id);
    return q ? ok(q) : fail({ code: "QUOTE_NOT_FOUND", message: "Quote not found" });
  } catch (e) {
    return serverError(e);
  }
}
