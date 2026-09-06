import { fail, ok, serverError } from "@/lib/api";
import { confirmQuote } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

/** Idempotent: the quote id is the only input; repeated calls return the same trade. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const r = await confirmQuote(id);
    return r.ok ? ok(r.data) : fail(r.error);
  } catch (e) {
    return serverError(e);
  }
}
