import { describe, it, expect } from 'vitest';
import {
  isValidDayKey,
  toDayKey,
  todayKey,
  dayIndex,
  dayKeyFromIndex,
  addDays,
  daysBetween,
  compareDayKeys,
} from './dateUtils';

describe('toDayKey / todayKey', () => {
  it('formats local calendar components with zero-padding', () => {
    // Constructed in local time; read back in local time → TZ-independent round trip.
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan 5
    expect(toDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('todayKey uses the injected clock', () => {
    expect(todayKey(new Date(2026, 6, 15))).toBe('2026-07-15');
  });
});

describe('isValidDayKey', () => {
  it('accepts real dates including leap day', () => {
    expect(isValidDayKey('2026-07-15')).toBe(true);
    expect(isValidDayKey('2024-02-29')).toBe(true); // 2024 is a leap year
  });

  it('rejects malformed strings', () => {
    for (const bad of ['2026-7-15', '2026/07/15', '20260715', 'not-a-date', '', '2026-07-15T00:00']) {
      expect(isValidDayKey(bad)).toBe(false);
    }
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDayKey('2026-02-30')).toBe(false);
    expect(isValidDayKey('2026-13-01')).toBe(false);
    expect(isValidDayKey('2026-00-10')).toBe(false);
    expect(isValidDayKey('2025-02-29')).toBe(false); // 2025 is not a leap year
  });
});

describe('dayIndex / dayKeyFromIndex', () => {
  it('is the exact inverse across a wide range', () => {
    for (let i = -20_000; i <= 20_000; i += 137) {
      expect(dayIndex(dayKeyFromIndex(i))).toBe(i);
    }
  });

  it('anchors the epoch correctly', () => {
    expect(dayIndex('1970-01-01')).toBe(0);
    expect(dayKeyFromIndex(0)).toBe('1970-01-01');
  });

  it('throws on an invalid key', () => {
    expect(() => dayIndex('2026-02-30')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29'); // leap
  });

  it('stays exactly one day apart across a DST spring-forward', () => {
    // US DST began 2026-03-08 (a 23-hour local day). UTC-based math must ignore it.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-03-09', '2026-03-07')).toBe(2);
  });
});

describe('daysBetween / compareDayKeys', () => {
  it('measures signed whole-day differences', () => {
    expect(daysBetween('2026-07-15', '2026-07-15')).toBe(0);
    expect(daysBetween('2026-07-20', '2026-07-15')).toBe(5);
    expect(daysBetween('2026-07-10', '2026-07-15')).toBe(-5);
  });

  it('sorts chronologically ascending', () => {
    const keys = ['2026-07-15', '2024-02-29', '2026-01-01', '2025-12-31'];
    expect([...keys].sort(compareDayKeys)).toEqual([
      '2024-02-29',
      '2025-12-31',
      '2026-01-01',
      '2026-07-15',
    ]);
  });
});
