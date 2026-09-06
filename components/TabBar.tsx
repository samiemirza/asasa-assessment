"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ProfileIcon, StatusIcon, TradeIcon } from "./Icons";

const items = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/history", label: "Transactions", Icon: TradeIcon },
  { href: "/status", label: "Pricing status", Icon: StatusIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export function TabBar() {
  const path = usePathname();
  const active = items.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)));
  return (
    <div
      className="pointer-events-none sticky bottom-0 mt-auto px-6 pt-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)" }}
    >
      <nav aria-label="Primary" className="glass-bar pointer-events-auto relative mx-auto grid h-16 max-w-[320px] grid-cols-4 rounded-pill p-1.5">
        <span
          aria-hidden="true"
          className="glass-thumb absolute left-1.5 top-1.5 h-[calc(100%-12px)] w-[calc(25%-6px)] rounded-pill"
          style={{ transform: `translateX(calc(${Math.max(active, 0)} * (100% + 8px)))`, opacity: active < 0 ? 0 : 1 }}
        />
        {items.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={i === active ? "page" : undefined}
            className={`relative z-10 grid place-items-center rounded-pill transition-colors duration-300 ${
              i === active ? "text-green-soft" : "text-fg-2 hover:text-fg"
            }`}
          >
            <Icon size={23} strokeWidth={i === active ? 2 : 1.8} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
