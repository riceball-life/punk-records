import { describe, it, expect } from 'vitest';
import { newMilestone, milestoneDayKey, milestonesByDay, type Milestone } from './types';

// milestoneDayKey derives the *local* calendar day, so build timestamps from local
// wall-clock components (not a fixed `Z` instant) to keep these assertions
// timezone-independent.
function localIso(y: number, mo: number, d: number, h: number, min = 0): string {
  return new Date(y, mo - 1, d, h, min).toISOString();
}

function at(text: string, iso: string): Milestone {
  return { ...newMilestone(text, 'b1'), loggedAt: iso };
}

describe('milestoneDayKey', () => {
  it('is the local day of loggedAt', () => {
    expect(milestoneDayKey(at('x', localIso(2026, 7, 17, 12)))).toBe('2026-07-17');
  });
});

describe('milestonesByDay', () => {
  it('groups by logged day, sorted by time within a day', () => {
    const list: Milestone[] = [
      at('later', localIso(2026, 7, 17, 20)),
      at('earlier', localIso(2026, 7, 17, 8)),
      at('other day', localIso(2026, 7, 16, 9)),
    ];
    const map = milestonesByDay(list);
    expect([...map.keys()].sort()).toEqual(['2026-07-16', '2026-07-17']);
    expect(map.get('2026-07-17')!.map((m) => m.text)).toEqual(['earlier', 'later']);
  });
});
