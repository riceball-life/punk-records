/**
 * Pure math for the day-scroll's render window.
 *
 * The day list is a fixed, sorted array of day keys. We only ever keep a small
 * contiguous slice `[start, end)` of it in the DOM. This module computes that
 * slice as four *single-direction* operations, so the component can pair each
 * one with exactly one scroll-position compensation:
 *
 *   - grow/trim at the TOP change content above the viewport   → compensate.
 *   - grow/trim at the BOTTOM change content below the viewport → no compensation.
 *
 * Mixing both edges in one commit would make the scrollHeight delta ambiguous
 * (top growth minus bottom trim), which is exactly what causes the visible
 * jump we're avoiding. Hence the deliberate separation.
 */

export interface Window {
  /** Inclusive start index into the day-key array. */
  start: number;
  /** Exclusive end index. */
  end: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** A window of up to `max` rows centered on `center`, clamped to `[0, len)`. */
export function initialWindow(
  len: number,
  center: number,
  buffer: number,
  max: number,
): Window {
  if (len <= 0) return { start: 0, end: 0 };
  const c = clamp(center, 0, len - 1);
  const start = Math.max(0, c - buffer);
  const end = Math.min(len, c + buffer + 1);
  if (end - start > max) return { start, end: start + max };
  return { start, end };
}

/** Prepend up to `batch` rows (top edge moves up). Content added above. */
export function growUp(win: Window, batch: number): Window {
  return { start: Math.max(0, win.start - batch), end: win.end };
}

/** Append up to `batch` rows (bottom edge moves down). Content added below. */
export function growDown(win: Window, len: number, batch: number): Window {
  return { start: win.start, end: Math.min(len, win.end + batch) };
}

/** Drop rows from the top if the window exceeds `max`. Content removed above. */
export function trimTop(win: Window, max: number): Window {
  if (win.end - win.start <= max) return win;
  return { start: win.end - max, end: win.end };
}

/** Drop rows from the bottom if the window exceeds `max`. Content removed below. */
export function trimBottom(win: Window, max: number): Window {
  if (win.end - win.start <= max) return win;
  return { start: win.start, end: win.start + max };
}
