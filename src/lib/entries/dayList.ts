import type { DayKey } from '../db/types';
import { compareDayKeys } from '../date/dateUtils';

/**
 * The ordered set of rows the day-scroll renders: every day that has an entry,
 * plus today (always present so you can journal today, even when it's empty).
 * Empty days never appear — which is why this is a set of keys, not a range.
 */
export function buildDayList(entryKeys: DayKey[], today: DayKey): DayKey[] {
  const set = new Set(entryKeys);
  set.add(today);
  return [...set].sort(compareDayKeys);
}
