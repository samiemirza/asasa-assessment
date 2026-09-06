// Client-safe formatting helpers. Times are shown in Pakistan time so server and client agree.
import { formatNumber } from "./money";

export const TZ = "Asia/Karachi";

export function fmtPKR(n: number, dp = 0): string {
  return `PKR ${formatNumber(n, dp)}`;
}
export function fmtG(n: number, dp = 4): string {
  return `${formatNumber(n, dp)} g`;
}

export function relTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function inTime(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  if (seconds <= 0) return "now";
  if (seconds < 60) return `${seconds} s`;
  return `${Math.ceil(seconds / 60)} min`;
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
  return `${date}, ${fmtTime(iso)} PKT`;
}

export function fmtMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "long", year: "numeric" }).format(new Date(iso));
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
