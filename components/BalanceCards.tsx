import type { Balances } from "@/lib/balances";
import { fmtG, fmtPKR } from "@/lib/format";

export function BalanceCards({ balances, sellPrice }: { balances: Balances; sellPrice: number | null }) {
  const goldValue = sellPrice != null ? balances.customerGoldG * sellPrice : null;
  return (
    <section className="mt-3 grid grid-cols-2 gap-3" aria-label="Balances">
      <div className="rounded-card bg-card p-4">
        <p className="text-[13px] text-fg-2">Cash balance</p>
        <p className="num mt-2 text-[22px] font-semibold">{fmtPKR(balances.pkr)}</p>
      </div>
      <div className="rounded-card bg-card p-4">
        <p className="text-[13px] text-fg-2">Gold balance</p>
        <p className="num mt-2 text-[22px] font-semibold">{fmtG(balances.customerGoldG)}</p>
        <p className="num mt-0.5 text-[12px] text-fg-3">{goldValue != null ? `≈ ${fmtPKR(goldValue)}` : "Value unavailable"}</p>
      </div>
    </section>
  );
}
