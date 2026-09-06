import { Header } from "@/components/Header";
import { QuoteSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header back="/" title="Review" />
      <QuoteSkeleton />
    </main>
  );
}
