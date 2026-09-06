"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoIcon, HistoryIcon, StatusIcon, TradeIcon } from "./Icons";

const items = [
  { href: "/", label: "Trade", Icon: TradeIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/status", label: "Status", Icon: StatusIcon },
  { href: "/demo", label: "Demo", Icon: DemoIcon },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 mt-auto border-t border-hairline bg-shell/92 px-3 pt-2 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-inner py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-green" : "text-fg-3 hover:text-fg-2"
                }`}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
