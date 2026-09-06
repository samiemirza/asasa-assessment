/**
 * Scroll-responsive tab bar state. One `compactProgress` value (0 = expanded,
 * 1 = compact) driven by scroll *direction*, not position: per-event deltas
 * accumulate into downward/upward travel with a small deadzone, and only
 * crossing a threshold flips the target, so scroll noise never toggles the
 * bar and a spring only starts on an actual state change.
 *
 * On the web every tab shares one scroll container (the window on phones,
 * the phone-frame shell on desktop), so the reporter attaches here instead
 * of in each screen. A pause longer than `sessionGapMs` counts as a new drag
 * (resets the accumulators, like onBeginDrag); `scrollend` or the same pause
 * counts as momentum ending.
 */
import { useCallback, useEffect, useRef } from "react";
import { TAB_BAR_MOTION as M } from "./motion-constants";
import { linear, prefersReducedMotion, type MotionValue } from "./motion-value";

const SESSION_GAP_MS = 160;

export function useTabBarScroll(compactProgress: MotionValue) {
  const target = useRef(0);
  const prevY = useRef(0);
  const accumDown = useRef(0);
  const accumUp = useRef(0);
  const lastTs = useRef(0);

  const drive = useCallback(
    (to: 0 | 1) => {
      target.current = to;
      if (prefersReducedMotion()) compactProgress.timing(to, 150, linear);
      else compactProgress.spring(to, M.barSpring);
    },
    [compactProgress],
  );

  const expand = useCallback(() => {
    accumDown.current = 0;
    accumUp.current = 0;
    if (target.current === 0 && compactProgress.value === 0) return;
    drive(0);
  }, [compactProgress, drive]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".shell");
    const readY = (t: EventTarget | null) => (t === shell && shell ? shell.scrollTop : window.scrollY);
    let idle: ReturnType<typeof setTimeout> | null = null;

    const onMomentumEnd = (y: number) => {
      if (y <= M.restExpandZone && target.current !== 0) drive(0);
    };

    const onScroll = (e: Event) => {
      const y = readY(e.target === document ? window : e.target);
      const now = performance.now();
      if (now - lastTs.current > SESSION_GAP_MS) {
        prevY.current = y;
        accumDown.current = 0;
        accumUp.current = 0;
      }
      lastTs.current = now;
      const dy = y - prevY.current;
      prevY.current = y;

      if (idle) clearTimeout(idle);
      idle = setTimeout(() => onMomentumEnd(y), SESSION_GAP_MS);

      if (y <= M.topZone) {
        accumDown.current = 0;
        accumUp.current = 0;
        if (target.current !== 0) drive(0);
        return;
      }
      if (dy > M.scrollDeadzone) {
        accumUp.current = 0;
        accumDown.current += dy;
        if (accumDown.current >= M.downwardThreshold && target.current !== 1) drive(1);
      } else if (dy < -M.scrollDeadzone) {
        accumDown.current = 0;
        accumUp.current += -dy;
        if (accumUp.current >= M.upwardThreshold && target.current !== 0) drive(0);
      }
    };
    const onScrollEnd = (e: Event) => onMomentumEnd(readY(e.target === document ? window : e.target));

    const targets: (Window | HTMLElement)[] = [window];
    if (shell) targets.push(shell);
    for (const t of targets) {
      t.addEventListener("scroll", onScroll, { passive: true });
      t.addEventListener("scrollend", onScrollEnd, { passive: true });
    }
    return () => {
      if (idle) clearTimeout(idle);
      for (const t of targets) {
        t.removeEventListener("scroll", onScroll);
        t.removeEventListener("scrollend", onScrollEnd);
      }
    };
  }, [drive]);

  return { expand };
}
