import { fail, ok, readJson, serverError } from "@/lib/api";
import { getDemoSettings, updateDemoSettings, type DemoPatch } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getDemoSettings());
  } catch (e) {
    return serverError(e);
  }
}

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export async function POST(req: Request) {
  try {
    const b = await readJson(req);
    const patch: DemoPatch = {
      primaryDown: bool(b.primaryDown),
      fallbackDown: bool(b.fallbackDown),
      forceStale: bool(b.forceStale),
    };
    if (b.quoteTtlSeconds !== undefined) {
      const n = Number(b.quoteTtlSeconds);
      if (!Number.isInteger(n) || n < 5 || n > 600) return fail({ code: "VALIDATION", message: "quoteTtlSeconds must be a whole number from 5 to 600" });
      patch.quoteTtlSeconds = n;
    }
    if (b.buyFloorPkrPerG !== undefined) {
      const n = Number(b.buyFloorPkrPerG);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return fail({ code: "VALIDATION", message: "buyFloorPkrPerG must be from 0 to 1,000,000" });
      patch.buyFloorPkrPerG = Math.round(n * 100) / 100;
    }
    return ok(await updateDemoSettings(patch));
  } catch (e) {
    return serverError(e);
  }
}
