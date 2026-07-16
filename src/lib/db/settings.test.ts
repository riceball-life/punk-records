import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createSettings } from './settings';

let counter = 0;
const fresh = () => createSettings(`settings-test-${counter++}`);

describe('settings key/value store', () => {
  it('returns undefined for an unset key', async () => {
    const s = fresh();
    expect(await s.get('missing')).toBeUndefined();
  });

  it('round-trips values of various types', async () => {
    const s = fresh();
    await s.set('flag', true);
    await s.set('count', 3);
    await s.set('obj', { a: 1 });
    expect(await s.get<boolean>('flag')).toBe(true);
    expect(await s.get<number>('count')).toBe(3);
    expect(await s.get<{ a: number }>('obj')).toEqual({ a: 1 });
  });

  it('overwrites an existing key', async () => {
    const s = fresh();
    await s.set('flag', false);
    await s.set('flag', true);
    expect(await s.get<boolean>('flag')).toBe(true);
  });
});
