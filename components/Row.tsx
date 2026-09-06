export function Row({ label, value, sub, badge }: { label: string; value: React.ReactNode; sub?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <span className="shrink-0 whitespace-nowrap pt-0.5 text-[13px] text-fg-2">{label}</span>
      <span className="min-w-0 text-right">
        <span className="num block text-[15px] font-medium">{value}</span>
        {sub ? <span className="block text-[12px] text-fg-3">{sub}</span> : null}
        {badge}
      </span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-card bg-card ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{children}</h2>
      {right}
    </div>
  );
}
