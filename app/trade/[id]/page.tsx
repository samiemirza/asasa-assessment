import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LinkButton } from "@/components/Button";
import { Header } from "@/components/Header";
import { Check } from "@/components/Icons";
import { Card, Row, SectionTitle } from "@/components/Row";
import { ReceiptSkeleton } from "@/components/Skeleton";
import { fmtDateTime, fmtG, fmtPKR, shortId } from "@/lib/format";
import { getTrade } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

function Delta({ label, before, after, fmt }: { label: string; before: number; after: number; fmt: (n: number) => string }) {
  const up = after > before;
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-[13px] text-fg-2">{label}</span>
      <span className="text-right">
        <span className="num block text-[15px] font-medium">{fmt(after)}</span>
        <span className={`num block text-[12px] ${up ? "text-green-soft" : "text-rose"}`}>
          {up ? "+" : "-"}
          {fmt(Math.abs(after - before))}
        </span>
      </span>
    </div>
  );
}

async function ReceiptContent({ id }: { id: string }) {
  const t = await getTrade(id);
  if (!t) notFound();
  const isBuy = t.side === "buy";
  const pkr = (n: number) => fmtPKR(n, 2);
  const g = (n: number) => fmtG(n);

  return (
    <>
      <Card className="rise p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green text-ink">
          <Check size={28} strokeWidth={2.2} />
        </span>
        <p className="mt-4 text-[13px] text-fg-2">{isBuy ? "Bought" : "Sold"}</p>
        <p className="display num mt-1 text-[40px] font-semibold">{fmtG(t.goldG)}</p>
        <p className="num mt-1 text-[15px] text-fg-2">
          {isBuy ? "for " : "and received "}
          <span className="font-medium text-fg">{fmtPKR(t.pkr, 2)}</span>
        </p>
        <p className="mt-3 text-[12px] text-fg-3">{fmtDateTime(t.executedAt)}</p>
      </Card>

      <Card className="mt-3 divide-y divide-hairline">
        <Row label="Price" value={`${fmtPKR(t.unitPrice, 2)} / g`} />
        <Row label="Market rate" value={`${fmtPKR(t.marketPrice, 2)} / g`} sub={t.sourceLabel} />
        <Row label="Receipt" value={shortId(t.id)} sub={`Quote ${shortId(t.quoteId)}`} />
      </Card>

      <SectionTitle>Balances after</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Delta label="Wallet" before={t.before.pkr} after={t.after.pkr} fmt={pkr} />
        <Delta label="Your gold" before={t.before.customerGoldG} after={t.after.customerGoldG} fmt={g} />
        <Delta label="Inventory" before={t.before.inventoryGoldG} after={t.after.inventoryGoldG} fmt={g} />
      </Card>

      <div className="mt-5">
        <LinkButton href="/">Trade again</LinkButton>
      </div>
    </>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="flex-1 px-4 pb-6">
      <Header back="/" title="Receipt" />
      <Suspense fallback={<ReceiptSkeleton />}>
        <ReceiptContent id={id} />
      </Suspense>
    </main>
  );
}
