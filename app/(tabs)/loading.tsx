import { Header } from "@/components/Header";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Asasa Gold" />
      <DashboardSkeleton />
    </main>
  );
}
