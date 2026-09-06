"use client";
/**
 * The floating liquid-glass tab bar: a capsule of glass hovering above the
 * bottom edge, one translucent pill travelling behind the icons to mark the
 * active tab. Icon-only by design; each tab still carries its name as the
 * accessible label, and targets stay at least 44px even when compact.
 *
 * Three independent systems, kept apart:
 * - GlassSurface: the blur ground;
 * - useTabBarScroll: the shared compactProgress that contracts the bar
 *   while the reader scrolls down;
 * - TabBarIndicator: the spring-driven selection pill.
 * All numbers live in lib/tabbar/motion-constants.
 *
 * Compact never scales the bar as a bitmap: width, height, row padding and
 * pill geometry each interpolate on compactProgress so the layout compresses
 * around its vertical centre (the positioner keeps expanded height).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { geometry, TAB_BAR_MOTION as M } from "@/lib/tabbar/motion-constants";
import { frameBatch, MotionValue } from "@/lib/tabbar/motion-value";
import { useTabBarScroll } from "@/lib/tabbar/use-tab-bar-scroll";
import { GlassSurface } from "./GlassSurface";
import { HomeFilled, HomeIcon, ProfileFilled, ProfileIcon, TradeIcon, WalletFilled, WalletIcon } from "./Icons";
import { TabBarIndicator } from "./TabBarIndicator";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, Filled: HomeFilled },
  { href: "/history", label: "Transactions", Icon: TradeIcon, Filled: TradeIcon },
  { href: "/wallet", label: "Wallet", Icon: WalletIcon, Filled: WalletFilled },
  { href: "/profile", label: "Profile", Icon: ProfileIcon, Filled: ProfileFilled },
];

/** Guarded selection haptic; a no-op where the browser has none. */
function selectFeedback() {
  try {
    navigator.vibrate?.(6);
  } catch {
    /* ignore */
  }
}

export function TabBar() {
  const path = usePathname();
  const routeIndex = Math.max(
    TABS.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href))),
    0,
  );
  // The pill leaves on the tap itself; the route catches up a beat later.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const activeIndex = pendingIndex ?? routeIndex;
  const count = TABS.length;
  useEffect(() => {
    setPendingIndex(null);
  }, [path]);
  useEffect(() => {
    if (pendingIndex === null) return;
    const t = setTimeout(() => setPendingIndex(null), 2000);
    return () => clearTimeout(t);
  }, [pendingIndex]);

  const compactProgress = useRef(new MotionValue(0)).current;
  const { expand } = useTabBarScroll(compactProgress);

  const positioner = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const icons = useRef<(HTMLSpanElement | null)[]>([]);
  const [expandedWidth, setExpandedWidth] = useState(400);

  // Landing on a tab relaxes the bar open: the new screen is not scrolling yet.
  useEffect(() => {
    expand();
  }, [path, expand]);

  // The bar takes 93% of the frame; it floats the same distance from the
  // bottom as from the sides (lifted further only by a safe-area inset).
  useLayoutEffect(() => {
    const node = positioner.current;
    if (!node) return;
    const measure = () => {
      const w = Math.round(node.clientWidth * M.expandedWidthRatio);
      setExpandedWidth(w);
      node.style.setProperty("--bar-side", `${Math.round((node.clientWidth - w) / 2)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const apply = frameBatch(() => {
      const g = geometry(compactProgress.value, expandedWidth, count);
      if (bar.current) {
        bar.current.style.width = `${g.barWidth}px`;
        bar.current.style.height = `${g.barHeight}px`;
      }
      if (row.current) row.current.style.padding = `0 ${g.pad}px`;
      for (const icon of icons.current) if (icon) icon.style.transform = `scale(${g.iconScale})`;
    });
    apply();
    return compactProgress.subscribe(apply);
  }, [compactProgress, expandedWidth, count]);

  return (
    <div ref={positioner} className="tabbar-positioner" style={{ height: M.expandedHeight }}>
      <div ref={bar} className="glass-bar" style={{ width: expandedWidth, height: M.expandedHeight }}>
        <GlassSurface />
        <TabBarIndicator index={activeIndex} count={count} compactProgress={compactProgress} expandedWidth={expandedWidth} />
        <div ref={row} role="tablist" aria-label="Primary" className="relative flex h-full" style={{ padding: `0 ${M.expandedPadding}px` }}>
          {TABS.map(({ href, label, Icon, Filled }, i) => {
            const focused = i === activeIndex;
            const Glyph = focused ? Filled : Icon;
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={focused}
                aria-label={label}
                title={label}
                onClick={() => {
                  if (focused) return;
                  selectFeedback();
                  setPendingIndex(i);
                }}
                className={`flex flex-1 items-center justify-center transition-colors duration-200 ${focused ? "text-fg" : "text-fg-2 hover:text-fg"}`}
              >
                <span
                  ref={(n) => {
                    icons.current[i] = n;
                  }}
                  className="grid place-items-center"
                >
                  <Glyph size={M.iconSize} strokeWidth={focused ? 2.2 : 1.8} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
