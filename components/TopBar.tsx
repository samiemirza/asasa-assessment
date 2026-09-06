"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/history", label: "Transactions" },
  { href: "/wallet", label: "Wallet" },
  { href: "/profile", label: "Profile" },
];

/** Fixed top bar: logo at the left, the section labels centred and level with it. */
export function TopBar() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link href="/" aria-label="Asasa Gold home" className="relative z-10 shrink-0">
        <Image src="/logo.png" alt="" width={34} height={34} priority className="h-[34px] w-[34px]" />
      </Link>
      <nav aria-label="Sections" className="absolute inset-x-0 flex items-center justify-center gap-5">
        {LINKS.map(({ href, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors ${active ? "text-fg" : "text-fg-2 hover:text-fg"}`}
            >
              {label}
              <span className={`absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-4 rounded-pill bg-green transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
