import { type IDBPDatabase } from 'idb';
import type { DayKey, Entry } from './types';
import type { JournalRepository } from './repository';
import { openJournalDB, ENTRIES as STORE, type JournalDB } from './db';
import { compareDayKeys } from '../date/dateUtils';

const DEFAULT_DB_NAME = 'journal';

/**
 * IndexedDB-backed {@link JournalRepository}.
 *
 * `dbName` is injectable so tests can isolate their own database. Each public
 * method opens against a shared, lazily-created connection.
 */
export function createIdbRepository(dbName: string = DEFAULT_DB_NAME): JournalRepository {
  let dbPromise: Promise<IDBPDatabase<JournalDB>> | undefined;
  const db = () => (dbPromise ??= openJournalDB(dbName));

  return {
    async get(date: DayKey): Promise<Entry | undefined> {
      return (await db()).get(STORE, date);
    },

    async getRange(start: DayKey, end: DayKey): Promise<Entry[]> {
      const range = IDBKeyRange.bound(start, end);
      const rows = await (await db()).getAll(STORE, range);
      // Store keys sort as strings; zero-padded YYYY-MM-DD already sorts
      // chronologically, but sort explicitly to be safe against key quirks.
      return rows.sort((a, b) => compareDayKeys(a.date, b.date));
    },

    async put(date: DayKey, text: string): Promise<Entry | undefined> {
      if (text.trim() === '') {
        // Don't persist blank days — remove any existing record instead.
        await (await db()).delete(STORE, date);
        return undefined;
      }
      const entry: Entry = { date, text, updatedAt: new Date().toISOString() };
      await (await db()).put(STORE, entry);
      return entry;
    },

    async delete(date: DayKey): Promise<void> {
      await (await db()).delete(STORE, date);
    },

    async allKeys(): Promise<DayKey[]> {
      const keys = await (await db()).getAllKeys(STORE);
      return (keys as DayKey[]).sort(compareDayKeys);
    },

    async exportAll(): Promise<Entry[]> {
      const rows = await (await db()).getAll(STORE);
      return rows.sort((a, b) => compareDayKeys(a.date, b.date));
    },
  };
}
