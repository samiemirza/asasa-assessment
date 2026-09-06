import { fail, ok, readJson, serverError } from "@/lib/api";
import { createQuote } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const r = await createQuote(body);
    return r.ok ? ok(r.data, { status: 201 }) : fail(r.error);
  } catch (e) {
    return serverError(e);
  }
}
