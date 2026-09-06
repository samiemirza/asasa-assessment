/**
 * A tiny stand-in for Reanimated shared values on the web: a number that can
 * spring or time toward a target on requestAnimationFrame, retargetable
 * mid-flight while keeping its velocity, and observed by subscribers that
 * write styles straight to the DOM. No React state is touched per frame.
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export type Easing = (t: number) => number;
export const easeOutQuad: Easing = (t) => 1 - (1 - t) * (1 - t);
export const linear: Easing = (t) => t;

type Step = (now: number) => boolean; // returns true when finished

export class MotionValue {
  value: number;
  velocity = 0;
  private step: Step | null = null;
  private raf = 0;
  private listeners = new Set<(v: number) => void>();
  private onDone: (() => void) | null = null;

  constructor(initial: number) {
    this.value = initial;
  }

  subscribe(fn: (v: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.value);
  }

  set(v: number) {
    this.stop();
    this.value = v;
    this.velocity = 0;
    this.emit();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.step = null;
    this.onDone = null;
  }

  private run(step: Step, onDone?: () => void) {
    this.stop();
    this.step = step;
    this.onDone = onDone ?? null;
    const tick = (now: number) => {
      if (this.step !== step) return;
      const finished = step(now);
      this.emit();
      if (finished) {
        this.step = null;
        this.raf = 0;
        const done = this.onDone;
        this.onDone = null;
        done?.();
      } else {
        this.raf = requestAnimationFrame(tick);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Closed-form damped spring from the current value and velocity. */
  spring(to: number, cfg: SpringConfig, onDone?: () => void) {
    const x0 = this.value - to;
    const v0 = this.velocity;
    if (Math.abs(x0) < 1e-4 && Math.abs(v0) < 1e-3) {
      this.value = to;
      this.velocity = 0;
      this.emit();
      onDone?.();
      return;
    }
    const w0 = Math.sqrt(cfg.stiffness / cfg.mass);
    const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
    let t0 = -1;
    this.run((now) => {
      if (t0 < 0) t0 = now;
      const t = (now - t0) / 1000;
      let x: number;
      let v: number;
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        const A = x0;
        const B = (v0 + zeta * w0 * x0) / wd;
        const e = Math.exp(-zeta * w0 * t);
        const c = Math.cos(wd * t);
        const s = Math.sin(wd * t);
        x = e * (A * c + B * s);
        v = e * ((-zeta * w0 * A + wd * B) * c + (-zeta * w0 * B - wd * A) * s);
      } else {
        const A = x0;
        const B = v0 + w0 * x0;
        const e = Math.exp(-w0 * t);
        x = e * (A + B * t);
        v = e * (B - w0 * (A + B * t));
      }
      this.value = to + x;
      this.velocity = v;
      // Rest thresholds scaled for values in the 0..4 range (progress, tab index, scale).
      if (Math.abs(x) < 0.001 && Math.abs(v) < 0.01) {
        this.value = to;
        this.velocity = 0;
        return true;
      }
      return false;
    }, onDone);
  }

  /** Duration-based move; velocity is tracked so a following spring inherits it. */
  timing(to: number, durationMs: number, easing: Easing = linear, onDone?: () => void) {
    const from = this.value;
    let t0 = -1;
    let lastValue = from;
    let lastTime = 0;
    this.run((now) => {
      if (t0 < 0) {
        t0 = now;
        lastTime = now;
      }
      const t = Math.min(1, (now - t0) / durationMs);
      this.value = from + (to - from) * easing(t);
      const dt = (now - lastTime) / 1000;
      if (dt > 0) this.velocity = (this.value - lastValue) / dt;
      lastValue = this.value;
      lastTime = now;
      if (t >= 1) {
        this.value = to;
        return true;
      }
      return false;
    }, onDone);
  }
}

/** Batches several MotionValue changes in one frame into a single DOM write. */
export function frameBatch(apply: () => void): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
