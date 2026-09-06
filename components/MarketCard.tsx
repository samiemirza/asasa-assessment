"use client";
import { useEffect, useState } from "react";
import { fmtPKR } from "@/lib/format";
import type { PriceView } from "@/lib/pricing/types";
import { RelTime } from "./RelTime";

function ChangeChip({ now, open }: { now: number | null; open: number | null }) {
  if (now == null || open == null || open <= 0) return null;
  const pct = ((now - open) / open) * 100;
  const sign = pct > 0.05 ? "+" : pct < -0.05 ? "−" : "";
  const tone = pct > 0.05 ? "bg-forest text-white" : pct < -0.05 ? "bg-red/12 text-red" : "bg-ink/8 text-ink";
  return (
    <span className={`num rounded-pill px-2.5 py-1 text-[12px] font-medium ${tone}`}>
      {sign}
      {Math.abs(pct).toFixed(1)}% today
    </span>
  );
}

export function MarketCard({ initial, dayOpen }: { initial: PriceView; dayOpen: number | null }) {
  const [price, setPrice] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/price", { cache: "no-store" });
        if (res.ok && alive) setPrice(await res.json());
      } catch {
        /* keep the last view */
      }
    };
    const t = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const paused = price.status === "paused";
  return (
    <section className={`${paused ? "hero-paused" : "hero"} rise rounded-card p-5`} aria-label="Gold market">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink/70">24K gold price</span>
        {paused ? (
          <span className="rounded-pill bg-red/12 px-2.5 py-1 text-[12px] font-medium text-red">Paused</span>
        ) : (
          <ChangeChip now={price.market} open={dayOpen} />
        )}
      </div>

      <div className="display num mt-3">
        {paused ? (
          <span className="text-[34px] font-semibold">Trading paused</span>
        ) : (
          <>
            <span className="mr-1.5 align-top text-[17px] font-medium text-ink/70">PKR</span>
            <span className="text-[44px] font-semibold">{price.market!.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            <span className="ml-1.5 text-[17px] font-medium text-ink/70">/ g</span>
          </>
        )}
      </div>

      {paused ? (
        <p className="mt-2 text-[14px] leading-snug text-ink/75">{price.pausedReason}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-inner bg-ink/6 px-3.5 py-3">
            <p className="text-[12px] text-ink/65">Buy price</p>
            <p className="num mt-0.5 text-[17px] font-semibold">{fmtPKR(price.buy!)}</p>
            {price.guardrailApplied ? <p className="mt-0.5 text-[11px] font-medium text-forest">Guardrail applied</p> : null}
          </div>
          <div className="rounded-inner bg-ink/6 px-3.5 py-3">
            <p className="text-[12px] text-ink/65">Sell price</p>
            <p className="num mt-0.5 text-[17px] font-semibold">{fmtPKR(price.sell!)}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-[12px] text-ink/65">
        {paused ? "Last check " : "Updated "}
        <RelTime iso={paused ? price.lastAttemptAt : price.fetchedAt} serverNow={price.serverNow} />
        {!paused && price.sourceLabel ? ` · ${price.sourceLabel}${price.fallbackUsed ? " (fallback)" : ""}` : ""}
        {!paused && price.status === "last_good" ? " · last good price" : ""}
      </p>
    </section>
  );
}
