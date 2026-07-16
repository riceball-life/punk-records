import type { DayKey, Entry } from './types';
import type { JournalRepository } from './repository';
import type { LocalSyncStore } from '../sync/localSync';
import type { SyncEngine } from '../sync/syncEngine';

/**
 * A {@link JournalRepository} that keeps the local IndexedDB copy authoritative
 * for reads/instant writes, while recording every write in the outbox and
 * nudging the sync engine. Reads pass straight through to the local repository
 * so the UI stays fast and offline-capable.
 *
 * This is the one place storage becomes "synced" — the UI is unaware.
 */
export function createSyncingRepository(
  local: JournalRepository,
  syncStore: LocalSyncStore,
  engine: SyncEngine,
): JournalRepository {
  async function record(date: DayKey, text: string): Promise<Entry | undefined> {
    const updatedAt = new Date().toISOString();
    if (text.trim() === '') {
      await syncStore.deleteRaw(date);
      await syncStore.enqueue({ date, updatedAt, deleted: true });
      engine.scheduleSync();
      return undefined;
    }
    const entry: Entry = { date, text, updatedAt };
    await syncStore.putRaw(entry);
    await syncStore.enqueue({ date, updatedAt, deleted: false });
    engine.scheduleSync();
    return entry;
  }

  return {
    // Reads → local (instant, offline).
    get: (date) => local.get(date),
    getRange: (start, end) => local.getRange(start, end),
    allKeys: () => local.allKeys(),
    exportAll: () => local.exportAll(),

    // Writes → local + outbox + scheduled sync.
    put: (date, text) => record(date, text),
    async delete(date) {
      await syncStore.deleteRaw(date);
      await syncStore.enqueue({ date, updatedAt: new Date().toISOString(), deleted: true });
      engine.scheduleSync();
    },
  };
}
