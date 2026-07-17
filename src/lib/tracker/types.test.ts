import { describe, it, expect } from 'vitest';
import {
  newBenchmark,
  formatValue,
  defaultMilestoneText,
  groupByCategory,
  distinctCategories,
  type Benchmark,
} from './types';

function bench(name: string, value: string, unit: string): Benchmark {
  return { ...newBenchmark(), name, value, unit };
}

function categorized(name: string, category: string, createdAt: string): Benchmark {
  return { ...newBenchmark(), name, category, createdAt };
}

describe('formatValue', () => {
  it('appends the unit when present, omits it otherwise', () => {
    expect(formatValue('205', 'lbs')).toBe('205 lbs');
    expect(formatValue('7:30', '')).toBe('7:30');
    expect(formatValue(' 18 ', ' reps ')).toBe('18 reps');
  });
});

describe('defaultMilestoneText', () => {
  it('composes "New PR: name new, up from old" with units', () => {
    expect(defaultMilestoneText(bench('Bench Press', '210', 'lbs'), '205')).toBe(
      'New PR: Bench Press 210 lbs, up from 205 lbs',
    );
  });
  it('works without a unit', () => {
    expect(defaultMilestoneText(bench('Mile', '7:15', ''), '7:30')).toBe(
      'New PR: Mile 7:15, up from 7:30',
    );
  });
});

describe('distinctCategories', () => {
  it('returns sorted unique non-empty categories', () => {
    const list = [
      categorized('a', 'Strength', '1'),
      categorized('b', 'Cardio', '2'),
      categorized('c', 'Strength', '3'),
      categorized('d', '', '4'),
    ];
    expect(distinctCategories(list)).toEqual(['Cardio', 'Strength']);
  });
});

describe('groupByCategory', () => {
  it('groups A–Z with uncategorized ("Other") last, add-order within a group', () => {
    const list = [
      categorized('Squat', 'Strength', '2'),
      categorized('Walk', '', '1'),
      categorized('Mile', 'Cardio', '3'),
      categorized('Bench', 'Strength', '1'),
    ];
    const groups = groupByCategory(list);
    expect(groups.map((g) => g.label)).toEqual(['Cardio', 'Strength', 'Other']);
    // Strength group keeps createdAt order: Bench (1) before Squat (2).
    expect(groups[1]!.items.map((b) => b.name)).toEqual(['Bench', 'Squat']);
  });

  it('tolerates records saved before categories existed', () => {
    const legacy = { ...newBenchmark(), name: 'Old' } as Benchmark;
    delete (legacy as Partial<Benchmark>).category;
    const groups = groupByCategory([legacy]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe('Other');
  });
});
