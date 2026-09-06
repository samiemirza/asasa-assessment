export function CountdownRing({ remaining, total, expired }: { remaining: number; total: number; expired: boolean }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const frac = expired ? 0 : Math.max(0, Math.min(1, remaining / total));
  const secs = expired ? 0 : Math.ceil(remaining);
  const tone = expired ? "text-rose" : remaining <= 10 ? "text-gold" : "text-green";
  return (
    <div className="relative mx-auto h-[132px] w-[132px]" role="timer" aria-live="polite" aria-label={expired ? "Quote expired" : `${secs} seconds left`}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-card-3" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={`${tone} transition-[stroke-dashoffset] duration-200 ease-linear`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={`display num text-[36px] font-semibold ${expired ? "text-rose" : ""}`}>{secs}</div>
          <div className="text-[11px] text-fg-2">{expired ? "expired" : "seconds"}</div>
        </div>
      </div>
    </div>
  );
}
