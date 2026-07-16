import type { LocalSyncStore } from './localSync';
import type { RemoteRecord, RemoteSource } from './remote';
import type { Settings } from '../db/settings';
import { resolve, type SyncState } from './merge';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncEngine {
  /** Reconcile with the cloud now: pull (merge) then push local changes. */
  sync(): Promise<void>;
  /** Debounced `sync()` — used after local edits. */
  scheduleSync(delayMs?: number): void;
  /** On first sign-in, seed the outbox with all pre-existing local entries. */
  backfillIfNeeded(): Promise<void>;
  /**
   * Reconcile local state with the signed-in user. Resets the pull watermark
   * whenever the user differs from last time (forcing a full re-pull), and wipes
   * the previous account's local data on a real account switch. Returns true if
   * anything was reset.
   */
  prepareForUser(userId: string): Promise<boolean>;
  /** Fires when a pull changed local data (so the UI can refresh). */
  onChanged(cb: () => void): () => void;
  onStatus(cb: (status: SyncStatus) => void): () => void;
  getStatus(): SyncStatus;
}

const WATERMARK_KEY = 'sync.watermark';
const SEEDED_KEY = 'sync.seeded';
const USER_KEY = 'sync.userId';

export interface SyncEngineDeps {
  local: LocalSyncStore;
  remote: RemoteSource;
  settings: Settings;
}

export function createSyncEngine({ local, remote, settings }: SyncEngineDeps): SyncEngine {
  let busy = false;
  let status: SyncStatus = 'idle';
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const changedListeners = new Set<() => void>();
  const statusListeners = new Set<(s: SyncStatus) => void>();

  function emitChanged(): void {
    for (const cb of changedListeners) cb();
  }
  function setStatus(next: SyncStatus): void {
    status = next;
    for (const cb of statusListeners) cb(next);
  }

  /** Push queued local changes; clear only the outbox entries we actually sent. */
  async function pushOutbox(): Promise<void> {
    const pending = await local.listOutbox();
    if (pending.length === 0) return;

    const records: RemoteRecord[] = await Promise.all(
      pending.map(async (o) => {
        if (o.deleted) return { date: o.date, text: '', updatedAt: o.updatedAt, deleted: true };
        const entry = await local.getEntry(o.date);
        return {
          date: o.date,
          text: entry?.text ?? '',
          updatedAt: o.updatedAt,
          deleted: entry === undefined, // entry vanished → treat as delete
        };
      }),
    );

    await remote.push(records);

    // Only drop outbox rows that haven't been superseded by a newer edit made
    // while the push was in flight.
    const toRemove: string[] = [];
    for (const o of pending) {
      const cur = await local.getOutbox(o.date);
      if (cur && cur.updatedAt === o.updatedAt && cur.deleted === o.deleted) {
        toRemove.push(o.date);
      }
    }
    await local.removeOutbox(toRemove);
  }

  /** Pull remote changes since the watermark and merge them (last-write-wins). */
  async function pullSince(): Promise<void> {
    const since = (await settings.get<string>(WATERMARK_KEY)) ?? null;
    const { records, serverTime } = await remote.pull(since);

    let changed = false;
    for (const rec of records) {
      const entry = await local.getEntry(rec.date);
      const outbox = await local.getOutbox(rec.date);
      const localState: SyncState | undefined = entry
        ? { updatedAt: entry.updatedAt, deleted: false, text: entry.text }
        : outbox
          ? { updatedAt: outbox.updatedAt, deleted: outbox.deleted, text: '' }
          : undefined;

      const action = resolve(localState, {
        updatedAt: rec.updatedAt,
        deleted: rec.deleted,
        text: rec.text,
      });

      if (action.type === 'upsert') {
        await local.putRaw({ date: rec.date, text: action.text, updatedAt: action.updatedAt });
        await local.removeOutbox([rec.date]); // remote won → discard stale pending
        changed = true;
      } else if (action.type === 'delete') {
        await local.deleteRaw(rec.date);
        await local.removeOutbox([rec.date]);
        changed = true;
      }
    }

    if (records.length > 0) await settings.set(WATERMARK_KEY, serverTime);
    if (changed) emitChanged();
  }

  async function sync(): Promise<void> {
    if (busy) return;
    busy = true;
    setStatus('syncing');
    try {
      // Pull first so a stale local edit can't clobber a newer remote one.
      await pullSince();
      await pushOutbox();
      setStatus('idle');
    } catch (err) {
      setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      console.error('[journal] sync failed:', err);
    } finally {
      busy = false;
    }
  }

  return {
    sync,
    scheduleSync(delayMs = 1500) {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void sync(), delayMs);
    },
    async backfillIfNeeded() {
      if (await settings.get<boolean>(SEEDED_KEY)) return;
      for (const entry of await local.allEntries()) {
        if (!(await local.getOutbox(entry.date))) {
          await local.enqueue({ date: entry.date, updatedAt: entry.updatedAt, deleted: false });
        }
      }
      await settings.set(SEEDED_KEY, true);
    },

    async prepareForUser(userId: string): Promise<boolean> {
      const prev = await settings.get<string>(USER_KEY);
      if (prev === userId) return false;
      // A different account than last synced (or first run): re-pull from scratch.
      if (prev !== undefined) {
        // Real switch — don't leave the previous account's entries behind.
        await local.clearAll();
      }
      await settings.set(WATERMARK_KEY, null); // pull since null → full history
      await settings.set(SEEDED_KEY, false); // re-seed local (if any) for push
      await settings.set(USER_KEY, userId);
      return true;
    },
    onChanged(cb) {
      changedListeners.add(cb);
      return () => changedListeners.delete(cb);
    },
    onStatus(cb) {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    getStatus: () => status,
  };
}
