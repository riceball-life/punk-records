import { describe, it, expect } from 'vitest';
import { buildArchiveByDay } from './entries';
import { newTask, type Task } from '../todos/types';
import { newMilestone, type Milestone } from '../milestones/types';

function doneTask(text: string, iso: string): Task {
  return { ...newTask(text), done: true, doneAt: iso };
}
function milestone(text: string, iso: string): Milestone {
  return { ...newMilestone(text, 'b1'), loggedAt: iso };
}

describe('buildArchiveByDay', () => {
  it('merges completed tasks + milestones into one per-day, time-sorted list', () => {
    const tasks = [doneTask('ran 5mi', '2026-07-17T07:00:00.000Z'), newTask('open')];
    const ms = [milestone('New PR: Bench 210', '2026-07-17T09:00:00.000Z')];

    const map = buildArchiveByDay(tasks, ms);
    const day = map.get('2026-07-17')!;
    expect(day.map((e) => [e.kind, e.text])).toEqual([
      ['task', 'ran 5mi'],
      ['milestone', 'New PR: Bench 210'],
    ]);
  });

  it('ignores open tasks and places entries on their own days', () => {
    const map = buildArchiveByDay(
      [doneTask('a', '2026-07-16T10:00:00.000Z')],
      [milestone('m', '2026-07-15T10:00:00.000Z')],
    );
    expect([...map.keys()].sort()).toEqual(['2026-07-15', '2026-07-16']);
    expect(map.get('2026-07-15')![0]!.kind).toBe('milestone');
  });
});
