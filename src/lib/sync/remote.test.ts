import { describe, it, expect } from 'vitest';
import { rowToRecord, recordToRow, type RemoteRecord } from './remote';

describe('rowToRecord', () => {
  it('maps a live row', () => {
    expect(
      rowToRecord({
        date: '2026-07-15',
        text: 'hi',
        updated_at: '2026-07-15T10:00:00.000Z',
        deleted_at: null,
      }),
    ).toEqual({ date: '2026-07-15', text: 'hi', updatedAt: '2026-07-15T10:00:00.000Z', deleted: false });
  });

  it('maps a tombstone row (deleted_at set) and null text', () => {
    const r = rowToRecord({
      date: '2026-07-15',
      text: null,
      updated_at: '2026-07-15T10:00:00.000Z',
      deleted_at: '2026-07-15T10:00:00.000Z',
    });
    expect(r.deleted).toBe(true);
    expect(r.text).toBe('');
  });
});

describe('recordToRow', () => {
  const live: RemoteRecord = { date: '2026-07-15', text: 'hi', updatedAt: 't', deleted: false };
  const dead: RemoteRecord = { date: '2026-07-15', text: 'hi', updatedAt: 't', deleted: true };

  it('includes user_id and no deleted_at for live records', () => {
    expect(recordToRow('user-1', live)).toEqual({
      user_id: 'user-1',
      date: '2026-07-15',
      text: 'hi',
      updated_at: 't',
      deleted_at: null,
    });
  });

  it('blanks text and sets deleted_at for tombstones', () => {
    expect(recordToRow('user-1', dead)).toEqual({
      user_id: 'user-1',
      date: '2026-07-15',
      text: '',
      updated_at: 't',
      deleted_at: 't',
    });
  });
});
