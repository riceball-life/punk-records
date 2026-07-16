import { describe, it, expect } from 'vitest';
import { formatHeader } from './format';

const TODAY = '2026-07-15';

describe('formatHeader relative labels', () => {
  it('labels today / yesterday / tomorrow', () => {
    expect(formatHeader('2026-07-15', TODAY)).toMatchObject({ label: 'Today', diff: 0, isToday: true });
    expect(formatHeader('2026-07-14', TODAY)).toMatchObject({ label: 'Yesterday', diff: -1, isToday: false });
    expect(formatHeader('2026-07-16', TODAY)).toMatchObject({ label: 'Tomorrow', diff: 1, isToday: false });
  });

  it('uses the weekday name beyond ±1 day', () => {
    const h = formatHeader('2026-07-20', TODAY); // a Monday
    expect(h.label).toBe(h.weekday);
    expect(h.isToday).toBe(false);
    expect(h.diff).toBe(5);
  });
});

describe('formatHeader date string', () => {
  it('includes the day number', () => {
    expect(formatHeader('2026-07-15', TODAY).dateStr).toMatch(/15/);
  });

  it('adds the year only when it differs from the current year', () => {
    expect(formatHeader('2026-03-10', TODAY).dateStr).not.toMatch(/2026/);
    expect(formatHeader('2025-03-10', TODAY).dateStr).toMatch(/2025/);
  });
});
