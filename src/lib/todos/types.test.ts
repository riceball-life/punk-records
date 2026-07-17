import { describe, it, expect } from 'vitest';
import {
  newTask,
  markTaskDone,
  markTaskOpen,
  completedDayKey,
  completedByDay,
  type Task,
} from './types';

function doneOn(text: string, iso: string): Task {
  return { ...newTask(text), done: true, doneAt: iso };
}

describe('markTaskDone / markTaskOpen', () => {
  it('done stamps a completion instant; open clears it', () => {
    const t = newTask('ship it');
    expect(t.done).toBe(false);
    expect(t.doneAt).toBeNull();

    const done = markTaskDone(t);
    expect(done.done).toBe(true);
    expect(done.doneAt).not.toBeNull();

    const open = markTaskOpen(done);
    expect(open.done).toBe(false);
    expect(open.doneAt).toBeNull();
  });
});

describe('completedDayKey', () => {
  it('is null while open, and the local day once done', () => {
    expect(completedDayKey(newTask('x'))).toBeNull();
    // Midday UTC avoids timezone edge flakiness for the date portion.
    expect(completedDayKey(doneOn('x', '2026-07-16T12:00:00.000Z'))).toBe('2026-07-16');
  });
});

describe('completedByDay', () => {
  it('buckets completed tasks by day and ignores open ones', () => {
    const tasks: Task[] = [
      doneOn('a', '2026-07-16T09:00:00.000Z'),
      doneOn('b', '2026-07-16T20:00:00.000Z'),
      doneOn('c', '2026-07-17T10:00:00.000Z'),
      newTask('still open'),
    ];
    const map = completedByDay(tasks);
    expect([...map.keys()].sort()).toEqual(['2026-07-16', '2026-07-17']);
    expect(map.get('2026-07-16')!.map((t) => t.text)).toEqual(['a', 'b']); // sorted by time
    expect(map.get('2026-07-17')!).toHaveLength(1);
  });
});
