import { describe, it, expect } from 'vitest';
import {
  newTask,
  markTaskDone,
  markTaskOpen,
  taskDate,
  tasksByDay,
  taskCategory,
  distinctTaskCategories,
  groupTasksByCategory,
  type Task,
} from './types';

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

  it('preserves the task’s home date across done/open', () => {
    const t = newTask('reps', '2026-07-15', 0);
    expect(markTaskDone(t).date).toBe('2026-07-15');
    expect(markTaskOpen(markTaskDone(t)).date).toBe('2026-07-15');
  });
});

describe('taskDate', () => {
  it('is null for an open, undated (inbox) task', () => {
    expect(taskDate(newTask('x'))).toBeNull();
  });
  it('falls back to the completion day for a done, undated task', () => {
    const t = { ...newTask('x'), done: true, doneAt: '2026-07-16T12:00:00.000Z' };
    expect(taskDate(t)).toBe('2026-07-16');
  });
  it('uses the explicit date when set, even after completion elsewhere', () => {
    const t = { ...newTask('x', '2026-07-15'), done: true, doneAt: '2026-07-17T12:00:00.000Z' };
    expect(taskDate(t)).toBe('2026-07-15');
  });
  it('tolerates legacy records missing date/order', () => {
    const legacy = { ...newTask('x'), done: true, doneAt: '2026-07-10T09:00:00.000Z' } as Task;
    delete (legacy as Partial<Task>).date;
    expect(taskDate(legacy)).toBe('2026-07-10');
  });
});

describe('tasksByDay', () => {
  it('groups by home day, skips unscheduled, sorts by order then createdAt', () => {
    const dated = (text: string, date: string, order: number, createdAt: string): Task => ({
      ...newTask(text, date, order),
      createdAt,
    });
    const tasks: Task[] = [
      dated('b', '2026-07-15', 1, '1'),
      dated('a', '2026-07-15', 0, '2'),
      dated('c', '2026-07-16', 0, '3'),
      newTask('inbox'), // undated, open → skipped
    ];
    const map = tasksByDay(tasks);
    expect([...map.keys()].sort()).toEqual(['2026-07-15', '2026-07-16']);
    expect(map.get('2026-07-15')!.map((t) => t.text)).toEqual(['a', 'b']); // by order
  });
});

describe('taskCategory / distinctTaskCategories', () => {
  it('normalizes and lists distinct non-empty categories, sorted', () => {
    const withCat = (cat: string): Task => ({ ...newTask('x'), category: cat });
    const tasks = [withCat('Work'), withCat(' home '), withCat('Work'), withCat('')];
    expect(taskCategory(withCat(' home '))).toBe('home');
    // localeCompare is case-insensitive: 'home' sorts before 'Work'.
    expect(distinctTaskCategories(tasks)).toEqual(['home', 'Work']);
  });
});

describe('groupTasksByCategory', () => {
  const inCat = (text: string, category: string, inboxOrder: number): Task => ({
    ...newTask(text),
    category,
    inboxOrder,
  });

  it('groups A–Z with "Other" last, items by inbox order', () => {
    const tasks = [
      inCat('deploy', 'Work', 1),
      inCat('milk', '', 0),
      inCat('run', 'Health', 0),
      inCat('email', 'Work', 0),
    ];
    const groups = groupTasksByCategory(tasks);
    expect(groups.map((g) => g.label)).toEqual(['Health', 'Work', 'Other']);
    expect(groups[1]!.items.map((t) => t.text)).toEqual(['email', 'deploy']); // by inboxOrder
  });

  it('seeds empty groups for extra (just-created) categories', () => {
    const groups = groupTasksByCategory([], ['Errands']);
    expect(groups.map((g) => g.category)).toEqual(['Errands']);
    expect(groups[0]!.items).toEqual([]);
  });
});
