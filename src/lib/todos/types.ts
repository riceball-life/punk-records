import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';
import { toDayKey } from '../date/dateUtils';

/**
 * A To-do task. Every task is a checkbox (no plain-text tasks). Tasks are unified
 * with the journal's per-day checklists:
 *  - `date` is the day a task is "filed under" (its journal-checklist home), or
 *    null when it lives only in the To-do inbox.
 *  - `doneAt` records completion; for an inbox task with no `date`, its Archives
 *    day derives from `doneAt` (preserving the original auto-archive behavior).
 *  - `order` positions it within its day for drag-reorder.
 *
 * `date`/`order` are absent on records created before this feature; the read
 * helpers below tolerate that, so no data migration is needed.
 */
export interface Task extends CollectionRecord {
  id: string;
  text: string;
  done: boolean;
  /** ISO instant of completion, or null while open. */
  doneAt: string | null;
  /** Journal-checklist home day, or null = inbox-only (unscheduled). */
  date: DayKey | null;
  /** Sort position within its day. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function newTask(text: string, date: DayKey | null = null, order = 0): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    text,
    done: false,
    doneAt: null,
    date,
    order,
    createdAt: now,
    updatedAt: now,
  };
}

/** Complete the task now (stamps the completion instant). */
export function markTaskDone(task: Task): Task {
  return { ...task, done: true, doneAt: new Date().toISOString() };
}

/** Reopen the task. */
export function markTaskOpen(task: Task): Task {
  return { ...task, done: false, doneAt: null };
}

/**
 * The day a task belongs to in Archives: its explicit `date` if set; otherwise,
 * for a completed task, the day it was completed (so inbox completions still show
 * under today, as before); otherwise null (unscheduled — inbox only).
 */
export function taskDate(task: Task): DayKey | null {
  if (task.date != null) return task.date;
  if (task.done && task.doneAt) return toDayKey(new Date(task.doneAt));
  return null;
}

/** Sort position within a day (tolerant of records saved before ordering). */
export function taskOrder(task: Task): number {
  return task.order ?? 0;
}

/** Group tasks by their Archives day, each day sorted by order then creation. */
export function tasksByDay(tasks: Task[]): Map<DayKey, Task[]> {
  const map = new Map<DayKey, Task[]>();
  for (const t of tasks) {
    const day = taskDate(t);
    if (!day) continue;
    const bucket = map.get(day);
    if (bucket) bucket.push(t);
    else map.set(day, [t]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => taskOrder(a) - taskOrder(b) || a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}
