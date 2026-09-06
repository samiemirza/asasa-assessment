"use client";
import { useEffect, useState } from "react";
import { fmtPKR, inTime } from "@/lib/format";
import type { PriceView } from "@/lib/pricing/types";
import { RelTime } from "./RelTime";
import { Sparkline } from "./Sparkline";
import { StatusPill } from "./StatusPill";

export function PriceHero({ initial, history }: { initial: PriceView; history: number[] }) {
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
    <section className={`${paused ? "hero-paused" : "hero"} rise rounded-card p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink/70">24K gold, per gram</span>
        <StatusPill status={price.status} onLight />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="display num">
          {paused ? (
            <span className="text-[34px] font-semibold">Trading paused</span>
          ) : (
            <>
              <span className="mr-1.5 align-top text-[17px] font-medium text-ink/70">PKR</span>
              <span className="text-[44px] font-semibold">{price.market!.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </>
          )}
        </div>
        {!paused ? <Sparkline points={history} className="h-9 w-24 shrink-0 text-forest/70" /> : null}
      </div>

      {paused ? (
        <p className="mt-2 text-[14px] leading-snug text-ink/75">{price.pausedReason}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-inner bg-ink/6 px-3.5 py-3">
            <p className="text-[12px] text-ink/65">You buy at</p>
            <p className="num mt-0.5 text-[17px] font-semibold">{fmtPKR(price.buy!)}</p>
            {price.guardrailApplied ? (
              <span className="mt-1.5 inline-block rounded-pill bg-forest px-2 py-0.5 text-[11px] font-medium text-white">Guardrail applied</span>
            ) : null}
          </div>
          <div className="rounded-inner bg-ink/6 px-3.5 py-3">
            <p className="text-[12px] text-ink/65">You sell at</p>
            <p className="num mt-0.5 text-[17px] font-semibold">{fmtPKR(price.sell!)}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
        {paused ? (
          <>
            {"Last check "}
            <RelTime iso={price.lastAttemptAt} serverNow={price.serverNow} />
          </>
        ) : (
          <>
            {price.sourceLabel}
            {price.fallbackUsed ? " (fallback)" : ""}
            {" · refreshed "}
            <RelTime iso={price.fetchedAt} serverNow={price.serverNow} />
          </>
        )}
        {price.nextRefreshInSeconds != null ? ` · next check in ${inTime(price.nextRefreshInSeconds)}` : ""}
      </p>
    </section>
  );
}
