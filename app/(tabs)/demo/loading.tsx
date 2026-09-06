import { Header } from "@/components/Header";
import { DemoSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Demo controls" subtitle="Reviewer tools, changes apply to the live deployment" />
      <DemoSkeleton />
    </main>
  );
}
