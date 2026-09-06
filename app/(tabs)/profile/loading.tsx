import { Header } from "@/components/Header";
import { ProfileCard } from "@/components/ProfileCard";
import { PortfolioSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Profile" subtitle="Your account and preferences" />
      <ProfileCard />
      <div className="mt-3">
        <PortfolioSkeleton />
      </div>
    </main>
  );
}
