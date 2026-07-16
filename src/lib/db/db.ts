import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DayKey, Entry } from './types';

/** Object store names. */
export const ENTRIES = 'entries';
export const META = 'meta';
export const OUTBOX = 'outbox';

const VERSION = 3;

export interface MetaRecord {
  key: string;
  value: unknown;
}

/** A local change awaiting push to the cloud. `deleted` marks a tombstone. */
export interface OutboxRecord {
  date: DayKey;
  updatedAt: string;
  deleted: boolean;
}

export interface JournalDB extends DBSchema {
  entries: { key: DayKey; value: Entry };
  meta: { key: string; value: MetaRecord };
  outbox: { key: DayKey; value: OutboxRecord };
}

/**
 * Opens (and migrates) the shared journal database. Both the entry repository
 * and the settings store go through this so there's a single schema/version.
 */
export function openJournalDB(name: string): Promise<IDBPDatabase<JournalDB>> {
  return openDB<JournalDB>(name, VERSION, {
    upgrade(db) {
      // keyPath 'date' means the day key IS the primary key — one entry per day.
      if (!db.objectStoreNames.contains(ENTRIES)) {
        db.createObjectStore(ENTRIES, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(OUTBOX)) {
        // One pending op per day — a newer edit supersedes the older pending one.
        db.createObjectStore(OUTBOX, { keyPath: 'date' });
      }
    },
  });
}
