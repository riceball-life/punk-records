import { createIdbRepository } from '../db/idbRepository';
import { createSyncingRepository } from '../db/syncingRepository';
import { createEntryStore } from '../entries/entryStore';
import { createSettings } from '../db/settings';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { createLocalSyncStore } from '../sync/localSync';
import { createRemoteSource } from '../sync/remote';
import { createSyncEngine, type SyncEngine } from '../sync/syncEngine';
import { createCollection } from '../sync/collection';
import { todayKey } from '../date/dateUtils';
import type { Reminder } from '../reminders/types';
import type { Note } from '../notes/types';
import { taskDate, taskOrder, type Task } from '../todos/types';
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
 * Append a line to *today's* journal entry — the way To-do completions and
 * Tracker milestones are logged into Archives (as plain text, not structured
 * data). Flushes any pending edit first so we don't race the debounced autosave,
 * then invalidates the cache so a later Archives mount reloads the new text.
 */
export async function appendToTodayEntry(line: string): Promise<void> {
  await entryStore.flush();
  const day = todayKey();
  const current = (await repo.get(day))?.text ?? '';
  const trimmed = current.replace(/\s+$/, '');
  await repo.put(day, trimmed ? `${trimmed}\n${line}` : line);
  entryStore.invalidate();
}

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

/**
 * One-time migration when decoupling Archives from To-do: fold every already-
 * completed task into its day's journal entry as a `✓ …` line, then delete the
 * task record — so past "what I did" history survives as journal text instead of
 * structured checklist data. Guarded by a local flag; call once after todos are
 * loaded/synced.
 */
export async function migrateCompletedTasksToEntries(): Promise<void> {
  if (await settings.get<boolean>('migration.foldCompletedTasks')) return;

  const completed = (await todos.list()).filter((t) => t.done);
  const byDay = new Map<string, Task[]>();
  for (const t of completed) {
    const day = taskDate(t);
    if (!day) continue;
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(t);
  }

  for (const [day, tasks] of byDay) {
    tasks.sort((a, b) => taskOrder(a) - taskOrder(b) || a.createdAt.localeCompare(b.createdAt));
    const lines = tasks
      .map((t) => t.text.trim())
      .filter(Boolean)
      .map((text) => `✓ ${text}`)
      .join('\n');
    if (lines) {
      const current = ((await repo.get(day))?.text ?? '').replace(/\s+$/, '');
      await repo.put(day, current ? `${current}\n${lines}` : lines);
    }
    for (const t of tasks) await todos.remove(t.id);
  }

  await settings.set('migration.foldCompletedTasks', true);
}
