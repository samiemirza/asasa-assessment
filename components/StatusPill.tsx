import type { PriceStatus } from "@/lib/pricing/types";

const META: Record<PriceStatus, { label: string; dot: string; onDark: string; onLight: string }> = {
  live: { label: "Live", dot: "bg-green", onDark: "bg-green-tint text-green-soft", onLight: "bg-ink/8 text-ink" },
  last_good: { label: "Last good price", dot: "bg-gold", onDark: "bg-gold-tint text-gold", onLight: "bg-ink/8 text-ink" },
  paused: { label: "Paused", dot: "bg-red", onDark: "bg-rose-tint text-rose", onLight: "bg-red/12 text-red" },
};

export function StatusPill({ status, onLight = false }: { status: PriceStatus; onLight?: boolean }) {
  const m = META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium ${onLight ? m.onLight : m.onDark}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot} ${status === "live" ? "pulse" : ""}`} />
      {m.label}
    </span>
  );
}
