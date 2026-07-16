import { describe, it, expect } from 'vitest';
import {
  monthIndex,
  monthParts,
  monthIndexOfKey,
  daysInMonth,
  firstWeekday,
  dayKeyOf,
  monthGridCells,
  monthRange,
} from './calendar';

describe('month index round-tripping', () => {
  it('is a stable inverse', () => {
    for (const [y, m] of [
      [2026, 0],
      [2026, 11],
      [1999, 5],
      [2100, 2],
    ] as const) {
      const idx = monthIndex(y, m);
      expect(monthParts(idx)).toEqual({ year: y, month0: m });
    }
  });

  it('derives the month from a day key', () => {
    expect(monthParts(monthIndexOfKey('2026-07-15'))).toEqual({ year: 2026, month0: 6 });
    expect(monthParts(monthIndexOfKey('2026-01-01'))).toEqual({ year: 2026, month0: 0 });
  });
});

describe('daysInMonth', () => {
  it('handles 30/31 day months and leap Februaries', () => {
    expect(daysInMonth(2026, 0)).toBe(31); // Jan
    expect(daysInMonth(2026, 3)).toBe(30); // Apr
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026 (non-leap)
    expect(daysInMonth(2024, 1)).toBe(29); // Feb 2024 (leap)
  });
});

describe('firstWeekday', () => {
  it('matches known anchors (0 = Sunday)', () => {
    expect(firstWeekday(2026, 6)).toBe(3); // 2026-07-01 is a Wednesday
    expect(firstWeekday(2026, 0)).toBe(4); // 2026-01-01 is a Thursday
  });
});

describe('monthGridCells', () => {
  it('leads with blanks for the first weekday then lists every day', () => {
    const cells = monthGridCells(2026, 6); // July 2026, starts Wednesday (3 blanks)
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toBe('2026-07-01');
    expect(cells.length).toBe(3 + 31);
    expect(cells.at(-1)).toBe('2026-07-31');
  });

  it('produces zero-padded keys', () => {
    expect(dayKeyOf(2026, 0, 5)).toBe('2026-01-05');
  });
});

describe('monthRange', () => {
  it('is inclusive', () => {
    expect(monthRange(3, 6)).toEqual([3, 4, 5, 6]);
    expect(monthRange(5, 5)).toEqual([5]);
  });
});
