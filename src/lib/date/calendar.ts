import type { DayKey } from '../db/types';

/**
 * Pure helpers for building month grids in the calendar view.
 *
 * Months are identified by an integer index `year * 12 + month0` (month0 is
 * 0-based) so they're trivial to range over and compare. All date math goes
 * through UTC so it's DST-independent — these produce calendar keys, not
 * instants.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export interface MonthParts {
  year: number;
  /** 0-based month (0 = January). */
  month0: number;
}

/** Month index for a `(year, month0)` pair. */
export function monthIndex(year: number, month0: number): number {
  return year * 12 + month0;
}

/** Inverse of {@link monthIndex}. */
export function monthParts(index: number): MonthParts {
  return { year: Math.floor(index / 12), month0: ((index % 12) + 12) % 12 };
}

/** Month index containing a given day key. */
export function monthIndexOfKey(key: DayKey): number {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return monthIndex(y, m - 1);
}

/** Number of days in a month. */
export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Weekday of the 1st of the month, 0 = Sunday … 6 = Saturday. */
export function firstWeekday(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0, 1)).getUTCDay();
}

/** Day key for a specific day of a month. */
export function dayKeyOf(year: number, month0: number, day: number): DayKey {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

/**
 * The cells of a month grid, laid out for a 7-column Sunday-first grid:
 * `firstWeekday` leading `null`s (blanks) followed by each day's key.
 */
export function monthGridCells(year: number, month0: number): (DayKey | null)[] {
  const lead = firstWeekday(year, month0);
  const days = daysInMonth(year, month0);
  const cells: (DayKey | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(dayKeyOf(year, month0, d));
  return cells;
}

/** Localized month + year label, e.g. "July 2026". */
export function monthLabel(year: number, month0: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month0, 1),
  );
}

/** Inclusive integer range `[from, to]`. */
export function monthRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}
