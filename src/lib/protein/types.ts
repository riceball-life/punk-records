import type { CollectionRecord } from '../sync/collection';
import type { DayKey } from '../db/types';

/**
 * A day's protein intake — a single running total for one calendar day, logged
 * from the Tracker section. Unlike a Benchmark (a dateless "current best"),
 * protein is a per-day time series: one record per day, its `grams` bumped up or
 * down as you log throughout the day.
 *
 * The id is deterministic (`protein:<day>`) so there is exactly one record per
 * day and "today's total" is an O(1) `get` — logging is a get-modify-put on that
 * single record. The day's total is also folded into that day's journal entry as
 * a `🍗 N g protein` line (see `upsertProteinLine` in `lib/app/stores.ts`), which
 * is how it surfaces in Archives.
 */
export interface ProteinDay extends CollectionRecord {
  id: string;
  day: DayKey;
  /** Running daily total in grams; never negative. */
  grams: number;
  createdAt: string;
  updatedAt: string;
}

/** The deterministic record id for a given day — one protein record per day. */
export function proteinIdFor(day: DayKey): string {
  return `protein:${day}`;
}

export function newProteinDay(day: DayKey, grams = 0): ProteinDay {
  const now = new Date().toISOString();
  return {
    id: proteinIdFor(day),
    day,
    grams: Math.max(0, grams),
    createdAt: now,
    updatedAt: now,
  };
}

/** Matches the single folded protein line in a journal entry, for in-place replacement. */
const PROTEIN_LINE = /^🍗 .*\bprotein\b.*$/mu;

/** The folded journal line for a day's total, with a ✓ when the goal is met. */
export function proteinLineText(grams: number, goal: number): string {
  return `🍗 ${grams} g protein${goal && grams >= goal ? ' ✓' : ''}`;
}

/**
 * Return `text` (a day's journal entry) with its protein line updated in place to
 * reflect `grams` — stripping any existing protein line first so the total never
 * duplicates, then re-appending at the end (same convention as folded todos/PRs).
 * A total of 0 removes the line entirely. Pure, so it's unit-testable without the
 * repo/entry-store singletons.
 */
export function foldProteinLine(text: string, grams: number, goal: number): string {
  const stripped = text
    .replace(PROTEIN_LINE, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '');
  if (grams <= 0) return stripped;
  const line = proteinLineText(grams, goal);
  return stripped ? `${stripped}\n${line}` : line;
}

/**
 * Index protein records by their day (one per day; on the off chance of a
 * duplicate, the later-updated record wins). A seam for future calendar dots /
 * trend charts — the day view itself reads the folded journal line, not this.
 */
export function proteinByDay(list: ProteinDay[]): Map<DayKey, ProteinDay> {
  const map = new Map<DayKey, ProteinDay>();
  for (const p of list) {
    const existing = map.get(p.day);
    if (!existing || existing.updatedAt.localeCompare(p.updatedAt) < 0) {
      map.set(p.day, p);
    }
  }
  return map;
}
