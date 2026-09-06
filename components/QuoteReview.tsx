"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtG, fmtPKR, fmtTime, shortId } from "@/lib/format";
import type { PriceView } from "@/lib/pricing/types";
import type { QuoteView } from "@/lib/quotes/service";
import { Button } from "./Button";
import { CountdownRing } from "./CountdownRing";
import { Header } from "./Header";
import { Card, Row } from "./Row";

type Phase = "reviewing" | "confirming" | "expired" | "requoting" | "failed";

export function QuoteReview({ initial }: { initial: QuoteView }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial.status === "expired" ? "expired" : "reviewing");
  const [remaining, setRemaining] = useState(initial.secondsLeft);
  const [message, setMessage] = useState<string | null>(null);
  const [nowPrice, setNowPrice] = useState<PriceView | null>(null);
  const [requoteBlocked, setRequoteBlocked] = useState(false);
  // Server clock minus client clock, so the countdown follows the server's expiry.
  const offset = useRef(new Date(initial.serverNow).getTime() - Date.now());
  const expiresAt = useRef(new Date(initial.expiresAt).getTime());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const isBuy = quote.side === "buy";

  const loadNowPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/price", { cache: "no-store" });
      if (res.ok) setNowPrice(await res.json());
    } catch {
      /* comparison is optional */
    }
  }, []);

  // Countdown tick.
  useEffect(() => {
    const t = setInterval(() => {
      const left = (expiresAt.current - (Date.now() + offset.current)) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0 && phaseRef.current === "reviewing") {
        setPhase("expired");
        void loadNowPrice();
      }
    }, 200);
    return () => clearInterval(t);
  }, [loadNowPrice]);

  // Periodic resync with the server's view of the quote.
  useEffect(() => {
    const t = setInterval(async () => {
      if (phaseRef.current !== "reviewing") return;
      try {
        const res = await fetch(`/api/quotes/${quote.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const q: QuoteView = await res.json();
        offset.current = new Date(q.serverNow).getTime() - Date.now();
        expiresAt.current = new Date(q.expiresAt).getTime();
        setQuote(q);
        if (q.status === "filled" && q.tradeId) router.replace(`/trade/${q.tradeId}`);
      } catch {
        /* keep local countdown */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [quote.id, router]);

  useEffect(() => {
    if (initial.status === "expired") void loadNowPrice();
  }, [initial.status, loadNowPrice]);

  async function confirm() {
    if (phase !== "reviewing") return;
    setPhase("confirming");
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/confirm`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        router.replace(`/trade/${json.trade.id}`);
        return;
      }
      const code = json.error?.code;
      if (code === "QUOTE_EXPIRED") {
        setPhase("expired");
        void loadNowPrice();
        return;
      }
      setMessage(json.error?.message ?? "Could not confirm this quote");
      setPhase("failed");
    } catch {
      setMessage("Could not reach the server. Your quote is unchanged, try again.");
      setPhase("reviewing");
    }
  }

  async function requote() {
    setPhase("requoting");
    setMessage(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side: quote.side, mode: quote.inputMode, amount: String(quote.inputAmount) }),
      });
      const json = await res.json();
      if (res.ok) {
        router.replace(`/quote/${json.id}`);
        return;
      }
      setMessage(json.error?.message ?? "Could not get a new quote");
      setRequoteBlocked(true);
      setPhase("expired");
    } catch {
      setMessage("Could not reach the server. Try again.");
      setPhase("expired");
    }
  }

  const expired = phase === "expired" || phase === "requoting";
  const priceNow = nowPrice && nowPrice.status !== "paused" ? (isBuy ? nowPrice.buy : nowPrice.sell) : null;

  return (
    <main className="flex-1 px-4 pb-6">
      <Header back="/" title={isBuy ? "Review purchase" : "Review sale"} />

      <Card className="rise p-5 text-center">
        <CountdownRing remaining={remaining} total={quote.ttlSeconds} expired={expired} />
        <p className="mt-4 text-[13px] text-fg-2">{isBuy ? "You buy" : "You sell"}</p>
        <p className="display num mt-1 text-[40px] font-semibold">{fmtG(quote.goldG)}</p>
        <p className="num mt-1 text-[15px] text-fg-2">
          {isBuy ? "for " : "and receive "}
          <span className="font-medium text-fg">{fmtPKR(quote.pkr, 2)}</span>
        </p>
      </Card>

      <Card className="mt-3 divide-y divide-hairline">
        <Row
          label="Locked price"
          value={`${fmtPKR(quote.unitPrice, 2)} / g`}
          badge={quote.guardrailApplied ? <span className="mt-1 inline-block rounded-pill bg-green-tint px-2 py-0.5 text-[11px] font-medium text-green-soft">Guardrail applied</span> : null}
        />
        <Row label="Market rate" value={`${fmtPKR(quote.marketPrice, 2)} / g`} sub={quote.sourceLabel} />
        <Row label="Spread" value={isBuy ? `${Math.round((quote.unitPrice / quote.marketPrice - 1) * 100)}% over market` : `${Math.round((1 - quote.unitPrice / quote.marketPrice) * 100)}% under market`} />
        <Row label="Quote" value={shortId(quote.id)} sub={`Locked at ${fmtTime(quote.createdAt)}`} />
      </Card>

      {expired ? (
        <Card className="mt-3 p-5">
          <p className="text-[15px] font-semibold">This quote has expired</p>
          <p className="mt-1 text-[13px] leading-snug text-fg-2">Nothing was traded. A new quote locks the current price for {quote.ttlSeconds} seconds.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-inner bg-card-2 px-3.5 py-3">
              <p className="text-[12px] text-fg-2">Was locked at</p>
              <p className="num mt-0.5 text-[16px] font-semibold text-fg-2 line-through decoration-fg-3">{fmtPKR(quote.unitPrice, 2)}</p>
            </div>
            <div className="rounded-inner bg-card-2 px-3.5 py-3">
              <p className="text-[12px] text-fg-2">Price now</p>
              <p className="num mt-0.5 text-[16px] font-semibold">{priceNow != null ? fmtPKR(priceNow, 2) : nowPrice ? "Paused" : "Checking"}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {message ? (
        <div role="alert" className="mt-3 rounded-inner bg-rose-tint px-4 py-3 text-[13px] leading-snug text-rose">
          {message}
        </div>
      ) : null}

      <div className="mt-4">
        {phase === "failed" || requoteBlocked ? (
          <Button type="button" variant="neutral" onClick={() => router.push("/")}>
            Back to trade
          </Button>
        ) : expired ? (
          <Button type="button" onClick={requote} disabled={phase === "requoting"}>
            {phase === "requoting" ? "Locking price" : "Get a new quote"}
          </Button>
        ) : (
          <Button type="button" onClick={confirm} disabled={phase === "confirming"}>
            {phase === "confirming" ? "Confirming" : isBuy ? "Confirm purchase" : "Confirm sale"}
          </Button>
        )}
      </div>
      {!expired && phase !== "failed" ? <p className="mt-3 text-center text-[12px] text-fg-3">Settles once at the locked price.</p> : null}
    </main>
  );
}
