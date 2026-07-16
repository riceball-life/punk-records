import { createIdbRepository } from '../db/idbRepository';
import { createSyncingRepository } from '../db/syncingRepository';
import { createEntryStore } from '../entries/entryStore';
import { createSettings } from '../db/settings';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { createLocalSyncStore } from '../sync/localSync';
import { createRemoteSource } from '../sync/remote';
import { createSyncEngine, type SyncEngine } from '../sync/syncEngine';

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
