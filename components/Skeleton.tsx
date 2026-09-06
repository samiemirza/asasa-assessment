/** Placeholder blocks for content that is still being fetched. Static chrome never uses these. */
export function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-inner bg-card-2 ${className}`} />;
}

function CardSk({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div aria-hidden="true" className={`rounded-card bg-card ${className}`}>
      {children}
    </div>
  );
}

function RowsSk({ rows }: { rows: number }) {
  return (
    <CardSk className="divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <Sk className="h-3.5 w-24" />
          <Sk className="h-3.5 w-32" />
        </div>
      ))}
    </CardSk>
  );
}

export function PillSk() {
  return <Sk className="h-7 w-16 rounded-pill" />;
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <CardSk className="hero-paused rise p-5">
        <div className="flex items-center justify-between">
          <Sk className="h-3.5 w-28 bg-ink/10" />
          <Sk className="h-6 w-24 rounded-pill bg-ink/10" />
        </div>
        <Sk className="mt-4 h-11 w-56 bg-ink/10" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Sk className="h-[66px] bg-ink/10" />
          <Sk className="h-[66px] bg-ink/10" />
        </div>
        <Sk className="mt-4 h-3 w-44 bg-ink/10" />
      </CardSk>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CardSk className="p-4">
          <Sk className="h-3.5 w-24" />
          <Sk className="mt-3 h-6 w-28" />
        </CardSk>
        <CardSk className="p-4">
          <Sk className="h-3.5 w-24" />
          <Sk className="mt-3 h-6 w-24" />
          <Sk className="mt-2 h-3 w-20" />
        </CardSk>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Sk className="h-14 rounded-pill bg-card" />
        <Sk className="h-14 rounded-pill bg-card" />
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <ul role="status" aria-label="Loading" className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-card bg-card px-4 py-3.5">
          <Sk className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Sk className="h-3.5 w-32" />
            <Sk className="mt-2 h-3 w-40" />
          </div>
          <Sk className="h-3.5 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function StatusSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <CardSk className="p-5">
        <Sk className="h-3.5 w-28" />
        <Sk className="mt-3 h-9 w-44" />
        <Sk className="mt-3 h-3.5 w-52" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Sk className="h-[66px]" />
          <Sk className="h-[66px]" />
        </div>
      </CardSk>
      <Sk className="mb-2 mt-5 h-5 w-24 bg-card" />
      <RowsSk rows={2} />
      <Sk className="mb-2 mt-5 h-5 w-28 bg-card" />
      <RowsSk rows={4} />
      <Sk className="mb-2 mt-5 h-5 w-32 bg-card" />
      <RowsSk rows={5} />
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <CardSk className="p-5" >
      <div className="flex items-center justify-between">
        <Sk className="h-3.5 w-28" />
        <Sk className="h-3.5 w-20" />
      </div>
      <Sk className="mt-3 h-9 w-52" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Sk className="h-[66px]" />
        <Sk className="h-[66px]" />
      </div>
    </CardSk>
  );
}

export function ReceiptSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <CardSk className="p-6 text-center">
        <Sk className="mx-auto h-14 w-14 rounded-full" />
        <Sk className="mx-auto mt-4 h-3.5 w-16" />
        <Sk className="mx-auto mt-3 h-10 w-40" />
        <Sk className="mx-auto mt-3 h-3.5 w-36" />
        <Sk className="mx-auto mt-3 h-3 w-32" />
      </CardSk>
      <div className="mt-3">
        <RowsSk rows={3} />
      </div>
      <Sk className="mb-2 mt-5 h-5 w-28 bg-card" />
      <RowsSk rows={3} />
      <Sk className="mt-5 h-14 rounded-pill bg-card" />
    </div>
  );
}
