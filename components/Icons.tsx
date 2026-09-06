type P = { size?: number; className?: string; strokeWidth?: number };
const base = (p: P) => ({
  width: p.size ?? 22,
  height: p.size ?? 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  "aria-hidden": true,
});

export const HomeIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 11.5 12 4.5l8 7" /><path d="M6.5 10v9.5h11V10" /><path d="M10 19.5v-5h4v5" /></svg>
);
export const HomeFilled = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M12 3.6 3.2 11.3a1 1 0 0 0 .66 1.75H5.5V19a1.5 1.5 0 0 0 1.5 1.5h3v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h3a1.5 1.5 0 0 0 1.5-1.5v-5.95h1.64a1 1 0 0 0 .66-1.75z" /></svg>
);
export const ProfileFilled = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><circle cx="12" cy="8.5" r="4.2" /><path d="M4.2 19.6c1.3-3.6 4.2-5.6 7.8-5.6s6.5 2 7.8 5.6c.2.5-.2 1-.7 1H4.9c-.5 0-.9-.5-.7-1z" /></svg>
);
export const WalletFilled = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M6 4.5h11.5A3 3 0 0 1 20.5 7.5v1.75H15a3.25 3.25 0 0 0 0 6.5h5.5v1.75a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3zm9 6.25h5.5v3H15a1.5 1.5 0 0 1 0-3z" /></svg>
);
export const PlusIcon = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const TradeIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 8h13M13 4l4 4-4 4" /><path d="M20 16H7M11 12l-4 4 4 4" /></svg>
);
export const HistoryIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const StatusIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 12h4l2.5-6 4 12 2.5-6h5" /></svg>
);
export const ProfileIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="9" r="3.5" /><path d="M5 19.5c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8" /></svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z" /><path d="m9.5 12 1.8 1.8L15 10.3" /></svg>
);
export const BankIcon = (p: P) => (
  <svg {...base(p)}><path d="M3.5 9.5 12 5l8.5 4.5" /><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 19.5h17" /></svg>
);
export const BellIcon = (p: P) => (
  <svg {...base(p)}><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const ChevronLeft = (p: P) => <svg {...base(p)}><path d="M14.5 6 8.5 12l6 6" /></svg>;
export const ChevronRight = (p: P) => <svg {...base(p)}><path d="m9.5 6 6 6-6 6" /></svg>;
export const Check = (p: P) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const WalletIcon = (p: P) => (
  <svg {...base(p)}><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5z" /><path d="M15 12h5.5v4H15a2 2 0 0 1 0-4z" /></svg>
);
export const GoldIcon = (p: P) => (
  <svg {...base(p)}><path d="M7.5 9h9l2.5 6h-14z" /><path d="M9.5 9 11 5h2l1.5 4" /></svg>
);
export const VaultIcon = (p: P) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5V10M12 14v1.5M8.5 12H10M14 12h1.5" /></svg>
);
export const AlertIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17.2v.1" /></svg>
);
export const LockIcon = (p: P) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
