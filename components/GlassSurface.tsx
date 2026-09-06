/**
 * The glass ground under the floating tab bar. The web has no native Liquid
 * Glass, so this is the reference's fallback recipe: backdrop blur under a
 * translucent fill with a faint bright rim, shaped as a capsule so the
 * compact/expanded animation never touches the glass itself. Opacity is
 * never animated here; the parent animates dimensions. Reduce Transparency
 * swaps it for a solid raised surface (see .glass-surface in globals.css).
 */
export function GlassSurface() {
  return <div aria-hidden="true" className="glass-surface" />;
}
