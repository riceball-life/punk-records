import type { DayKey, Entry } from '../db/types';
import type { JournalRepository } from '../db/repository';

export interface EntryStore {
  /** Text for a day, loading from the repo on first access and caching it. */
  load(date: DayKey): Promise<string>;
  /** Synchronously read the cached text, or `undefined` if not loaded yet. */
  peek(date: DayKey): string | undefined;
  /** Record an edit: updates the cache and schedules a debounced write. */
  edit(date: DayKey, text: string): void;
  /** Immediately persist all pending edits (e.g. on blur / page hide). */
  flush(): Promise<void>;
  /** Whether a given day currently has unsaved (debounced) changes. */
  hasPending(date: DayKey): boolean;
  /**
   * Drop cached text so the next {@link load} re-reads from the repository.
   * Call after a sync has written remote changes straight into storage.
   * Safe only once pending edits are flushed (the caller flushes first).
   */
  invalidate(): void;
  /** Full export for the backup escape hatch. */
  exportAll(): Promise<Entry[]>;
}

export interface EntryStoreOptions {
  /** Debounce window for autosave, in ms. */
  debounceMs?: number;
}

/**
 * In-memory text cache + debounced autosave over a {@link JournalRepository}.
 *
 * Kept deliberately framework-agnostic (no Svelte runes) so the tricky async
 * timing is unit-testable in plain Node. Svelte components own the reactive
 * list of day keys; this owns per-day text and persistence.
 */
export function createEntryStore(
  repo: JournalRepository,
  { debounceMs = 500 }: EntryStoreOptions = {},
): EntryStore {
  const cache = new Map<DayKey, string>();
  const timers = new Map<DayKey, ReturnType<typeof setTimeout>>();
  /** In-flight or queued save promises, so `flush` can await them. */
  const inflight = new Set<Promise<unknown>>();

  function track<T>(p: Promise<T>): Promise<T> {
    inflight.add(p);
    void p.finally(() => inflight.delete(p));
    return p;
  }

  function save(date: DayKey): Promise<void> {
    timers.delete(date);
    const text = cache.get(date) ?? '';
    return track(repo.put(date, text)).then(() => undefined);
  }

  return {
    async load(date: DayKey): Promise<string> {
      const cached = cache.get(date);
      if (cached !== undefined) return cached;
      const entry = await repo.get(date);
      const text = entry?.text ?? '';
      // Don't clobber a value the user typed while the read was in flight.
      if (!cache.has(date)) cache.set(date, text);
      return cache.get(date)!;
    },

    peek(date: DayKey): string | undefined {
      return cache.get(date);
    },

    edit(date: DayKey, text: string): void {
      cache.set(date, text);
      const existing = timers.get(date);
      if (existing) clearTimeout(existing);
      timers.set(
        date,
        setTimeout(() => {
          void save(date);
        }, debounceMs),
      );
    },

    async flush(): Promise<void> {
      // Snapshot first — save() mutates `timers`.
      const pending = [...timers.entries()];
      for (const [date, timer] of pending) {
        clearTimeout(timer);
        void save(date); // queues a write and clears the timer entry
      }
      // Wait for every queued/in-flight write to settle.
      await Promise.all([...inflight]);
    },

    hasPending(date: DayKey): boolean {
      return timers.has(date);
    },

    invalidate(): void {
      cache.clear();
    },

    exportAll(): Promise<Entry[]> {
      return repo.exportAll();
    },
  };
}
