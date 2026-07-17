import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';
import { todayKey, toDayKey, addDays, daysBetween } from '../date/dateUtils';

/**
 * A hub "daily reminder" — a recurring daily habit. It has no stored `done`
 * flag: whether it's done *today* is derived from `lastDoneDate`, so it
 * automatically resets to not-done at the start of each new day (no nightly
 * job needed). A red "miss streak" counter shows how many consecutive days it
 * has gone undone.
 *
 * Its own collection, independent of the To-do section (these do not archive).
 */
export interface Reminder extends CollectionRecord {
  id: string;
  text: string;
  /** ISO timestamp of creation — also the ordering key and miss-streak baseline. */
  createdAt: string;
  /** Local day it was last completed, or null if never. Drives "done today". */
  lastDoneDate: DayKey | null;
  /** The `lastDoneDate` before the most recent completion — lets an accidental
   *  same-day un-check restore the prior streak instead of nuking it. */
  prevDoneDate: DayKey | null;
  updatedAt: string;
}

/** Build a fresh reminder. `updatedAt` is re-stamped by the collection on write. */
export function newReminder(text: string): Reminder {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text, createdAt: now, lastDoneDate: null, prevDoneDate: null, updatedAt: now };
}

/** Whether the reminder counts as done for the given local day. */
export function isDoneOn(r: Reminder, today: DayKey = todayKey()): boolean {
  return r.lastDoneDate === today;
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
