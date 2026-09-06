/**
 * Every tuning knob for the floating glass tab bar in one place: geometry of
 * the expanded/compact states, the scroll thresholds that flip between them,
 * and the springs that carry the bar and the selection pill. Visual tuning
 * happens here, not inside the components. Values are verbatim from the
 * reference implementation.
 */
export const TAB_BAR_MOTION = {
  /* bar geometry */
  expandedHeight: 62,
  compactHeight: 53,
  /** Expanded bar width as a fraction of the window width. */
  expandedWidthRatio: 0.93,
  /** Compact bar width as a fraction of the *expanded* width. */
  compactWidthRatio: 0.9,
  /** Row padding between the bar edge and the first/last tab slot. */
  expandedPadding: 8,
  compactPadding: 6,
  iconSize: 24,
  /** Icons shrink only a touch, the layout does the compressing. */
  compactIconScale: 0.9,

  /* selection pill */
  pillHeightExpanded: 46,
  pillHeightCompact: 40,
  /** Horizontal gap between the pill and its tab slot's edges. */
  pillInset: 4,

  /* scroll behaviour */
  /** At or above this offset the bar is always expanded. */
  topZone: 4,
  /** Momentum ending inside this zone relaxes the bar back open. */
  restExpandZone: 48,
  /** Per-frame movement below this is sensor noise; ignored entirely. */
  scrollDeadzone: 0.5,
  /** Accumulated downward travel before the bar contracts. */
  downwardThreshold: 14,
  /** Accumulated upward travel before the bar relaxes open. */
  upwardThreshold: 10,

  /* motion */
  barSpring: { stiffness: 260, damping: 24, mass: 0.8 },
  indicatorSpring: { stiffness: 300, damping: 22, mass: 0.75 },
  /** Cap on the pill's horizontal stretch while travelling (scaleX - 1). */
  maxIndicatorStretch: 0.16,
  /** Stretch for a one-tab hop; each extra tab of travel adds `stretchPerTab`. */
  stretchBase: 0.07,
  stretchPerTab: 0.03,
  /** Vertical squash as a fraction of the horizontal stretch. */
  verticalSquash: 0.2,
} as const;

/** Translucent gray that reads as a darker patch of the glass, per scheme. */
export const PILL_FILL = {
  light: "rgba(110, 105, 120, 0.18)",
  dark: "rgba(235, 235, 245, 0.14)",
} as const;

export const interpolate = (p: number, from: number, to: number) => from + (to - from) * p;

/** Bar and pill geometry at a given compact progress, shared by bar and indicator. */
export function geometry(p: number, expandedWidth: number, count: number) {
  const M = TAB_BAR_MOTION;
  const barWidth = interpolate(p, expandedWidth, expandedWidth * M.compactWidthRatio);
  const barHeight = interpolate(p, M.expandedHeight, M.compactHeight);
  const pad = interpolate(p, M.expandedPadding, M.compactPadding);
  const slot = (barWidth - pad * 2) / count;
  const pillH = interpolate(p, M.pillHeightExpanded, M.pillHeightCompact);
  const pillW = Math.max(slot - M.pillInset * 2, pillH);
  const iconScale = interpolate(p, 1, M.compactIconScale);
  return { barWidth, barHeight, pad, slot, pillH, pillW, iconScale };
}
