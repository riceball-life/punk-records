import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { supabase } from './supabaseClient';
import type { SyncStatus } from './syncEngine';

/**
 * Generic keyed-collection sync — the reusable core behind every data-bearing
 * brain-hub section (reminders, notes, todos, and future ones like a tracker).
 *
 * It is the `entries`/journal sync stack, generalized: local IndexedDB copy is
 * authoritative for instant/offline reads and writes; every write is queued in
 * an outbox and reconciled with the cloud last-write-wins. The one difference
 * from the bespoke `entries` stack is that this is parameterized by a
 * *collection name* and a record type with a string `id` primary key, so a new
 * section plugs in with zero new sync code.
 *
 * Storage:
 *  - Local: one IndexedDB database per collection (`pr-<name>`) with `data`,
 *    `outbox`, and `meta` stores — fully isolated, so adding a collection needs
 *    no shared-schema migration.
 *  - Cloud: a single generic `public.docs` table discriminated by a `collection`
 *    column, with the record payload stored as `jsonb`. Adding a new section
 *    therefore requires no SQL change at all.
 */

/** Minimum contract every collection record must satisfy. */
export interface CollectionRecord {
  /** Stable primary key (a uuid). */
  id: string;
  /** ISO 8601 timestamp of the last write; drives last-write-wins. */
  updatedAt: string;
}

/** A local change awaiting push. `deleted` marks a tombstone. */
interface Outbox {
  id: string;
  updatedAt: string;
  deleted: boolean;
}

interface CollectionDB extends DBSchema {
  data: { key: string; value: CollectionRecord };
  outbox: { key: string; value: Outbox };
  meta: { key: string; value: { key: string; value: unknown } };
}

/** A `public.docs` row (the subset we read). */
interface DocRow {
  id: string;
  data: unknown;
  updated_at: string;
  deleted_at: string | null;
}

const WATERMARK = 'watermark';
const SEEDED = 'seeded';
const USER = 'userId';

export interface Collection<T extends CollectionRecord> {
  /** All live (non-deleted) records — unsorted; the caller decides order. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  /** Write a record now: stamps `updatedAt`, queues a push. Returns the stored record. */
  put(record: T): Promise<T>;
  /** Tombstone a record locally and queue the deletion for push. */
  remove(id: string): Promise<void>;

  // --- sync engine surface (mirrors SyncEngine) ---
  sync(): Promise<void>;
  scheduleSync(delayMs?: number): void;
  backfillIfNeeded(): Promise<void>;
  prepareForUser(userId: string): Promise<boolean>;
  /** Fires whenever local data changed (a local write or a pull that applied). */
  onChanged(cb: () => void): () => void;
  onStatus(cb: (s: SyncStatus) => void): () => void;
  getStatus(): SyncStatus;
}

function isNewer(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b);
}

export function createCollection<T extends CollectionRecord>(name: string): Collection<T> {
  let dbPromise: Promise<IDBPDatabase<CollectionDB>> | undefined;
  const db = () =>
    (dbPromise ??= openDB<CollectionDB>(`pr-${name}`, 1, {
      upgrade(d) {
        d.createObjectStore('data', { keyPath: 'id' });
        d.createObjectStore('outbox', { keyPath: 'id' });
        d.createObjectStore('meta', { keyPath: 'key' });
      },
    }));

  async function metaGet<V>(key: string): Promise<V | undefined> {
    const rec = await (await db()).get('meta', key);
    return rec?.value as V | undefined;
  }
  async function metaSet(key: string, value: unknown): Promise<void> {
    await (await db()).put('meta', { key, value });
  }

  let busy = false;
  let status: SyncStatus = 'idle';
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const changed = new Set<() => void>();
  const statusCbs = new Set<(s: SyncStatus) => void>();

  const emitChanged = () => changed.forEach((cb) => cb());
  const setStatus = (s: SyncStatus) => {
    status = s;
    statusCbs.forEach((cb) => cb(s));
  };

  // --- remote (single generic `docs` table) ---
  async function remotePull(since: string | null): Promise<{ rows: DocRow[]; serverTime: string }> {
    if (!supabase) return { rows: [], serverTime: since ?? '' };
    let query = supabase
      .from('docs')
      .select('id,data,updated_at,deleted_at')
      .eq('collection', name)
      .order('updated_at', { ascending: true });
    if (since) query = query.gt('updated_at', since);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as DocRow[];
    const serverTime = rows.length > 0 ? rows[rows.length - 1]!.updated_at : (since ?? '');
    return { rows, serverTime };
  }

  async function remotePush(items: { record: T | null; ob: Outbox }[]): Promise<void> {
    if (!supabase || items.length === 0) return;
    const { data, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const userId = data.user?.id;
    if (!userId) throw new Error('Cannot push: not signed in');

    const rows = items.map(({ record, ob }) => ({
      user_id: userId,
      collection: name,
      id: ob.id,
      data: ob.deleted || !record ? {} : record,
      updated_at: ob.updatedAt,
      deleted_at: ob.deleted || !record ? ob.updatedAt : null,
    }));
    const { error } = await supabase.from('docs').upsert(rows, {
      onConflict: 'user_id,collection,id',
    });
    if (error) throw error;
  }

  // --- sync ---
  async function pushOutbox(): Promise<void> {
    const conn = await db();
    const pending = await conn.getAll('outbox');
    if (pending.length === 0) return;

    const items = await Promise.all(
      pending.map(async (ob) => ({
        ob,
        record: ob.deleted ? null : ((await conn.get('data', ob.id)) as T | undefined) ?? null,
      })),
    );
    await remotePush(items);

    // Drop only outbox rows not superseded by a newer edit made mid-push.
    const toRemove: string[] = [];
    for (const ob of pending) {
      const cur = await conn.get('outbox', ob.id);
      if (cur && cur.updatedAt === ob.updatedAt && cur.deleted === ob.deleted) toRemove.push(ob.id);
    }
    const tx = conn.transaction('outbox', 'readwrite');
    await Promise.all(toRemove.map((id) => tx.store.delete(id)));
    await tx.done;
  }

  async function pullSince(): Promise<void> {
    const since = (await metaGet<string>(WATERMARK)) ?? null;
    const { rows, serverTime } = await remotePull(since);
    const conn = await db();

    let didChange = false;
    for (const row of rows) {
      const local = (await conn.get('data', row.id)) as T | undefined;
      const localOb = await conn.get('outbox', row.id);
      const localUpdatedAt = local?.updatedAt ?? localOb?.updatedAt;
      const remoteWins = localUpdatedAt === undefined || isNewer(row.updated_at, localUpdatedAt);
      if (!remoteWins) continue;

      const remoteDeleted = row.deleted_at != null;
      if (remoteDeleted) {
        if (local === undefined) continue; // nothing to remove
        await conn.delete('data', row.id);
      } else {
        const record = { ...(row.data as T), id: row.id, updatedAt: row.updated_at };
        await conn.put('data', record);
      }
      await conn.delete('outbox', row.id); // remote won → drop stale pending
      didChange = true;
    }

    if (rows.length > 0) await metaSet(WATERMARK, serverTime);
    if (didChange) emitChanged();
  }

  async function sync(): Promise<void> {
    if (busy) return;
    busy = true;
    setStatus('syncing');
    try {
      await pullSince();
      await pushOutbox();
      setStatus('idle');
    } catch (err) {
      setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      console.error(`[punk] sync failed (${name}):`, err);
    } finally {
      busy = false;
    }
  }

  function scheduleSync(delayMs = 1500): void {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void sync(), delayMs);
  }

  return {
    async list() {
      return (await (await db()).getAll('data')) as T[];
    },
    async get(id) {
      return (await (await db()).get('data', id)) as T | undefined;
    },
    async put(record) {
      const stored = { ...record, updatedAt: new Date().toISOString() };
      const conn = await db();
      await conn.put('data', stored);
      await conn.put('outbox', { id: stored.id, updatedAt: stored.updatedAt, deleted: false });
      emitChanged();
      scheduleSync();
      return stored;
    },
    async remove(id) {
      const conn = await db();
      const updatedAt = new Date().toISOString();
      await conn.delete('data', id);
      await conn.put('outbox', { id, updatedAt, deleted: true });
      emitChanged();
      scheduleSync();
    },

    sync,
    scheduleSync,
    async backfillIfNeeded() {
      if (await metaGet<boolean>(SEEDED)) return;
      const conn = await db();
      for (const rec of await conn.getAll('data')) {
        if (!(await conn.get('outbox', rec.id))) {
          await conn.put('outbox', { id: rec.id, updatedAt: rec.updatedAt, deleted: false });
        }
      }
      await metaSet(SEEDED, true);
    },
    async prepareForUser(userId) {
      const prev = await metaGet<string>(USER);
      if (prev === userId) return false;
      if (prev !== undefined) {
        // Real account switch — clear the previous account's local data + outbox.
        const conn = await db();
        const tx = conn.transaction(['data', 'outbox'], 'readwrite');
        await Promise.all([tx.objectStore('data').clear(), tx.objectStore('outbox').clear()]);
        await tx.done;
      }
      await metaSet(WATERMARK, null); // re-pull full history
      await metaSet(SEEDED, false); // re-seed local for push
      await metaSet(USER, userId);
      return true;
    },
    onChanged(cb) {
      changed.add(cb);
      return () => changed.delete(cb);
    },
    onStatus(cb) {
      statusCbs.add(cb);
      return () => statusCbs.delete(cb);
    },
    getStatus: () => status,
  };
}
