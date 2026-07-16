import { type IDBPDatabase } from 'idb';
import {
  openJournalDB,
  ENTRIES,
  OUTBOX,
  type JournalDB,
  type OutboxRecord,
} from '../db/db';
import type { DayKey, Entry } from '../db/types';

/**
 * Low-level local operations the sync layer needs on top of the plain
 * repository: writing entries with an *explicit* `updatedAt` (so incoming remote
 * records keep their own timestamp instead of being re-stamped), and the outbox
 * of local changes awaiting push.
 */
export interface LocalSyncStore {
  /** Read an entry row (present only for non-deleted days). */
  getEntry(date: DayKey): Promise<Entry | undefined>;
  /** All local entries — used to seed the outbox on first sign-in. */
  allEntries(): Promise<Entry[]>;
  /** Write an entry verbatim — its `updatedAt` is preserved, not re-stamped. */
  putRaw(entry: Entry): Promise<void>;
  /** Remove an entry row (no outbox side effect). */
  deleteRaw(date: DayKey): Promise<void>;
  /** Wipe all local entries and pending outbox items (e.g. on account switch). */
  clearAll(): Promise<void>;

  /** Queue a local change for push; supersedes any earlier pending op for the day. */
  enqueue(record: OutboxRecord): Promise<void>;
  getOutbox(date: DayKey): Promise<OutboxRecord | undefined>;
  listOutbox(): Promise<OutboxRecord[]>;
  removeOutbox(dates: DayKey[]): Promise<void>;
}

export function createLocalSyncStore(name = 'journal'): LocalSyncStore {
  let dbPromise: Promise<IDBPDatabase<JournalDB>> | undefined;
  const db = () => (dbPromise ??= openJournalDB(name));

  return {
    async getEntry(date) {
      return (await db()).get(ENTRIES, date);
    },
    async allEntries() {
      return (await db()).getAll(ENTRIES);
    },
    async putRaw(entry) {
      await (await db()).put(ENTRIES, entry);
    },
    async deleteRaw(date) {
      await (await db()).delete(ENTRIES, date);
    },
    async clearAll() {
      const conn = await db();
      const tx = conn.transaction([ENTRIES, OUTBOX], 'readwrite');
      await Promise.all([tx.objectStore(ENTRIES).clear(), tx.objectStore(OUTBOX).clear()]);
      await tx.done;
    },
    async enqueue(record) {
      await (await db()).put(OUTBOX, record);
    },
    async getOutbox(date) {
      return (await db()).get(OUTBOX, date);
    },
    async listOutbox() {
      return (await db()).getAll(OUTBOX);
    },
    async removeOutbox(dates) {
      const tx = (await db()).transaction(OUTBOX, 'readwrite');
      await Promise.all(dates.map((d) => tx.store.delete(d)));
      await tx.done;
    },
  };
}
