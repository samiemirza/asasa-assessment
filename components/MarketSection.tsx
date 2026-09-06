import { fmtPKR, fmtTime } from "@/lib/format";
import type { PriceView, Snapshot } from "@/lib/pricing/types";
import { SOURCE_LABEL } from "@/lib/pricing/types";
import { Card, Row, SectionTitle } from "./Row";

function Chart({ snaps }: { snaps: Snapshot[] }) {
  const pts = snaps.filter((s) => s.ok && s.marketPkrPerG != null).map((s) => ({ v: s.marketPkrPerG as number, t: s.fetchedAt })).reverse();
  if (pts.length < 2) return null;
  const w = 320;
  const h = 72;
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const mid = (hi + lo) / 2;
  const span = Math.max(hi - lo, mid * 0.01);
  const min = mid - span / 2;
  const x = (i: number) => (i / (pts.length - 1)) * w;
  const y = (v: number) => h - 6 - ((v - min) / span) * (h - 12);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <div className="px-5 pb-2 pt-4">
      <div className="flex items-center justify-between text-[12px] text-fg-3">
        <span>{fmtTime(pts[0].t)}</span>
        <span className="num">High {fmtPKR(hi)} · Low {fmtPKR(lo)}</span>
        <span>{fmtTime(pts[pts.length - 1].t)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-[72px] w-full" preserveAspectRatio="none" aria-label="Price over recent checks" role="img">
        <defs>
          <linearGradient id="mk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ccb50" stopOpacity="0.28" />
            <stop offset="1" stopColor="#8ccb50" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mk)" />
        <path d={line} fill="none" stroke="#acdf6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function MarketSection({ price, snapshots }: { price: PriceView; snapshots: Snapshot[] }) {
  return (
    <section aria-label="Market">
      <SectionTitle>Market</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Chart snaps={snapshots} />
        <Row
          label={`${SOURCE_LABEL.pakgold} (primary)`}
          value={price.primaryPkrPerG != null ? `${fmtPKR(price.primaryPkrPerG, 2)} / g` : "No reading"}
          sub={price.primaryError ?? (price.primaryPkrPerG != null ? "Spot XAU/USD x USD/PKR" : undefined)}
        />
        <Row
          label={`${SOURCE_LABEL.goldprice} (fallback)`}
          value={price.fallbackPkrPerG != null ? `${fmtPKR(price.fallbackPkrPerG, 2)} / g` : "No reading"}
          sub={price.fallbackError ?? (price.deviationPct != null ? `${price.deviationPct > 0 ? "+" : ""}${price.deviationPct}% vs primary` : undefined)}
        />
      </Card>
    </section>
  );
}
