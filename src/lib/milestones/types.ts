import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';
import { toDayKey } from '../date/dateUtils';

/**
 * A milestone — a personal-record achievement logged from the Tracker section
 * and shown in Archives under the day it was logged. Its own synced record (not
 * stuffed into the journal text); `text` is the pre-composed, user-editable line
 * (e.g. "New PR: Bench 210, up from 205"). `benchmarkId` links it back to the
 * benchmark, the seam for future per-benchmark history/charts.
 */
export interface Milestone extends CollectionRecord {
  id: string;
  text: string;
  /** ISO instant it was logged — its Archives day derives from this. */
  loggedAt: string;
  benchmarkId: string;
  createdAt: string;
  updatedAt: string;
}

export function newMilestone(text: string, benchmarkId: string): Milestone {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text, loggedAt: now, benchmarkId, createdAt: now, updatedAt: now };
}

/** The local calendar day a milestone belongs to. */
export function milestoneDayKey(m: Milestone): DayKey {
  return toDayKey(new Date(m.loggedAt));
}

/** Group milestones by their logged day — the Archives projection index. */
export function milestonesByDay(list: Milestone[]): Map<DayKey, Milestone[]> {
  const map = new Map<DayKey, Milestone[]>();
  for (const m of list) {
    const day = milestoneDayKey(m);
    const bucket = map.get(day);
    if (bucket) bucket.push(m);
    else map.set(day, [m]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  }
  return map;
}
