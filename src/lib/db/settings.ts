import { type IDBPDatabase } from 'idb';
import { openJournalDB, META, type JournalDB } from './db';

/**
 * Tiny key/value settings store, sharing the journal database's `meta` object
 * store. Used for small, non-precious UI state (e.g. whether the one-time
 * storage note was dismissed) — kept in IndexedDB alongside entries so there's
 * a single storage system.
 */
export interface Settings {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export function createSettings(name = 'journal'): Settings {
  let dbPromise: Promise<IDBPDatabase<JournalDB>> | undefined;
  const db = () => (dbPromise ??= openJournalDB(name));

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const rec = await (await db()).get(META, key);
      return rec?.value as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      await (await db()).put(META, { key, value });
    },
  };
}
