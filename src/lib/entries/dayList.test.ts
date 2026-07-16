import { describe, it, expect } from 'vitest';
import { buildDayList } from './dayList';

describe('buildDayList', () => {
  it('always includes today, even with no entries', () => {
    expect(buildDayList([], '2026-07-15')).toEqual(['2026-07-15']);
  });

  it('merges entries with today and sorts chronologically', () => {
    expect(buildDayList(['2026-07-20', '2026-01-01'], '2026-07-15')).toEqual([
      '2026-01-01',
      '2026-07-15',
      '2026-07-20',
    ]);
  });

  it('does not duplicate today when an entry already exists for it', () => {
    expect(buildDayList(['2026-07-15', '2026-07-10'], '2026-07-15')).toEqual([
      '2026-07-10',
      '2026-07-15',
    ]);
  });
});
