import { fmtG, fmtPKR } from "@/lib/format";
import { cachedBalances, cachedPrice } from "@/lib/data";

export async function Portfolio() {
  const [price, b] = await Promise.all([cachedPrice(), cachedBalances()]);
  const goldValue = price.sell != null ? b.customerGoldG * price.sell : null;
  const total = goldValue != null ? goldValue + b.pkr : null;
  return (
    <section className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-fg-2">Portfolio value</p>
        <p className="text-[12px] text-fg-3">{price.sell != null ? "at today's sell price" : "pricing paused"}</p>
      </div>
      <p className="display num mt-2 text-[32px] font-semibold">{total != null ? fmtPKR(total, 2) : fmtPKR(b.pkr, 2)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-inner bg-card-2 px-3.5 py-3">
          <p className="text-[12px] text-fg-2">Gold</p>
          <p className="num mt-0.5 text-[16px] font-semibold">{fmtG(b.customerGoldG)}</p>
          <p className="num text-[12px] text-fg-3">{goldValue != null ? fmtPKR(goldValue) : "Value unavailable"}</p>
        </div>
        <div className="rounded-inner bg-card-2 px-3.5 py-3">
          <p className="text-[12px] text-fg-2">Cash</p>
          <p className="num mt-0.5 text-[16px] font-semibold">{fmtPKR(b.pkr)}</p>
          <p className="text-[12px] text-fg-3">PKR wallet</p>
        </div>
      </div>
    </section>
  );
}
