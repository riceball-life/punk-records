import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalSyncStore, type LocalSyncStore } from './localSync';
import { createSettings, type Settings } from '../db/settings';
import { createSyncEngine, type SyncEngine } from './syncEngine';
import type { PullResult, RemoteRecord, RemoteSource } from './remote';

function makeRemote() {
  const pushed: RemoteRecord[] = [];
  const sinces: (string | null)[] = [];
  let nextPull: PullResult = { records: [], serverTime: '' };
  const remote: RemoteSource = {
    async pull(since) {
      sinces.push(since);
      const r = nextPull;
      nextPull = { records: [], serverTime: since ?? '' };
      return r;
    },
    async push(records) {
      pushed.push(...records);
    },
  };
  return {
    remote,
    pushed,
    sinces,
    setPull: (p: PullResult) => {
      nextPull = p;
    },
  };
}

const rec = (
  date: string,
  updatedAt: string,
  text = 'remote',
  deleted = false,
): RemoteRecord => ({ date, text, updatedAt, deleted });

let local: LocalSyncStore;
let settings: Settings;
let engine: SyncEngine;
let mock: ReturnType<typeof makeRemote>;
let counter = 0;

beforeEach(() => {
  const name = `engine-test-${counter++}`;
  local = createLocalSyncStore(name);
  settings = createSettings(name);
  mock = makeRemote();
  engine = createSyncEngine({ local, remote: mock.remote, settings });
});

describe('pushOutbox', () => {
  it('sends pending local edits and clears the outbox', async () => {
    await local.putRaw({ date: '2026-07-15', text: 'mine', updatedAt: '2026-07-15T12:00:00.000Z' });
    await local.enqueue({ date: '2026-07-15', updatedAt: '2026-07-15T12:00:00.000Z', deleted: false });

    await engine.sync();

    expect(mock.pushed).toEqual([
      { date: '2026-07-15', text: 'mine', updatedAt: '2026-07-15T12:00:00.000Z', deleted: false },
    ]);
    expect(await local.listOutbox()).toHaveLength(0);
  });

  it('pushes a tombstone for a queued deletion', async () => {
    await local.enqueue({ date: '2026-07-15', updatedAt: '2026-07-15T12:00:00.000Z', deleted: true });
    await engine.sync();
    expect(mock.pushed).toEqual([
      { date: '2026-07-15', text: '', updatedAt: '2026-07-15T12:00:00.000Z', deleted: true },
    ]);
  });
});

describe('pullSince (last-write-wins)', () => {
  it('applies newer remote content locally and fires onChanged', async () => {
    let changed = 0;
    engine.onChanged(() => (changed += 1));
    mock.setPull({ records: [rec('2026-07-15', '2026-07-15T12:00:00.000Z', 'hello')], serverTime: '2026-07-15T12:00:00.000Z' });

    await engine.sync();

    expect((await local.getEntry('2026-07-15'))?.text).toBe('hello');
    expect(changed).toBe(1);
  });

  it('keeps a newer local edit over an older remote one', async () => {
    await local.putRaw({ date: '2026-07-15', text: 'mine-new', updatedAt: '2026-07-15T13:00:00.000Z' });
    await local.enqueue({ date: '2026-07-15', updatedAt: '2026-07-15T13:00:00.000Z', deleted: false });
    mock.setPull({ records: [rec('2026-07-15', '2026-07-15T12:00:00.000Z', 'theirs-old')], serverTime: '2026-07-15T12:00:00.000Z' });

    await engine.sync();

    expect((await local.getEntry('2026-07-15'))?.text).toBe('mine-new');
    // local was newer, so it still gets pushed up
    expect(mock.pushed.some((r) => r.text === 'mine-new')).toBe(true);
  });

  it('applies a newer remote deletion', async () => {
    await local.putRaw({ date: '2026-07-15', text: 'mine', updatedAt: '2026-07-15T12:00:00.000Z' });
    mock.setPull({ records: [rec('2026-07-15', '2026-07-15T13:00:00.000Z', '', true)], serverTime: '2026-07-15T13:00:00.000Z' });

    await engine.sync();

    expect(await local.getEntry('2026-07-15')).toBeUndefined();
  });

  it('advances the watermark and uses it on the next pull', async () => {
    mock.setPull({ records: [rec('2026-07-15', '2026-07-15T12:00:00.000Z')], serverTime: '2026-07-15T12:00:00.000Z' });
    await engine.sync();
    await engine.sync(); // second pull

    expect(mock.sinces[0]).toBeNull();
    expect(mock.sinces[1]).toBe('2026-07-15T12:00:00.000Z');
  });
});

describe('prepareForUser (account switching)', () => {
  it('first sign-in sets the user and resets, without clearing local data', async () => {
    await local.putRaw({ date: '2026-07-15', text: 'x', updatedAt: '2026-07-15T00:00:00.000Z' });
    expect(await engine.prepareForUser('user-A')).toBe(true);
    // First run must NOT wipe local data (it may be unsynced).
    expect(await local.getEntry('2026-07-15')).toBeDefined();
  });

  it('is a no-op for the same user', async () => {
    await engine.prepareForUser('user-A');
    expect(await engine.prepareForUser('user-A')).toBe(false);
  });

  it('wipes the previous account\'s local data on a real switch', async () => {
    await engine.prepareForUser('user-A');
    await local.putRaw({ date: '2026-07-15', text: 'x', updatedAt: '2026-07-15T00:00:00.000Z' });
    expect(await engine.prepareForUser('user-B')).toBe(true);
    expect(await local.getEntry('2026-07-15')).toBeUndefined();
  });

  it('resets the watermark so the next pull fetches full history', async () => {
    mock.setPull({
      records: [rec('2026-07-15', '2026-07-15T12:00:00.000Z')],
      serverTime: '2026-07-15T12:00:00.000Z',
    });
    await engine.prepareForUser('user-A');
    await engine.sync(); // advances watermark to serverTime
    await engine.prepareForUser('user-B'); // must reset it
    await engine.sync();
    expect(mock.sinces[mock.sinces.length - 1]).toBeNull();
  });
});

describe('backfillIfNeeded', () => {
  it('seeds the outbox with existing entries exactly once', async () => {
    await local.putRaw({ date: '2026-07-15', text: 'a', updatedAt: '2026-07-15T12:00:00.000Z' });
    await local.putRaw({ date: '2026-07-16', text: 'b', updatedAt: '2026-07-16T12:00:00.000Z' });

    await engine.backfillIfNeeded();
    expect((await local.listOutbox()).map((r) => r.date).sort()).toEqual(['2026-07-15', '2026-07-16']);

    await local.removeOutbox(['2026-07-15', '2026-07-16']);
    await engine.backfillIfNeeded(); // already seeded → no-op
    expect(await local.listOutbox()).toHaveLength(0);
  });
});
