/**
 * Pure last-write-wins conflict resolution for one day.
 *
 * A day's state (local or remote) reduces to a timestamp + whether it's a
 * tombstone. Given the local state (or absence) and an incoming remote record,
 * decide what — if anything — to apply to the local store. The engine handles
 * the IndexedDB writes; this stays pure and unit-tested.
 */

export interface SyncState {
  /** ISO 8601 timestamp of the last write. */
  updatedAt: string;
  /** True when this is a deletion tombstone. */
  deleted: boolean;
  /** Body text ('' for tombstones). */
  text: string;
}

export type MergeAction =
  | { type: 'none' }
  | { type: 'upsert'; text: string; updatedAt: string }
  | { type: 'delete'; updatedAt: string };

function isNewer(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b);
}

/**
 * Decide how to reconcile an incoming `remote` record against the current
 * `local` state (`undefined` = the day has no local entry and no pending
 * tombstone). Remote wins only when strictly newer; ties keep local.
 */
export function resolve(local: SyncState | undefined, remote: SyncState): MergeAction {
  const remoteWins = local === undefined || isNewer(remote.updatedAt, local.updatedAt);
  if (!remoteWins) return { type: 'none' };

  if (remote.deleted) {
    // Nothing to remove if there's no local entry.
    if (local === undefined || local.deleted) return { type: 'none' };
    return { type: 'delete', updatedAt: remote.updatedAt };
  }
  return { type: 'upsert', text: remote.text, updatedAt: remote.updatedAt };
}
