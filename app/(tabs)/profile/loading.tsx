import { Header } from "@/components/Header";
import { ProfileCard } from "@/components/ProfileCard";

export default function Loading() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Profile" subtitle="Your account and preferences" />
      <ProfileCard />
    </main>
  );
}
