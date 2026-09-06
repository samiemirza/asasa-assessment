import { Suspense } from "react";
import { Accounts } from "@/components/Accounts";
import { Header } from "@/components/Header";
import { Portfolio } from "@/components/Portfolio";
import { SectionTitle } from "@/components/Row";
import { PortfolioSkeleton } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Wallet" subtitle="Balances and payout accounts" />
      <Suspense fallback={<PortfolioSkeleton />}>
        <Portfolio />
      </Suspense>
      <SectionTitle>Withdraw</SectionTitle>
      <Accounts />
    </main>
  );
}
