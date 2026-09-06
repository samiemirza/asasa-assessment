import { Suspense } from "react";
import { DemoControls } from "@/components/DemoControls";
import { Header } from "@/components/Header";
import { DemoSkeleton } from "@/components/Skeleton";
import { cachedPrice, cachedSettings } from "@/lib/data";
import { round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

async function DemoContent() {
  const [settings, price] = await Promise.all([cachedSettings(), cachedPrice()]);
  const marketBuy = price.market != null ? round2(price.market * price.markup) : null;
  return <DemoControls initial={settings} marketBuy={marketBuy} />;
}

export default function DemoPage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Demo controls" subtitle="Reviewer tools, changes apply to the live deployment" />
      <Suspense fallback={<DemoSkeleton />}>
        <DemoContent />
      </Suspense>
    </main>
  );
}
