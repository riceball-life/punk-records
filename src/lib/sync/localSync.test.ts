import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalSyncStore, type LocalSyncStore } from './localSync';

let store: LocalSyncStore;
let counter = 0;

beforeEach(() => {
  store = createLocalSyncStore(`localsync-test-${counter++}`);
});

describe('putRaw preserves the given timestamp', () => {
  it('stores updatedAt verbatim (no re-stamping)', async () => {
    const entry = { date: '2026-07-15', text: 'from remote', updatedAt: '2020-01-01T00:00:00.000Z' };
    await store.putRaw(entry);
    expect(await store.getEntry('2026-07-15')).toEqual(entry);
  });

  it('deleteRaw removes the row', async () => {
    await store.putRaw({ date: '2026-07-15', text: 'x', updatedAt: '2026-07-15T00:00:00.000Z' });
    await store.deleteRaw('2026-07-15');
    expect(await store.getEntry('2026-07-15')).toBeUndefined();
  });
});

describe('outbox', () => {
  it('enqueues, reads, lists, and removes', async () => {
    await store.enqueue({ date: '2026-07-15', updatedAt: 't1', deleted: false });
    await store.enqueue({ date: '2026-07-16', updatedAt: 't2', deleted: true });

    expect(await store.getOutbox('2026-07-15')).toEqual({
      date: '2026-07-15',
      updatedAt: 't1',
      deleted: false,
    });
    expect((await store.listOutbox()).map((r) => r.date).sort()).toEqual([
      '2026-07-15',
      '2026-07-16',
    ]);

    await store.removeOutbox(['2026-07-15']);
    expect(await store.getOutbox('2026-07-15')).toBeUndefined();
    expect(await store.listOutbox()).toHaveLength(1);
  });

  it('a newer pending op supersedes the older one for the same day', async () => {
    await store.enqueue({ date: '2026-07-15', updatedAt: 't1', deleted: false });
    await store.enqueue({ date: '2026-07-15', updatedAt: 't2', deleted: true });
    expect(await store.getOutbox('2026-07-15')).toEqual({
      date: '2026-07-15',
      updatedAt: 't2',
      deleted: true,
    });
    expect(await store.listOutbox()).toHaveLength(1);
  });
});
