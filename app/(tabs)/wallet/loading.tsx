import { Accounts } from "@/components/Accounts";
import { SectionTitle } from "@/components/Row";
import { PortfolioSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6 pt-3">
      <PortfolioSkeleton />
      <SectionTitle>Withdraw</SectionTitle>
      <Accounts />
    </main>
  );
}
