"use client";
import { useState } from "react";
import type { Balances } from "@/lib/balances";
import type { Side } from "@/lib/money";
import type { PriceView } from "@/lib/pricing/types";
import { Button } from "./Button";
import { TradeSheet } from "./TradeSheet";

export function DashboardActions({ price, balances }: { price: PriceView; balances: Balances }) {
  const [side, setSide] = useState<Side>("buy");
  const [open, setOpen] = useState(false);
  const paused = price.status === "paused";
  const launch = (s: Side) => {
    setSide(s);
    setOpen(true);
  };
  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button type="button" onClick={() => launch("buy")} disabled={paused}>
          Buy gold
        </Button>
        <Button type="button" variant="neutral" onClick={() => launch("sell")} disabled={paused}>
          Sell gold
        </Button>
      </div>
      <TradeSheet side={side} open={open} onClose={() => setOpen(false)} initialPrice={price} initialBalances={balances} />
    </>
  );
}
