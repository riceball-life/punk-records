import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIdbRepository } from '../db/idbRepository';
import type { JournalRepository } from '../db/repository';
import { createEntryStore } from './entryStore';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let repo: JournalRepository;
let counter = 0;

beforeEach(() => {
  repo = createIdbRepository(`entrystore-test-${counter++}`);
});

describe('load / peek', () => {
  it('returns empty string for a day with no entry and caches it', async () => {
    const store = createEntryStore(repo);
    expect(store.peek('2026-07-15')).toBeUndefined();
    expect(await store.load('2026-07-15')).toBe('');
    expect(store.peek('2026-07-15')).toBe('');
  });

  it('loads existing text from the repo', async () => {
    await repo.put('2026-07-15', 'existing');
    const store = createEntryStore(repo);
    expect(await store.load('2026-07-15')).toBe('existing');
  });
});

describe('debounced autosave', () => {
  it('persists after the debounce window elapses', async () => {
    const store = createEntryStore(repo, { debounceMs: 20 });
    store.edit('2026-07-15', 'hello');
    expect(store.hasPending('2026-07-15')).toBe(true);
    expect(await repo.get('2026-07-15')).toBeUndefined(); // not yet

    await wait(40);
    expect(store.hasPending('2026-07-15')).toBe(false);
    expect((await repo.get('2026-07-15'))?.text).toBe('hello');
  });

  it('coalesces rapid edits into a single write', async () => {
    const putSpy = vi.spyOn(repo, 'put');
    const store = createEntryStore(repo, { debounceMs: 20 });

    store.edit('2026-07-15', 'h');
    store.edit('2026-07-15', 'he');
    store.edit('2026-07-15', 'hell');
    store.edit('2026-07-15', 'hello');

    await wait(40);
    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy).toHaveBeenCalledWith('2026-07-15', 'hello');
  });
});

describe('flush', () => {
  it('persists pending edits immediately and clears the pending flag', async () => {
    const store = createEntryStore(repo, { debounceMs: 10_000 });
    store.edit('2026-07-15', 'flush me');
    await store.flush();
    expect(store.hasPending('2026-07-15')).toBe(false);
    expect((await repo.get('2026-07-15'))?.text).toBe('flush me');
  });

  it('flushes edits across multiple days', async () => {
    const store = createEntryStore(repo, { debounceMs: 10_000 });
    store.edit('2026-07-15', 'a');
    store.edit('2026-07-16', 'b');
    await store.flush();
    expect((await repo.get('2026-07-15'))?.text).toBe('a');
    expect((await repo.get('2026-07-16'))?.text).toBe('b');
  });

  it('deletes the entry when flushed text is blank', async () => {
    await repo.put('2026-07-15', 'was here');
    const store = createEntryStore(repo, { debounceMs: 10_000 });
    store.edit('2026-07-15', '');
    await store.flush();
    expect(await repo.get('2026-07-15')).toBeUndefined();
  });
});
