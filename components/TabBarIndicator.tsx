"use client";
/**
 * The one selection pill that physically travels between tab slots, behind
 * the icons. Position rides a spring on the *tab index*; while moving it
 * stretches horizontally and squashes vertically a touch, more for a longer
 * hop, then springs back to a resting capsule. Geometry is computed per
 * frame from the same numbers the bar animates with, so pill and bar can
 * never be a frame apart.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { geometry, PILL_FILL, TAB_BAR_MOTION as M } from "@/lib/tabbar/motion-constants";
import { easeOutQuad, frameBatch, MotionValue, prefersReducedMotion } from "@/lib/tabbar/motion-value";

export function TabBarIndicator({
  index,
  count,
  compactProgress,
  expandedWidth,
}: {
  index: number;
  count: number;
  compactProgress: MotionValue;
  expandedWidth: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const position = useRef(new MotionValue(index));
  const scaleX = useRef(new MotionValue(1));
  const scaleY = useRef(new MotionValue(1));
  const prevIndex = useRef(index);
  const widthRef = useRef(expandedWidth);
  widthRef.current = expandedWidth;

  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const apply = frameBatch(() => {
      const g = geometry(compactProgress.value, widthRef.current, count);
      node.style.width = `${g.pillW}px`;
      node.style.height = `${g.pillH}px`;
      node.style.transform =
        `translate(${g.pad + position.current.value * g.slot + (g.slot - g.pillW) / 2}px, ${(g.barHeight - g.pillH) / 2}px)` +
        ` scale(${scaleX.current.value}, ${scaleY.current.value})`;
    });
    apply();
    const subs = [compactProgress, position.current, scaleX.current, scaleY.current].map((v) => v.subscribe(apply));
    return () => subs.forEach((off) => off());
  }, [compactProgress, count, expandedWidth]);

  useEffect(() => {
    const distance = Math.abs(index - prevIndex.current);
    prevIndex.current = index;
    if (distance === 0) return;

    if (prefersReducedMotion()) {
      position.current.timing(index, 120);
      return;
    }
    position.current.spring(index, M.indicatorSpring);
    const stretch = Math.min(M.stretchBase + M.stretchPerTab * (distance - 1), M.maxIndicatorStretch);
    scaleX.current.timing(1 + stretch, 80, easeOutQuad, () => scaleX.current.spring(1, M.indicatorSpring));
    scaleY.current.timing(1 - stretch * M.verticalSquash, 80, easeOutQuad, () => scaleY.current.spring(1, M.indicatorSpring));
  }, [index]);

  return <div ref={el} aria-hidden="true" className="glass-pill" style={{ backgroundColor: PILL_FILL.dark }} />;
}
