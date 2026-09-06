import { notFound, redirect } from "next/navigation";
import { QuoteReview } from "@/components/QuoteReview";
import { getQuote } from "@/lib/quotes/service";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();
  if (quote.status === "filled" && quote.tradeId) redirect(`/trade/${quote.tradeId}`);
  return <QuoteReview key={quote.id} initial={quote} />;
}
