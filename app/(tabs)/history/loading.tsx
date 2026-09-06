import { HistorySkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6 pt-3">
      <HistorySkeleton />
    </main>
  );
}
