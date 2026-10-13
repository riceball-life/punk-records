import { describe, it, expect } from 'vitest';
import {
  newReminder,
  isDoneOn,
  missCount,
  markDone,
  markUndone,
  periodIndex,
  foldGoalLine,
  type Cadence,
  type Reminder,
} from './types';

// A reminder created on `createdDay` (local), optionally last done on a day.
function make(createdDay: string, lastDoneDate: string | null = null, cadence: Cadence = 'daily'): Reminder {
  return {
    ...newReminder('habit', cadence),
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

describe('periodIndex', () => {
  it('groups a Mon–Sun week together (2026-07-13 is a Monday)', () => {
    const mon = periodIndex('2026-07-13', 'weekly');
    expect(periodIndex('2026-07-19', 'weekly')).toBe(mon); // same-week Sunday
    expect(periodIndex('2026-07-20', 'weekly')).toBe(mon + 1); // next Monday
    expect(periodIndex('2026-07-12', 'weekly')).toBe(mon - 1); // prior Sunday
  });

  it('groups a calendar month together', () => {
    const jul = periodIndex('2026-07-01', 'monthly');
    expect(periodIndex('2026-07-31', 'monthly')).toBe(jul);
    expect(periodIndex('2026-08-01', 'monthly')).toBe(jul + 1);
  });
});

describe('isDoneOn across cadences', () => {
  it('weekly stays done through its week, resets the next', () => {
    const r = make('2026-07-01', '2026-07-15', 'weekly'); // Wed of the 13th–19th week
    expect(isDoneOn(r, '2026-07-19')).toBe(true); // same-week Sunday
    expect(isDoneOn(r, '2026-07-20')).toBe(false); // next Monday → reset
  });

  it('monthly stays done through its month, resets the next', () => {
    const r = make('2026-07-01', '2026-07-05', 'monthly');
    expect(isDoneOn(r, '2026-07-28')).toBe(true);
    expect(isDoneOn(r, '2026-08-01')).toBe(false);
  });
});

describe('foldGoalLine', () => {
  it('adds a ✓ line when checked (empty and non-empty entry)', () => {
    expect(foldGoalLine('', 'workout', true)).toBe('✓ workout');
    expect(foldGoalLine('had lunch', 'workout', true)).toBe('had lunch\n✓ workout');
  });

  it('removes its ✓ line when unchecked, leaving other text intact', () => {
    expect(foldGoalLine('had lunch\n✓ workout', 'workout', false)).toBe('had lunch');
    expect(foldGoalLine('note\n✓ run\nmore', 'run', false)).toBe('note\nmore');
  });

  it('does not duplicate on re-check (strip then append once)', () => {
    expect(foldGoalLine('had lunch\n✓ workout', 'workout', true)).toBe('had lunch\n✓ workout');
  });

  it('is a no-op for a blank goal', () => {
    expect(foldGoalLine('kept', '   ', true)).toBe('kept');
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
