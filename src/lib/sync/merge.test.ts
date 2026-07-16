import { describe, it, expect } from 'vitest';
import { resolve, type SyncState } from './merge';

const T1 = '2026-07-15T10:00:00.000Z';
const T2 = '2026-07-15T11:00:00.000Z'; // newer than T1

const live = (updatedAt: string, text = 'x'): SyncState => ({ updatedAt, deleted: false, text });
const tomb = (updatedAt: string): SyncState => ({ updatedAt, deleted: true, text: '' });

describe('resolve (last-write-wins)', () => {
  it('applies remote content when there is no local state', () => {
    expect(resolve(undefined, live(T1, 'hello'))).toEqual({
      type: 'upsert',
      text: 'hello',
      updatedAt: T1,
    });
  });

  it('ignores a remote deletion for a day that has no local entry', () => {
    expect(resolve(undefined, tomb(T1))).toEqual({ type: 'none' });
  });

  it('takes newer remote content over older local', () => {
    expect(resolve(live(T1, 'old'), live(T2, 'new'))).toEqual({
      type: 'upsert',
      text: 'new',
      updatedAt: T2,
    });
  });

  it('applies a newer remote deletion over older local content', () => {
    expect(resolve(live(T1), tomb(T2))).toEqual({ type: 'delete', updatedAt: T2 });
  });

  it('keeps local when local is newer (remote loses)', () => {
    expect(resolve(live(T2, 'mine'), live(T1, 'theirs'))).toEqual({ type: 'none' });
    expect(resolve(live(T2), tomb(T1))).toEqual({ type: 'none' });
  });

  it('keeps local on a timestamp tie', () => {
    expect(resolve(live(T1, 'mine'), live(T1, 'theirs'))).toEqual({ type: 'none' });
  });

  it('does not re-delete an already-deleted local tombstone', () => {
    expect(resolve(tomb(T1), tomb(T2))).toEqual({ type: 'none' });
  });
});
