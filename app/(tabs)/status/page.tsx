import { Suspense } from "react";
import { Header } from "@/components/Header";
import { RelTime } from "@/components/RelTime";
import { Card, Row, SectionTitle } from "@/components/Row";
import { PillSk, StatusSkeleton } from "@/components/Skeleton";
import { StatusPill } from "@/components/StatusPill";
import { fmtPKR, fmtTime, inTime } from "@/lib/format";
import { cachedPrice, cachedSnapshots } from "@/lib/data";
import { SOURCE_LABEL } from "@/lib/pricing/types";

export const dynamic = "force-dynamic";

async function HeaderPill() {
  const p = await cachedPrice();
  return <StatusPill status={p.status} />;
}

async function StatusContent() {
  const [p, snaps] = await Promise.all([cachedPrice(), cachedSnapshots(10)]);
  const cap = Math.round(p.staleCapSeconds / 60);

  return (
    <>
      <Card className="rise p-5">
        <p className="text-[13px] text-fg-2">Market reference</p>
        <p className="display num mt-1 text-[36px] font-semibold">{p.market != null ? fmtPKR(p.market) : "Paused"}</p>
        <p className="mt-1 text-[13px] text-fg-2">
          {p.market != null ? (
            <>
              per gram, 24K, from {p.sourceLabel}
              {p.fallbackUsed ? " (fallback)" : ""}
            </>
          ) : (
            p.pausedReason
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-inner bg-card-2 px-3.5 py-3">
            <p className="text-[12px] text-fg-2">Refreshed</p>
            <p className="mt-0.5 text-[15px] font-medium">
              <RelTime iso={p.fetchedAt} serverNow={p.serverNow} />
            </p>
          </div>
          <div className="rounded-inner bg-card-2 px-3.5 py-3">
            <p className="text-[12px] text-fg-2">Next check</p>
            <p className="mt-0.5 text-[15px] font-medium">{p.nextRefreshInSeconds != null ? `in ${inTime(p.nextRefreshInSeconds)}` : "on next request"}</p>
          </div>
        </div>
        {p.status === "last_good" && p.ageSeconds != null ? (
          <p className="mt-3 text-[13px] leading-snug text-gold">
            The last check failed. This price is {Math.round(p.ageSeconds / 60)} min old and stays tradable for up to {cap} min.
          </p>
        ) : null}
        {p.deviationWarning ? (
          <p className="mt-3 text-[13px] leading-snug text-gold">Sources disagree by {Math.abs(p.deviationPct!)}%. The primary source is used.</p>
        ) : null}
      </Card>

      <SectionTitle>Sources</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Row
          label={`${SOURCE_LABEL.pakgold} (primary)`}
          value={p.primaryPkrPerG != null ? `${fmtPKR(p.primaryPkrPerG, 2)} / g` : "No reading"}
          sub={p.primaryError ?? (p.primaryPkrPerG != null ? "Spot XAU/USD x USD/PKR" : undefined)}
        />
        <Row
          label={`${SOURCE_LABEL.goldprice} (fallback)`}
          value={p.fallbackPkrPerG != null ? `${fmtPKR(p.fallbackPkrPerG, 2)} / g` : "No reading"}
          sub={p.fallbackError ?? (p.deviationPct != null ? `${p.deviationPct > 0 ? "+" : ""}${p.deviationPct}% vs primary` : undefined)}
        />
      </Card>

      <SectionTitle>Pricing rule</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Row label="You buy at" value={p.buy != null ? `${fmtPKR(p.buy, 2)} / g` : "Paused"} sub={p.guardrailApplied ? "Guardrail floor applied" : `Market x ${p.markup.toFixed(2)}`} />
        <Row label="You sell at" value={p.sell != null ? `${fmtPKR(p.sell, 2)} / g` : "Paused"} sub={`Market x ${p.markdown.toFixed(2)}`} />
        <Row label="Guardrail floor" value={`${fmtPKR(p.guardrail, 2)} / g`} sub="Minimum buy price" />
        <Row label="Quote lock" value={`${p.quoteTtlSeconds} seconds`} sub="Owned by the server" />
      </Card>

      <SectionTitle>Recent checks</SectionTitle>
      <Card className="divide-y divide-hairline">
        {snaps.length === 0 ? <p className="px-5 py-4 text-[13px] text-fg-2">No checks yet</p> : null}
        {snaps.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-green" : "bg-red"}`} />
              <span className="num text-[14px]">{fmtTime(s.fetchedAt)}</span>
            </span>
            <span className="text-right">
              <span className="num block text-[14px] font-medium">{s.ok && s.marketPkrPerG != null ? fmtPKR(s.marketPkrPerG, 2) : "Failed"}</span>
              <span className="block text-[12px] text-fg-3">
                {s.ok ? `${SOURCE_LABEL[s.source!]}${s.fallbackUsed ? " (fallback)" : ""}` : "No source answered"}
              </span>
            </span>
          </div>
        ))}
      </Card>
    </>
  );
}

const MINS = Math.round(Number(process.env.PRICE_REFRESH_SECONDS ?? 300) / 60);

export default function StatusPage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header
        title="Pricing status"
        subtitle={`Checked at most once every ${MINS} minutes`}
        right={
          <Suspense fallback={<PillSk />}>
            <HeaderPill />
          </Suspense>
        }
      />
      <Suspense fallback={<StatusSkeleton />}>
        <StatusContent />
      </Suspense>
    </main>
  );
}
