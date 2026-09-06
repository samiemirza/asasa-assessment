export function Sparkline({ points, className = "" }: { points: number[]; className?: string }) {
  if (points.length < 6) return null;
  const w = 160;
  const h = 36;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  if (hi === lo) return null;
  // Never let a sub-1% wiggle fill the whole height.
  const mid = (hi + lo) / 2;
  const span = Math.max(hi - lo, mid * 0.01);
  const min = mid - span / 2;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - 4 - ((p - min) / span) * (h - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
