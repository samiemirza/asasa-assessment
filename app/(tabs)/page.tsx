import { Suspense } from "react";
import { BalanceCards } from "@/components/BalanceCards";
import { Header } from "@/components/Header";
import { PriceHero } from "@/components/PriceHero";
import { TradeSkeleton } from "@/components/Skeleton";
import { TradeForm } from "@/components/TradeForm";
import { cachedBalances, cachedPrice, cachedSnapshots } from "@/lib/data";

export const dynamic = "force-dynamic";

async function TradeContent() {
  const [price, balances, snapshots] = await Promise.all([cachedPrice(), cachedBalances(), cachedSnapshots(24)]);
  const history = snapshots
    .filter((s) => s.ok && s.marketPkrPerG != null)
    .map((s) => s.marketPkrPerG as number)
    .reverse();
  return (
    <>
      <PriceHero initial={price} history={history} />
      <BalanceCards balances={balances} />
      <TradeForm price={price} balances={balances} />
    </>
  );
}

export default function TradePage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Asasa Gold" subtitle="Buy and sell 24K gold in PKR" />
      <Suspense fallback={<TradeSkeleton />}>
        <TradeContent />
      </Suspense>
    </main>
  );
}
