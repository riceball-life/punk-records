import type { DayKey } from '../db/types';

/**
 * Day math for the journal.
 *
 * Design note: day *ordering / arithmetic* is done via an integer "day index"
 * computed from `Date.UTC`, which sidesteps daylight-saving-time entirely (a
 * calendar day is always exactly one index apart, even across a 23- or 25-hour
 * local day). Conversions to/from "today" read *local* calendar components, so
 * the notion of which day it is follows the device's local timezone — which is
 * what we want for a personal journal.
 */

const MS_PER_DAY = 86_400_000;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** True if `key` is a syntactically valid, real calendar day in `YYYY-MM-DD` form. */
export function isValidDayKey(key: string): key is DayKey {
  if (!DAY_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Reject impossible dates like 2026-02-30 by round-tripping through UTC.
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function assertValid(key: string): asserts key is DayKey {
  if (!isValidDayKey(key)) {
    throw new RangeError(`Invalid day key: ${JSON.stringify(key)}`);
  }
}

/** The `YYYY-MM-DD` key for a `Date`, using its *local* calendar components. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Today's key in the device's local timezone. Pass `now` in tests for determinism. */
export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

/**
 * Integer number of days from the Unix epoch for a day key — the canonical
 * value used for ordering and offset math. DST-safe (computed in UTC).
 */
export function dayIndex(key: DayKey): number {
  assertValid(key);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Inverse of {@link dayIndex}: the day key for an integer day index. */
export function dayKeyFromIndex(index: number): DayKey {
  const dt = new Date(index * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** The key `n` days after `key` (negative `n` goes into the past). */
export function addDays(key: DayKey, n: number): DayKey {
  return dayKeyFromIndex(dayIndex(key) + n);
}

/** Whole-day difference `a - b` (positive when `a` is later than `b`). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return dayIndex(a) - dayIndex(b);
}

/** Comparator for sorting keys ascending (chronological). */
export function compareDayKeys(a: DayKey, b: DayKey): number {
  // Lexical comparison is valid for zero-padded `YYYY-MM-DD`, but go through
  // the index so invalid keys are rejected rather than silently mis-sorted.
  return dayIndex(a) - dayIndex(b);
}
