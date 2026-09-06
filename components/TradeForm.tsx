"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Balances } from "@/lib/balances";
import { fmtG, fmtPKR } from "@/lib/format";
import { computeLeg, floor4, parseAmount, type InputMode, type Side } from "@/lib/money";
import type { PriceView } from "@/lib/pricing/types";
import { Button } from "./Button";
import { Segmented } from "./Segmented";

interface ServerError {
  code: string;
  message: string;
  details?: { maxGold?: number; maxPkr?: number };
}

export function TradeForm({ price, balances }: { price: PriceView; balances: Balances }) {
  const router = useRouter();
  const [side, setSide] = useState<Side>("buy");
  const [mode, setMode] = useState<InputMode>("pkr");
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const paused = price.status === "paused";
  const unit = side === "buy" ? price.buy : price.sell;

  const parsed = useMemo(() => parseAmount(mode, amount), [mode, amount]);
  const leg = useMemo(() => (parsed.ok && unit ? computeLeg(mode, parsed.value, unit) : null), [parsed, unit, mode]);

  const max = useMemo(() => {
    if (!unit) return null;
    const gold = side === "buy" ? Math.min(floor4(balances.pkr / unit), balances.inventoryGoldG) : balances.customerGoldG;
    return { gold: floor4(gold), pkr: Math.floor(floor4(gold) * unit * 100) / 100 };
  }, [unit, side, balances]);

  const localError = touched && amount !== "" && !parsed.ok ? parsed.message : null;
  const canSubmit = !paused && parsed.ok && !!leg && leg.gold >= 0.0001 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    setServerError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side, mode, amount: amount.replace(/,/g, "") }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? { code: "UNKNOWN", message: "Could not create a quote" });
        setBusy(false);
        return;
      }
      router.push(`/quote/${json.id}`);
    } catch {
      setServerError({ code: "NETWORK", message: "Could not reach the server. Check your connection and try again." });
      setBusy(false);
    }
  }

  function fillMax() {
    if (!max) return;
    setAmount(mode === "pkr" ? String(max.pkr) : String(max.gold));
    setTouched(true);
    setServerError(null);
  }

  const helper = (() => {
    if (paused) return "Quotes resume as soon as a source can be trusted";
    if (!leg) return max ? `Up to ${mode === "pkr" ? fmtPKR(max.pkr, 2) : fmtG(max.gold)}` : "";
    return mode === "pkr"
      ? `${fmtG(leg.gold)} at ${fmtPKR(unit!, 2)} per gram`
      : `${fmtPKR(leg.pkr, 2)} at ${fmtPKR(unit!, 2)} per gram`;
  })();

  return (
    <form onSubmit={submit} className="mt-3 rounded-card bg-card p-4" noValidate>
      <Segmented
        label="Side"
        value={side}
        onChange={(v) => {
          setSide(v);
          setServerError(null);
        }}
        options={[
          { value: "buy", label: "Buy gold" },
          { value: "sell", label: "Sell gold" },
        ]}
      />

      <div className="mt-4 rounded-inner bg-card-2 px-4 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="amount" className="text-[12px] text-fg-2">
            Amount in {mode === "pkr" ? "PKR" : "grams"}
          </label>
          <Segmented
            label="Unit"
            size="sm"
            value={mode}
            onChange={(v) => {
              setMode(v);
              setAmount("");
              setTouched(false);
              setServerError(null);
            }}
            options={[
              { value: "pkr", label: "PKR" },
              { value: "gold", label: "Grams" },
            ]}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            disabled={paused}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setServerError(null);
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={!!localError}
            aria-describedby="amount-help"
            className="num display min-w-0 flex-1 bg-transparent text-[36px] font-semibold text-fg placeholder:text-fg-3 outline-none disabled:text-fg-3"
          />
          {max && !paused ? (
            <button type="button" onClick={fillMax} className="rounded-pill bg-card-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 transition-colors hover:text-fg">
              Max
            </button>
          ) : null}
        </div>
        <p id="amount-help" className={`mt-1 min-h-[18px] text-[13px] ${localError ? "text-rose" : "text-fg-2"}`}>
          {localError ?? helper}
        </p>
      </div>

      {serverError ? (
        <div role="alert" className="mt-3 rounded-inner bg-rose-tint px-4 py-3 text-[13px] leading-snug text-rose">
          {serverError.message}
          {serverError.details?.maxGold != null && serverError.details.maxGold > 0 ? (
            <span className="block text-rose/80">
              You can {side} up to {fmtG(serverError.details.maxGold)}
              {serverError.details.maxPkr != null ? ` (${fmtPKR(serverError.details.maxPkr, 2)})` : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Locking price" : `Get ${price.quoteTtlSeconds} second quote`}
        </Button>
      </div>
    </form>
  );
}
