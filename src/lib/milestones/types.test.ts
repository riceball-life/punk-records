import { describe, it, expect } from 'vitest';
import { newMilestone, milestoneDayKey, milestonesByDay, type Milestone } from './types';

function at(text: string, iso: string): Milestone {
  return { ...newMilestone(text, 'b1'), loggedAt: iso };
}

describe('milestoneDayKey', () => {
  it('is the local day of loggedAt', () => {
    expect(milestoneDayKey(at('x', '2026-07-17T12:00:00.000Z'))).toBe('2026-07-17');
  });
});

describe('milestonesByDay', () => {
  it('groups by logged day, sorted by time within a day', () => {
    const list: Milestone[] = [
      at('later', '2026-07-17T20:00:00.000Z'),
      at('earlier', '2026-07-17T08:00:00.000Z'),
      at('other day', '2026-07-16T09:00:00.000Z'),
    ];
    const map = milestonesByDay(list);
    expect([...map.keys()].sort()).toEqual(['2026-07-16', '2026-07-17']);
    expect(map.get('2026-07-17')!.map((m) => m.text)).toEqual(['earlier', 'later']);
  });
});
