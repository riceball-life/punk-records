import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';
import { todayKey, toDayKey, addDays, daysBetween, dayIndex } from '../date/dateUtils';

/**
 * How often a reminder resets. The hub lists one checklist per cadence:
 * "Daily Goals" (daily), "Weekly Reminders", "Monthly Reminders".
 */
export type Cadence = 'daily' | 'weekly' | 'monthly';

/**
 * A hub recurring item — a habit/goal at a given {@link Cadence}. It has no
 * stored `done` flag: whether it's done *this period* is derived from
 * `lastDoneDate`, so it automatically resets at the start of each new period
 * (no nightly job needed). The daily list ("Daily Goals") also shows a red
 * "miss streak" counter and folds a `✓ …` line into the day's journal when
 * checked; weekly/monthly are plain checklists.
 *
 * Its own collection, discriminated by `cadence` (absent on older records →
 * daily, so no migration is needed).
 */
export interface Reminder extends CollectionRecord {
  id: string;
  text: string;
  /** Reset cadence; absent on records created before cadences existed (→ daily). */
  cadence?: Cadence;
  /** ISO timestamp of creation — also the ordering key and miss-streak baseline. */
  createdAt: string;
  /** Local day it was last completed, or null if never. Drives "done this period". */
  lastDoneDate: DayKey | null;
  /** The `lastDoneDate` before the most recent completion — lets an accidental
   *  same-period un-check restore the prior streak instead of nuking it. */
  prevDoneDate: DayKey | null;
  updatedAt: string;
}

/** Build a fresh reminder. `updatedAt` is re-stamped by the collection on write. */
export function newReminder(text: string, cadence: Cadence = 'daily'): Reminder {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text, cadence, createdAt: now, lastDoneDate: null, prevDoneDate: null, updatedAt: now };
}

/** A reminder's cadence, tolerant of records saved before cadences existed. */
export function reminderCadence(r: Reminder): Cadence {
  return r.cadence ?? 'daily';
}

/**
 * The index of the period a day falls in, for the reminder's cadence — equal
 * indices mean "same period". Weeks start Monday (epoch day 0 is a Thursday, so
 * +3 shifts Monday to a multiple of 7); months are calendar months.
 */
export function periodIndex(key: DayKey, cadence: Cadence): number {
  if (cadence === 'monthly') {
    const [y, m] = key.split('-').map(Number) as [number, number, number];
    return y * 12 + (m - 1);
  }
  const idx = dayIndex(key);
  return cadence === 'weekly' ? Math.floor((idx + 3) / 7) : idx;
}

/** Whether the reminder counts as done for the period containing `today`. */
export function isDoneOn(r: Reminder, today: DayKey = todayKey()): boolean {
  if (r.lastDoneDate == null) return false;
  const cadence = reminderCadence(r);
  return periodIndex(r.lastDoneDate, cadence) === periodIndex(today, cadence);
}

/**
 * Consecutive fully-elapsed days the reminder went undone, as of `today`.
 * 0 when done today or done yesterday (nothing missed yet); +1 for each full
 * day that ended un-done since it was last done (or since creation if never).
 */
export function missCount(r: Reminder, today: DayKey = todayKey()): number {
  const created = toDayKey(new Date(r.createdAt));
  // Anchor = last "active" day. Never-done anchors to the day before creation,
  // so the creation day itself can count as a miss once it has elapsed.
  const anchor = r.lastDoneDate ?? addDays(created, -1);
  return Math.max(0, daysBetween(today, anchor) - 1);
}

/** Mark done for `today`, remembering the previous done-date for a clean undo. */
export function markDone(r: Reminder, today: DayKey = todayKey()): Reminder {
  return { ...r, prevDoneDate: r.lastDoneDate, lastDoneDate: today };
}

/** Undo today's completion, restoring the prior done-date. */
export function markUndone(r: Reminder): Reminder {
  return { ...r, lastDoneDate: r.prevDoneDate, prevDoneDate: null };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return a day's journal `text` with the `✓ <goalText>` line toggled: stripped
 * when `done` is false (or always, to avoid duplicates), then re-appended at the
 * end when `done` is true. Same `✓ …` convention and strip-then-append shape as
 * folded completed to-dos / `foldProteinLine`. Pure, so it's unit-testable
 * without the repo/entry-store singletons. A blank `goalText` is a no-op.
 */
export function foldGoalLine(text: string, goalText: string, done: boolean): string {
  const label = goalText.trim();
  if (!label) return text;
  const line = `✓ ${label}`;
  const stripped = text
    .replace(new RegExp(`^${escapeRegExp(line)}$\\n?`, 'm'), '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '');
  if (!done) return stripped;
  return stripped ? `${stripped}\n${line}` : line;
}
