import type { DayKey } from '../db/types';
import { daysBetween, todayKey } from './dateUtils';

export interface DayHeader {
  /** Primary label: "Today" / "Yesterday" / "Tomorrow", else the weekday name. */
  label: string;
  /** Weekday name regardless of relative label, e.g. "Wednesday". */
  weekday: string;
  /** Formatted date, e.g. "July 15" (year shown only when not the current year). */
  dateStr: string;
  /** Signed day distance from today (0 = today). */
  diff: number;
  isToday: boolean;
}

function localDate(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d); // local midnight
}

/** Build the Reminders-style header for a day, relative to `today`. */
export function formatHeader(key: DayKey, today: DayKey = todayKey()): DayHeader {
  const diff = daysBetween(key, today);
  const date = localDate(key);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);

  let label = weekday;
  if (diff === 0) label = 'Today';
  else if (diff === -1) label = 'Yesterday';
  else if (diff === 1) label = 'Tomorrow';

  const currentYear = Number(today.slice(0, 4));
  const dateStr = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() === currentYear ? {} : { year: 'numeric' }),
  }).format(date);

  return { label, weekday, dateStr, diff, isToday: diff === 0 };
}
