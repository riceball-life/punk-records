import type { DayKey } from '../db/types';
import { completedByDay, type Task } from '../todos/types';
import { milestonesByDay, type Milestone } from '../milestones/types';

/**
 * A day-log entry shown in Archives beneath the journal text. This is the shared
 * abstraction behind the auto-archive mechanism: both completed to-dos and logged
 * milestones project into the same per-day list and render through DayRow, each
 * according to its `kind`.
 */
export type ArchiveKind = 'task' | 'milestone';

export interface ArchiveEntry {
  id: string;
  kind: ArchiveKind;
  text: string;
  /** ISO instant (task completion / milestone log) — orders the day's timeline. */
  at: string;
}

/**
 * Merge completed tasks + logged milestones into one day-indexed projection,
 * each day's entries sorted chronologically. Reuses `completedByDay` and
 * `milestonesByDay` so there's a single grouping rule.
 */
export function buildArchiveByDay(
  tasks: Task[],
  milestones: Milestone[],
): Map<DayKey, ArchiveEntry[]> {
  const map = new Map<DayKey, ArchiveEntry[]>();
  const push = (day: DayKey, entry: ArchiveEntry) => {
    const bucket = map.get(day);
    if (bucket) bucket.push(entry);
    else map.set(day, [entry]);
  };

  for (const [day, tasksForDay] of completedByDay(tasks)) {
    for (const t of tasksForDay) {
      push(day, { id: t.id, kind: 'task', text: t.text, at: t.doneAt ?? '' });
    }
  }
  for (const [day, msForDay] of milestonesByDay(milestones)) {
    for (const m of msForDay) {
      push(day, { id: m.id, kind: 'milestone', text: m.text, at: m.loggedAt });
    }
  }

  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.at.localeCompare(b.at));
  }
  return map;
}
