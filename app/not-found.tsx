import { LinkButton } from "@/components/Button";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header back="/" title="Not found" subtitle="This quote or receipt does not exist" />
      <div className="mt-4">
        <LinkButton href="/">Back to trade</LinkButton>
      </div>
    </main>
  );
}
