import { Header } from "@/components/Header";
import { HistorySkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Transactions" />
      <HistorySkeleton />
    </main>
  );
}
