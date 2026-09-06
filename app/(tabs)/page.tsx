import { BalanceCards } from "@/components/BalanceCards";
import { Header } from "@/components/Header";
import { PriceHero } from "@/components/PriceHero";
import { TradeForm } from "@/components/TradeForm";
import { getBalances } from "@/lib/balances";
import { getPriceView, listSnapshots } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export default async function TradePage() {
  const [price, balances, snapshots] = await Promise.all([getPriceView(), getBalances(), listSnapshots(24)]);
  const history = snapshots
    .filter((s) => s.ok && s.marketPkrPerG != null)
    .map((s) => s.marketPkrPerG as number)
    .reverse();

  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Asasa Gold" subtitle="Buy and sell 24K gold in PKR" />
      <PriceHero initial={price} history={history} />
      <BalanceCards balances={balances} />
      <TradeForm price={price} balances={balances} />
    </main>
  );
}
