import Link from "next/link";
import { Header } from "@/components/Header";
import { ChevronRight, HistoryIcon } from "@/components/Icons";
import { fmtDateTime, fmtG, fmtPKR } from "@/lib/format";
import { listTrades } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const trades = await listTrades(100);
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="History" subtitle={trades.length ? `${trades.length} ${trades.length === 1 ? "trade" : "trades"}` : "Receipts appear here"} />
      {trades.length === 0 ? (
        <div className="rounded-card bg-card px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-card-2 text-fg-2">
            <HistoryIcon size={22} />
          </span>
          <p className="mt-4 text-[15px] font-medium">No trades yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {trades.map((t) => {
            const isBuy = t.side === "buy";
            return (
              <li key={t.id} className="rise">
                <Link href={`/trade/${t.id}`} className="flex items-center gap-3 rounded-card bg-card px-4 py-3.5 transition-colors hover:bg-card-2">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${isBuy ? "bg-green-tint text-green-soft" : "bg-gold-tint text-gold"}`}>
                    {isBuy ? "B" : "S"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="num block truncate text-[15px] font-medium">
                      {isBuy ? "Bought" : "Sold"} {fmtG(t.goldG)}
                    </span>
                    <span className="block text-[12px] text-fg-3">{fmtDateTime(t.executedAt)}</span>
                  </span>
                  <span className={`num text-[14px] font-medium ${isBuy ? "text-rose" : "text-green-soft"}`}>
                    {isBuy ? "-" : "+"}
                    {fmtPKR(t.pkr, 2)}
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-fg-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
