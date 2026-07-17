import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';
import { toDayKey } from '../date/dateUtils';

/**
 * A To-do task. Every task is a checkbox (no plain-text tasks). The single
 * source of truth for the auto-archive link: `doneAt` records *when* it was
 * completed, and Archives derives its "what I did on day X" log from that —
 * nothing is copied into the journal text. Unchecking clears `doneAt`, so it
 * leaves that day's log; re-checking files it under the new completion day.
 */
export interface Task extends CollectionRecord {
  id: string;
  text: string;
  done: boolean;
  /** ISO timestamp of completion, or null while open. Drives the Archives projection. */
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function newTask(text: string): Task {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text, done: false, doneAt: null, createdAt: now, updatedAt: now };
}

/** Complete the task now (stamps the completion instant). */
export function markTaskDone(task: Task): Task {
  return { ...task, done: true, doneAt: new Date().toISOString() };
}

/** Reopen the task (removes it from its Archives day). */
export function markTaskOpen(task: Task): Task {
  return { ...task, done: false, doneAt: null };
}

/** The local calendar day a task was completed, or null if open. */
export function completedDayKey(task: Task): DayKey | null {
  if (!task.done || !task.doneAt) return null;
  return toDayKey(new Date(task.doneAt));
}

/** Group completed tasks by their completion day — the Archives projection index. */
export function completedByDay(tasks: Task[]): Map<DayKey, Task[]> {
  const map = new Map<DayKey, Task[]>();
  for (const t of tasks) {
    const day = completedDayKey(t);
    if (!day) continue;
    const bucket = map.get(day);
    if (bucket) bucket.push(t);
    else map.set(day, [t]);
  }
  // Stable order within a day: by completion time.
  for (const bucket of map.values()) {
    bucket.sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? ''));
  }
  return map;
}
