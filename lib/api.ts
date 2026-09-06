import { NextResponse } from "next/server";
import type { ApiError, ErrorCode } from "./quotes/service";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  AMOUNT_TOO_SMALL: 400,
  QUOTE_NOT_FOUND: 404,
  TRADE_NOT_FOUND: 404,
  QUOTE_EXPIRED: 409,
  INSUFFICIENT_CASH: 409,
  INSUFFICIENT_GOLD: 409,
  INSUFFICIENT_INVENTORY: 409,
  PRICING_UNAVAILABLE: 503,
};

const noStore = { "Cache-Control": "no-store" };

export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: noStore });
}

export function fail(error: ApiError) {
  return NextResponse.json({ error }, { status: STATUS[error.code] ?? 400, headers: noStore });
}

export function serverError(e: unknown) {
  console.error(e);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong on the server" } },
    { status: 500, headers: noStore },
  );
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
