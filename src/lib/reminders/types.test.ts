import { describe, it, expect } from 'vitest';
import { newReminder, isDoneOn, missCount, markDone, markUndone, type Reminder } from './types';

// A reminder created on `createdDay` (local), optionally last done on a day.
function make(createdDay: string, lastDoneDate: string | null = null): Reminder {
  return {
    ...newReminder('habit'),
    createdAt: `${createdDay}T12:00:00.000Z`,
    lastDoneDate,
  };
}

describe('isDoneOn', () => {
  it('is done only on the last-done day', () => {
    const r = make('2026-07-10', '2026-07-16');
    expect(isDoneOn(r, '2026-07-16')).toBe(true);
    // A new day → automatically not done (the daily reset).
    expect(isDoneOn(r, '2026-07-17')).toBe(false);
  });
});

describe('missCount', () => {
  it('is 0 on the creation day when never done', () => {
    const r = make('2026-07-16');
    expect(missCount(r, '2026-07-16')).toBe(0);
  });

  it('counts full elapsed days undone since creation', () => {
    const r = make('2026-07-16'); // never done
    expect(missCount(r, '2026-07-17')).toBe(1); // missed the 16th
    expect(missCount(r, '2026-07-18')).toBe(2); // missed 16th + 17th
  });

  it('is 0 the day after it was done, then climbs again', () => {
    const r = make('2026-07-01', '2026-07-16'); // done on the 16th
    expect(missCount(r, '2026-07-16')).toBe(0); // done today
    expect(missCount(r, '2026-07-17')).toBe(0); // done yesterday → nothing missed yet
    expect(missCount(r, '2026-07-18')).toBe(1); // missed the 17th
    expect(missCount(r, '2026-07-20')).toBe(3); // missed 17,18,19
  });
});

describe('markDone / markUndone', () => {
  it('completing today clears the streak; undo restores the prior done-date', () => {
    const r = make('2026-07-01', '2026-07-14'); // last done the 14th
    expect(missCount(r, '2026-07-17')).toBe(2); // missed 15,16

    const done = markDone(r, '2026-07-17');
    expect(isDoneOn(done, '2026-07-17')).toBe(true);
    expect(missCount(done, '2026-07-17')).toBe(0);

    // Accidental un-check the same day → back to the pre-completion state.
    const undone = markUndone(done);
    expect(isDoneOn(undone, '2026-07-17')).toBe(false);
    expect(undone.lastDoneDate).toBe('2026-07-14');
    expect(missCount(undone, '2026-07-17')).toBe(2);
  });
});
