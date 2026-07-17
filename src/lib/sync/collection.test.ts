import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createCollection, type CollectionRecord } from './collection';

interface Todo extends CollectionRecord {
  id: string;
  text: string;
  done: boolean;
  updatedAt: string;
}

let counter = 0;
// Each collection opens its own IndexedDB database (`pr-<name>`); a unique name
// per test keeps them isolated. Supabase is unconfigured in tests, so the remote
// no-ops and we exercise the local-first CRUD + engine bookkeeping.
const fresh = () => createCollection<Todo>(`test-${counter++}`);

describe('local CRUD (offline)', () => {
  it('put stores a record and stamps updatedAt', async () => {
    const c = fresh();
    const stored = await c.put({ id: 'a', text: 'buy milk', done: false, updatedAt: 'old' });
    expect(stored.updatedAt).not.toBe('old');
    expect(await c.get('a')).toEqual(stored);
    expect(await c.list()).toHaveLength(1);
  });

  it('remove tombstones the record locally', async () => {
    const c = fresh();
    await c.put({ id: 'a', text: 'x', done: false, updatedAt: '' });
    await c.remove('a');
    expect(await c.get('a')).toBeUndefined();
    expect(await c.list()).toHaveLength(0);
  });

  it('put overwrites an existing record by id', async () => {
    const c = fresh();
    await c.put({ id: 'a', text: 'x', done: false, updatedAt: '' });
    await c.put({ id: 'a', text: 'x', done: true, updatedAt: '' });
    const all = await c.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.done).toBe(true);
  });
});

describe('prepareForUser (per-collection watermark namespacing)', () => {
  it('is a no-op for the same user but resets on a real account switch', async () => {
    const c = fresh();
    // First sign-in: fresh user → reset (returns true).
    expect(await c.prepareForUser('user-1')).toBe(true);
    // Same user again → no reset.
    expect(await c.prepareForUser('user-1')).toBe(false);

    // Seed a record, then switch accounts → previous data is wiped.
    await c.put({ id: 'a', text: 'mine', done: false, updatedAt: '' });
    expect(await c.list()).toHaveLength(1);
    expect(await c.prepareForUser('user-2')).toBe(true);
    expect(await c.list()).toHaveLength(0);
  });
});

describe('onChanged', () => {
  it('fires on local writes', async () => {
    const c = fresh();
    let hits = 0;
    const off = c.onChanged(() => hits++);
    await c.put({ id: 'a', text: 'x', done: false, updatedAt: '' });
    await c.remove('a');
    off();
    await c.put({ id: 'b', text: 'y', done: false, updatedAt: '' });
    expect(hits).toBe(2); // put + remove, but not after unsubscribe
  });
});
