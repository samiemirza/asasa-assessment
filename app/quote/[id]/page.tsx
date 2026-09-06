import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { QuoteReview } from "@/components/QuoteReview";
import { QuoteSkeleton } from "@/components/Skeleton";
import { getQuote } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

async function QuoteContent({ id }: { id: string }) {
  const quote = await getQuote(id);
  if (!quote) notFound();
  if (quote.status === "filled" && quote.tradeId) redirect(`/trade/${quote.tradeId}`);
  return <QuoteReview key={quote.id} initial={quote} />;
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <main className="flex-1 px-4 pb-6">
          <Header back="/" title="Review" />
          <QuoteSkeleton />
        </main>
      }
    >
      <QuoteContent id={id} />
    </Suspense>
  );
}
