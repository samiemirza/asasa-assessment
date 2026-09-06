import { Accounts } from "@/components/Accounts";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/Row";
import { PortfolioSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Wallet" />
      <PortfolioSkeleton />
      <SectionTitle>Withdraw</SectionTitle>
      <Accounts />
    </main>
  );
}
