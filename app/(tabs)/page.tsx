import { Suspense } from "react";
import { BalanceCards } from "@/components/BalanceCards";
import { DashboardActions } from "@/components/DashboardActions";
import { Header } from "@/components/Header";
import { MarketCard } from "@/components/MarketCard";
import { MarketSection } from "@/components/MarketSection";
import { DashboardSkeleton } from "@/components/Skeleton";
import { cachedBalances, cachedDayOpen, cachedPrice, cachedSnapshots } from "@/lib/data";

export const dynamic = "force-dynamic";

async function Dashboard() {
  const [price, balances, dayOpen, snapshots] = await Promise.all([cachedPrice(), cachedBalances(), cachedDayOpen(), cachedSnapshots(24)]);
  return (
    <>
      <MarketCard initial={price} dayOpen={dayOpen} />
      <BalanceCards balances={balances} sellPrice={price.sell} />
      <DashboardActions price={price} balances={balances} />
      <MarketSection price={price} snapshots={snapshots} />
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Asasa Gold" />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
