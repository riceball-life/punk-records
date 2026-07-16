import { supabase } from './supabaseClient';
import type { DayKey } from '../db/types';

/** A day's state as it travels to/from the cloud. */
export interface RemoteRecord {
  date: DayKey;
  text: string;
  updatedAt: string;
  deleted: boolean;
}

/** Shape of a `public.entries` row (subset we read). */
interface EntryRow {
  date: string;
  text: string | null;
  updated_at: string;
  deleted_at: string | null;
}

/** DB row → domain record. A non-null `deleted_at` marks a tombstone. */
export function rowToRecord(row: EntryRow): RemoteRecord {
  return {
    date: row.date,
    text: row.text ?? '',
    updatedAt: row.updated_at,
    deleted: row.deleted_at != null,
  };
}

/** Domain record → row for upsert. Tombstones store empty text + deleted_at. */
export function recordToRow(userId: string, rec: RemoteRecord): Record<string, unknown> {
  return {
    user_id: userId,
    date: rec.date,
    text: rec.deleted ? '' : rec.text,
    updated_at: rec.updatedAt,
    deleted_at: rec.deleted ? rec.updatedAt : null,
  };
}

export interface PullResult {
  records: RemoteRecord[];
  /** Watermark to persist for the next incremental pull. */
  serverTime: string;
}

export interface RemoteSource {
  /** Fetch rows changed after `since` (all rows when `since` is null). */
  pull(since: string | null): Promise<PullResult>;
  /** Upsert local changes to the cloud. */
  push(records: RemoteRecord[]): Promise<void>;
}

const TABLE = 'entries';

/** Supabase-backed remote. No-ops safely when sync isn't configured. */
export function createRemoteSource(): RemoteSource {
  return {
    async pull(since: string | null): Promise<PullResult> {
      if (!supabase) return { records: [], serverTime: since ?? '' };
      let query = supabase
        .from(TABLE)
        .select('date,text,updated_at,deleted_at')
        .order('updated_at', { ascending: true });
      if (since) query = query.gt('updated_at', since);

      const { data, error } = await query;
      if (error) throw error;

      const records = (data ?? []).map(rowToRecord);
      const serverTime =
        records.length > 0 ? records[records.length - 1]!.updatedAt : (since ?? '');
      return { records, serverTime };
    },

    async push(records: RemoteRecord[]): Promise<void> {
      if (!supabase || records.length === 0) return;
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = data.user?.id;
      if (!userId) throw new Error('Cannot push: not signed in');

      const rows = records.map((r) => recordToRow(userId, r));
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'user_id,date' });
      if (error) throw error;
    },
  };
}
