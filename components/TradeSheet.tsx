"use client";
/**
 * The secure transaction surface, opened from the dashboard's Buy and Sell
 * actions. Near full-screen sheet with three steps: amount, review (the 75 s
 * server-locked quote) and confirm (PIN or biometrics), then the receipt.
 * Prices and balances are refetched on open; the quote and confirm calls are
 * the same server endpoints as before, nothing price related comes from here.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Balances } from "@/lib/balances";
import { fmtG, fmtPKR, fmtTime, shortId } from "@/lib/format";
import { computeLeg, floor4, parseAmount, type InputMode, type Side } from "@/lib/money";
import type { PriceView } from "@/lib/pricing/types";
import type { QuoteView } from "@/lib/quotes/service";
import { Button } from "./Button";
import { CountdownRing } from "./CountdownRing";
import { Check, ChevronLeft } from "./Icons";
import { PinPad } from "./PinPad";
import { Row } from "./Row";
import { Segmented } from "./Segmented";

type Step = "amount" | "review" | "verify";

interface ServerError {
  code: string;
  message: string;
  details?: { maxGold?: number; maxPkr?: number };
}

/** Where the sheet lives: the whole viewport on phones, the phone frame on desktop. */
function useFrameRect(open: boolean) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number; radius: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const shell = document.querySelector<HTMLElement>(".shell");
    const measure = () => {
      const framed = window.matchMedia("(min-width: 640px)").matches && shell;
      if (framed) {
        const r = shell.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, radius: 44 });
      } else {
        setRect({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, radius: 0 });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);
  return rect;
}

export function TradeSheet({
  side,
  open,
  onClose,
  initialPrice,
  initialBalances,
}: {
  side: Side;
  open: boolean;
  onClose: () => void;
  initialPrice: PriceView;
  initialBalances: Balances;
}) {
  const router = useRouter();
  const isBuy = side === "buy";
  const rect = useFrameRect(open);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [price, setPrice] = useState(initialPrice);
  const [balances, setBalances] = useState(initialBalances);
  const [step, setStep] = useState<Step>("amount");
  const [mode, setMode] = useState<InputMode>(isBuy ? "pkr" : "gold");
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ServerError | null>(null);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [priceNow, setPriceNow] = useState<number | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const offset = useRef(0);
  const expiresAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open: mount, animate in, refetch, reset the flow. Close: animate out then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep("amount");
      setMode(isBuy ? "pkr" : "gold");
      setAmount("");
      setTouched(false);
      setError(null);
      setQuote(null);
      setExpired(false);
      setFatal(null);
      setPriceNow(null);
      const t = requestAnimationFrame(() => setShown(true));
      void Promise.all([fetch("/api/price", { cache: "no-store" }), fetch("/api/balances", { cache: "no-store" })]).then(async ([p, b]) => {
        if (p.ok) setPrice(await p.json());
        if (b.ok) setBalances(await b.json());
      });
      return () => cancelAnimationFrame(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 280);
    return () => clearTimeout(t);
  }, [open, isBuy]);

  // Lock the page behind the sheet and close on Escape.
  useEffect(() => {
    if (!mounted) return;
    const shell = document.querySelector<HTMLElement>(".shell");
    const prevBody = document.body.style.overflow;
    const prevShell = shell?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (shell) shell.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevBody;
      if (shell) shell.style.overflow = prevShell;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (shown && step === "amount") inputRef.current?.focus();
  }, [shown, step]);

  // Countdown for the locked quote, driven by the server clock.
  useEffect(() => {
    if (!quote) return;
    const t = setInterval(() => {
      const left = (expiresAt.current - (Date.now() + offset.current)) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) setExpired(true);
    }, 200);
    return () => clearInterval(t);
  }, [quote]);

  useEffect(() => {
    if (!expired) return;
    void fetch("/api/price", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: PriceView | null) => setPriceNow(p && p.status !== "paused" ? (isBuy ? p.buy : p.sell) : null));
  }, [expired, isBuy]);

  const paused = price.status === "paused";
  const unit = isBuy ? price.buy : price.sell;
  const parsed = useMemo(() => parseAmount(mode, amount), [mode, amount]);
  const leg = useMemo(() => (parsed.ok && unit ? computeLeg(mode, parsed.value, unit) : null), [parsed, unit, mode]);

  const max = useMemo(() => {
    if (!unit) return null;
    const gold = isBuy ? Math.min(floor4(balances.pkr / unit), balances.inventoryGoldG) : balances.customerGoldG;
    return { gold: floor4(gold), pkr: Math.floor(floor4(gold) * unit * 100) / 100 };
  }, [unit, isBuy, balances]);

  const localError = touched && amount !== "" && !parsed.ok ? parsed.message : null;
  const canReview = !paused && parsed.ok && !!leg && leg.gold >= 0.0001 && !busy;

  const adoptQuote = (q: QuoteView) => {
    offset.current = new Date(q.serverNow).getTime() - Date.now();
    expiresAt.current = new Date(q.expiresAt).getTime();
    setQuote(q);
    setExpired(false);
    setPriceNow(null);
    setRemaining(q.secondsLeft);
  };

  async function requestQuote(inputAmount: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side, mode, amount: inputAmount.replace(/,/g, "") }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? { code: "UNKNOWN", message: "Could not create a quote" });
        setStep("amount");
        return;
      }
      adoptQuote(json);
      setStep("review");
    } catch {
      setError({ code: "NETWORK", message: "Could not reach the server. Check your connection and try again." });
      setStep("amount");
    } finally {
      setBusy(false);
    }
  }

  const confirm = useCallback(async () => {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/confirm`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        router.push(`/trade/${json.trade.id}`);
        onClose();
        return;
      }
      if (json.error?.code === "QUOTE_EXPIRED") {
        setExpired(true);
        setStep("review");
      } else {
        setFatal(json.error?.message ?? "Could not complete this trade");
      }
    } catch {
      setError({ code: "NETWORK", message: "Could not reach the server. Your quote is unchanged, try again." });
    } finally {
      setBusy(false);
    }
  }, [quote, busy, router, onClose]);

  if (!mounted || !rect) return null;

  const title = step === "amount" ? (isBuy ? "Buy gold" : "Sell gold") : step === "review" ? (isBuy ? "Review purchase" : "Review sale") : "Confirm with PIN";
  const inputLabel = isBuy ? (mode === "pkr" ? "You pay" : "You buy") : mode === "gold" ? "You sell" : "You receive";
  const outputLabel = isBuy ? (mode === "pkr" ? "You receive" : "You pay") : mode === "gold" ? "You receive" : "You sell";
  const available = isBuy
    ? mode === "pkr"
      ? `Available: ${fmtPKR(balances.pkr, 2)}`
      : `Available: ${max ? fmtG(max.gold) : ""}`
    : mode === "gold"
      ? `Available: ${fmtG(balances.customerGoldG)}`
      : `Available: ${max ? fmtPKR(max.pkr, 2) : ""}`;
  const outputValue = leg ? (isBuy ? (mode === "pkr" ? fmtG(leg.gold) : fmtPKR(leg.pkr, 2)) : mode === "gold" ? fmtPKR(leg.pkr, 2) : fmtG(leg.gold)) : mode === (isBuy ? "pkr" : "gold") ? (isBuy ? "0.0000 g" : "PKR 0.00") : isBuy ? "PKR 0.00" : "0.0000 g";

  const sheet = (
    <div
      className={`sheet-root ${shown ? "is-open" : ""}`}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: rect.radius }}
    >
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="flex items-center gap-3 px-5 pb-3 pt-2">
          {step !== "amount" && !fatal ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => {
                setStep(step === "verify" ? "review" : "amount");
                setError(null);
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-fg-2 transition-colors hover:text-fg"
            >
              <ChevronLeft size={20} />
            </button>
          ) : null}
          <h2 className="min-w-0 flex-1 truncate text-[22px] font-semibold tracking-[-0.03em]">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-fg-2 transition-colors hover:text-fg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="sheet-body px-4">
          {fatal ? (
            <div className="rounded-card bg-card p-5">
              <p className="text-[15px] font-semibold">This trade did not go through</p>
              <p className="mt-1 text-[13px] leading-snug text-fg-2">{fatal}. Nothing was charged.</p>
            </div>
          ) : step === "amount" ? (
            <>
              <div className="rounded-card bg-card p-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="sheet-amount" className="text-[13px] text-fg-2">
                    {inputLabel}
                  </label>
                  <Segmented
                    label="Unit"
                    size="sm"
                    value={mode}
                    onChange={(v) => {
                      setMode(v);
                      setAmount("");
                      setTouched(false);
                      setError(null);
                    }}
                    options={[
                      { value: "pkr", label: "PKR" },
                      { value: "gold", label: "Grams" },
                    ]}
                  />
                </div>
                <input
                  ref={inputRef}
                  id="sheet-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  disabled={paused}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!localError}
                  aria-describedby="sheet-amount-help"
                  className="num display mt-2 w-full bg-transparent text-[40px] font-semibold text-fg placeholder:text-fg-3 outline-none disabled:text-fg-3"
                />
                <div className="mt-1 flex items-center justify-between">
                  <p id="sheet-amount-help" className={`text-[13px] ${localError ? "text-rose" : "text-fg-2"}`}>
                    {localError ?? (paused ? price.pausedReason : available)}
                  </p>
                  {max && !paused ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAmount(mode === "pkr" ? String(max.pkr) : String(max.gold));
                        setTouched(true);
                        setError(null);
                      }}
                      className="rounded-pill bg-card-2 px-3 py-1.5 text-[12px] font-medium text-fg-2 transition-colors hover:text-fg"
                    >
                      Max
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 rounded-card bg-card p-4">
                <p className="text-[13px] text-fg-2">{outputLabel}</p>
                <p className={`num display mt-2 text-[32px] font-semibold ${leg ? "" : "text-fg-3"}`}>{outputValue}</p>
              </div>

              <div className="mt-3 divide-y divide-hairline rounded-card bg-card">
                <Row label={isBuy ? "Buy rate" : "Sell rate"} value={unit != null ? `${fmtPKR(unit, 2)} / g` : "Paused"} sub={price.guardrailApplied && isBuy ? "Guardrail applied" : undefined} />
                <Row label="Fees" value="PKR 0.00" sub="Spread included in rate" />
                <Row label={isBuy ? "Total to pay" : "Total to receive"} value={leg ? fmtPKR(leg.pkr, 2) : "PKR 0.00"} />
              </div>

              {error ? (
                <div role="alert" className="mt-3 rounded-inner bg-rose-tint px-4 py-3 text-[13px] leading-snug text-rose">
                  {error.message}
                  {error.details?.maxGold != null && error.details.maxGold > 0 ? (
                    <span className="block text-rose/80">
                      You can {side} up to {fmtG(error.details.maxGold)}
                      {error.details.maxPkr != null ? ` (${fmtPKR(error.details.maxPkr, 2)})` : ""}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : quote && step === "verify" && !expired ? (
            <>
              <div className="rounded-card bg-card p-5 text-center">
                <p className="text-[13px] text-fg-2">{isBuy ? "Buying" : "Selling"}</p>
                <p className="display num mt-1 text-[32px] font-semibold">{fmtG(quote.goldG)}</p>
                <p className="num mt-1 text-[14px] text-fg-2">
                  {isBuy ? "for " : "and receiving "}
                  <span className="font-medium text-fg">{fmtPKR(quote.pkr, 2)}</span>
                  {` at ${fmtPKR(quote.unitPrice, 2)} / g`}
                </p>
              </div>
              <PinPad disabled={busy} onVerified={confirm} />
              {error ? (
                <div role="alert" className="mt-3 rounded-inner bg-rose-tint px-4 py-3 text-[13px] leading-snug text-rose">
                  {error.message}
                </div>
              ) : null}
            </>
          ) : quote ? (
            <>
              <div className="rounded-card bg-card p-5 text-center">
                <CountdownRing remaining={remaining} total={quote.ttlSeconds} expired={expired} />
                <p className="mt-3 text-[13px] text-fg-2">{expired ? "Price lock ended" : "Price locked"}</p>
              </div>
              <div className="mt-3 divide-y divide-hairline rounded-card bg-card">
                {isBuy ? (
                  <>
                    <Row label="Amount paid" value={fmtPKR(quote.pkr, 2)} />
                    <Row label="Gold received" value={fmtG(quote.goldG)} />
                    <Row label="Buy rate" value={`${fmtPKR(quote.unitPrice, 2)} / g`} sub={`Market ${fmtPKR(quote.marketPrice, 2)} · ${quote.sourceLabel}${quote.guardrailApplied ? " · guardrail applied" : ""}`} />
                  </>
                ) : (
                  <>
                    <Row label="Gold sold" value={fmtG(quote.goldG)} />
                    <Row label="Amount received" value={fmtPKR(quote.pkr, 2)} />
                    <Row label="Sell rate" value={`${fmtPKR(quote.unitPrice, 2)} / g`} sub={`Market ${fmtPKR(quote.marketPrice, 2)} · ${quote.sourceLabel}`} />
                  </>
                )}
                <Row label="Fees" value="PKR 0.00" />
                <Row label="Final total" value={fmtPKR(quote.pkr, 2)} sub={`Quote ${shortId(quote.id)} · locked at ${fmtTime(quote.createdAt)}`} />
              </div>

              {expired ? (
                <div className="mt-3 rounded-card bg-card p-5">
                  <p className="text-[15px] font-semibold">This quote has expired</p>
                  <p className="mt-1 text-[13px] leading-snug text-fg-2">Nothing was traded. A new quote locks the current price for {quote.ttlSeconds} seconds.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-inner bg-card-2 px-3.5 py-3">
                      <p className="text-[12px] text-fg-2">Was locked at</p>
                      <p className="num mt-0.5 text-[16px] font-semibold text-fg-2 line-through decoration-fg-3">{fmtPKR(quote.unitPrice, 2)}</p>
                    </div>
                    <div className="rounded-inner bg-card-2 px-3.5 py-3">
                      <p className="text-[12px] text-fg-2">Price now</p>
                      <p className="num mt-0.5 text-[16px] font-semibold">{priceNow != null ? fmtPKR(priceNow, 2) : "Checking"}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="mt-3 rounded-inner bg-rose-tint px-4 py-3 text-[13px] leading-snug text-rose">
                  {error.message}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="sheet-footer px-4">
          {fatal ? (
            <Button type="button" variant="neutral" onClick={onClose}>
              Back to dashboard
            </Button>
          ) : step === "amount" ? (
            <Button
              type="button"
              disabled={!canReview}
              onClick={() => {
                setTouched(true);
                if (canReview) void requestQuote(amount);
              }}
            >
              {busy ? "Locking price" : isBuy ? "Review purchase" : "Review sale"}
            </Button>
          ) : expired ? (
            <Button type="button" disabled={busy} onClick={() => quote && void requestQuote(String(quote.inputAmount))}>
              {busy ? "Locking price" : "Get a new quote"}
            </Button>
          ) : step === "review" ? (
            <Button type="button" onClick={() => setStep("verify")}>
              {isBuy ? "Confirm purchase" : "Confirm sale"}
            </Button>
          ) : (
            <p className="num text-center text-[12px] text-fg-3">
              {busy ? "Settling at the locked price" : `${Math.ceil(remaining)} s left on the locked price`}
            </p>
          )}
          {step === "review" && !expired ? (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-fg-3">
              <Check size={14} />
              Settles once at the locked price
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
