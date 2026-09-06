import { Header } from "@/components/Header";
import { TradeSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Asasa Gold" subtitle="Buy and sell 24K gold in PKR" />
      <TradeSkeleton />
    </main>
  );
}
