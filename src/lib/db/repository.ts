import type { DayKey, Entry } from './types';

/**
 * Storage seam for journal entries.
 *
 * All reads/writes in the app go through this interface so the concrete backend
 * (IndexedDB today) can be swapped or wrapped — e.g. a future backup/sync layer
 * — without touching UI code. Keep it small and backend-agnostic.
 */
export interface JournalRepository {
  /** Fetch a single day's entry, or `undefined` if that day has none. */
  get(date: DayKey): Promise<Entry | undefined>;

  /**
   * Fetch all entries whose day falls within `[start, end]` inclusive,
   * sorted chronologically ascending. Empty days are simply absent.
   */
  getRange(start: DayKey, end: DayKey): Promise<Entry[]>;

  /**
   * Create or overwrite the entry for a day and return the stored record.
   *
   * An empty/whitespace-only `text` deletes the day's entry instead of storing
   * a blank one, so blank days never linger in the list. `updatedAt` is stamped
   * by the repository at write time.
   */
  put(date: DayKey, text: string): Promise<Entry | undefined>;

  /** Remove a day's entry if present (no-op if absent). */
  delete(date: DayKey): Promise<void>;

  /** All entry day-keys sorted ascending — the backbone of the day-scroll list. */
  allKeys(): Promise<DayKey[]>;

  /** Every entry, chronologically ascending. Used by the export escape hatch. */
  exportAll(): Promise<Entry[]>;
}
