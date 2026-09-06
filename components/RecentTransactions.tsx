import Link from "next/link";
import type { TradeView } from "@/lib/quotes/service";
import { fmtG, fmtPKR, fmtTime } from "@/lib/format";
import { ChevronRight } from "./Icons";

export function RecentTransactions({ trades }: { trades: TradeView[] }) {
  if (trades.length === 0) return null;
  return (
    <section className="mt-5" aria-label="Recent transactions">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Recent</h2>
        <Link href="/history" className="text-[13px] text-fg-2 transition-colors hover:text-fg">
          See all
        </Link>
      </div>
      <ul className="divide-y divide-hairline rounded-card bg-card">
        {trades.map((t) => {
          const isBuy = t.side === "buy";
          return (
            <li key={t.id}>
              <Link href={`/trade/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${isBuy ? "bg-green-tint text-green-soft" : "bg-gold-tint text-gold"}`}>
                  {isBuy ? "B" : "S"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="num block truncate text-[14px] font-medium">
                    {isBuy ? "Bought" : "Sold"} {fmtG(t.goldG)}
                  </span>
                  <span className="block text-[12px] text-fg-3">{fmtTime(t.executedAt)}</span>
                </span>
                <span className={`num text-[13px] font-medium ${isBuy ? "text-rose" : "text-green-soft"}`}>
                  {isBuy ? "-" : "+"}
                  {fmtPKR(t.pkr)}
                </span>
                <ChevronRight size={16} className="shrink-0 text-fg-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
