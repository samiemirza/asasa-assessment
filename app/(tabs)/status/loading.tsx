import { Header } from "@/components/Header";
import { PillSk, StatusSkeleton } from "@/components/Skeleton";

const MINS = Math.round(Number(process.env.PRICE_REFRESH_SECONDS ?? 300) / 60);

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Pricing status" subtitle={`Checked at most once every ${MINS} minutes`} right={<PillSk />} />
      <StatusSkeleton />
    </main>
  );
}
