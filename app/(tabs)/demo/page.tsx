import { DemoControls } from "@/components/DemoControls";
import { Header } from "@/components/Header";
import { getDemoSettings, getPriceView } from "@/lib/pricing/engine";
import { round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const [settings, price] = await Promise.all([getDemoSettings(), getPriceView()]);
  const marketBuy = price.market != null ? round2(price.market * price.markup) : null;
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Demo controls" subtitle="Reviewer tools, changes apply to the live deployment" />
      <DemoControls initial={settings} marketBuy={marketBuy} />
    </main>
  );
}
