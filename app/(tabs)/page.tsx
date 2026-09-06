import { Suspense } from "react";
import { BalanceCards } from "@/components/BalanceCards";
import { DashboardActions } from "@/components/DashboardActions";
import { Header } from "@/components/Header";
import { MarketCard } from "@/components/MarketCard";
import { RecentTransactions } from "@/components/RecentTransactions";
import { DashboardSkeleton } from "@/components/Skeleton";
import { cachedBalances, cachedDayOpen, cachedPrice, cachedTrades } from "@/lib/data";

export const dynamic = "force-dynamic";

async function Dashboard() {
  const [price, balances, dayOpen, trades] = await Promise.all([cachedPrice(), cachedBalances(), cachedDayOpen(), cachedTrades(3)]);
  return (
    <>
      <MarketCard initial={price} dayOpen={dayOpen} />
      <BalanceCards balances={balances} sellPrice={price.sell} />
      <DashboardActions price={price} balances={balances} />
      <RecentTransactions trades={trades} />
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Asasa Gold" />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
