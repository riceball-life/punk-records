import { createIdbRepository } from '../db/idbRepository';
import { createSyncingRepository } from '../db/syncingRepository';
import { createEntryStore } from '../entries/entryStore';
import { createSettings } from '../db/settings';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { createLocalSyncStore } from '../sync/localSync';
import { createRemoteSource } from '../sync/remote';
import { createSyncEngine, type SyncEngine } from '../sync/syncEngine';
import { createCollection } from '../sync/collection';
import type { Reminder } from '../reminders/types';
import type { Note } from '../notes/types';
import type { Task } from '../todos/types';
import type { Benchmark } from '../tracker/types';
import type { Milestone } from '../milestones/types';

/** App-wide singletons. */
export const settings = createSettings();

const idb = createIdbRepository();

/**
 * When Supabase is configured, storage is the syncing repository (local cache +
 * outbox + cloud reconciliation) and `syncEngine` drives it. Otherwise it's the
 * plain local repository and there is no engine — the app behaves exactly as the
 * offline MVP did.
 */
export let syncEngine: SyncEngine | null = null;

function buildRepo() {
  if (!isSupabaseConfigured) return idb;
  const local = createLocalSyncStore();
  const remote = createRemoteSource();
  syncEngine = createSyncEngine({ local, remote, settings });
  return createSyncingRepository(idb, local, syncEngine);
}

export const repo = buildRepo();
export const entryStore = createEntryStore(repo);

/**
 * Hub "daily reminders" — the first consumer of the generic collection layer.
 * Works local-only when Supabase is unconfigured and syncs when it is (its
 * engine no-ops against a null remote).
 */
export const reminders = createCollection<Reminder>('reminders');

/** Scratch notes — freeform iOS-Notes-style notes, one synced record each. */
export const notes = createCollection<Note>('notes');

/** To-do tasks — checkbox-only; completed ones project into Archives by day. */
export const todos = createCollection<Task>('todos');

/** Tracker benchmarks — current-best value per named metric. */
export const benchmarks = createCollection<Benchmark>('benchmarks');

/** Logged PR milestones — project into Archives by day, alongside completed todos. */
export const milestones = createCollection<Milestone>('milestones');

/**
 * The minimal sign-in/sync surface the App shell drives on each engine. Both the
 * bespoke entries `SyncEngine` and every generic `Collection` satisfy it.
 */
export interface Syncable {
  sync(): Promise<void>;
  backfillIfNeeded(): Promise<void>;
  prepareForUser(userId: string): Promise<boolean>;
  onChanged(cb: () => void): () => void;
}

/**
 * Every engine the shell must reconcile on sign-in. `syncEngine` is non-null iff
 * Supabase is configured, so this is empty in the offline-only build (local CRUD
 * still works — the collections just don't sync).
 */
export const syncables: Syncable[] = syncEngine
  ? [syncEngine, reminders, notes, todos, benchmarks, milestones]
  : [];
