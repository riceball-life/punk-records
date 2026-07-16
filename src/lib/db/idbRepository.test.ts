import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createIdbRepository } from './idbRepository';
import type { JournalRepository } from './repository';

let repo: JournalRepository;
let counter = 0;

beforeEach(() => {
  // Fresh, uniquely-named DB per test so state never leaks between tests.
  repo = createIdbRepository(`journal-test-${counter++}`);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('get / put', () => {
  it('returns undefined for a day with no entry', async () => {
    expect(await repo.get('2026-07-15')).toBeUndefined();
  });

  it('stores and reads back an entry, stamping updatedAt', async () => {
    // Fake only Date — fake-indexeddb relies on real setTimeout/microtasks to
    // resolve its transactions, so faking those would hang the DB.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));

    const stored = await repo.put('2026-07-15', 'hello world');
    expect(stored).toEqual({
      date: '2026-07-15',
      text: 'hello world',
      updatedAt: '2026-07-15T12:00:00.000Z',
    });
    expect(await repo.get('2026-07-15')).toEqual(stored);
  });

  it('overwrites an existing day and advances updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    await repo.put('2026-07-15', 'first');

    vi.setSystemTime(new Date('2026-07-15T13:30:00.000Z'));
    const second = await repo.put('2026-07-15', 'second');

    expect(second?.text).toBe('second');
    expect(second?.updatedAt).toBe('2026-07-15T13:30:00.000Z');
    expect(await repo.get('2026-07-15')).toEqual(second);
  });
});

describe('blank entries are not persisted', () => {
  it('deletes when text becomes empty', async () => {
    await repo.put('2026-07-15', 'something');
    const result = await repo.put('2026-07-15', '');
    expect(result).toBeUndefined();
    expect(await repo.get('2026-07-15')).toBeUndefined();
  });

  it('treats whitespace-only text as blank', async () => {
    const result = await repo.put('2026-07-15', '   \n\t ');
    expect(result).toBeUndefined();
    expect(await repo.get('2026-07-15')).toBeUndefined();
  });
});

describe('delete', () => {
  it('removes an entry and is a no-op when absent', async () => {
    await repo.put('2026-07-15', 'x');
    await repo.delete('2026-07-15');
    expect(await repo.get('2026-07-15')).toBeUndefined();
    await expect(repo.delete('2026-07-15')).resolves.toBeUndefined();
  });
});

describe('allKeys / getRange / exportAll ordering', () => {
  beforeEach(async () => {
    // Insert deliberately out of order.
    await repo.put('2026-07-15', 'c');
    await repo.put('2026-01-01', 'a');
    await repo.put('2026-03-10', 'b');
  });

  it('allKeys returns every key chronologically ascending', async () => {
    expect(await repo.allKeys()).toEqual(['2026-01-01', '2026-03-10', '2026-07-15']);
  });

  it('getRange is inclusive of both bounds and sorted', async () => {
    expect((await repo.getRange('2026-01-01', '2026-03-10')).map((e) => e.date)).toEqual([
      '2026-01-01',
      '2026-03-10',
    ]);
    expect((await repo.getRange('2026-03-10', '2026-03-10')).map((e) => e.date)).toEqual([
      '2026-03-10',
    ]);
    expect(await repo.getRange('2026-08-01', '2026-12-31')).toEqual([]);
  });

  it('exportAll dumps every entry chronologically', async () => {
    const all = await repo.exportAll();
    expect(all.map((e) => e.date)).toEqual(['2026-01-01', '2026-03-10', '2026-07-15']);
    expect(all.every((e) => typeof e.updatedAt === 'string')).toBe(true);
  });
});
