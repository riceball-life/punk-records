import { describe, it, expect } from 'vitest';
import {
  proteinIdFor,
  newProteinDay,
  proteinByDay,
  proteinLineText,
  foldProteinLine,
  type ProteinDay,
} from './types';

describe('proteinIdFor', () => {
  it('is deterministic per day', () => {
    expect(proteinIdFor('2026-07-22')).toBe('protein:2026-07-22');
    expect(proteinIdFor('2026-07-22')).toBe(proteinIdFor('2026-07-22'));
  });
});

describe('newProteinDay', () => {
  it('uses the deterministic id and clamps grams at 0', () => {
    const p = newProteinDay('2026-07-22', -5);
    expect(p.id).toBe('protein:2026-07-22');
    expect(p.day).toBe('2026-07-22');
    expect(p.grams).toBe(0);
    expect(p.createdAt).toBe(p.updatedAt);
  });

  it('defaults grams to 0', () => {
    expect(newProteinDay('2026-07-22').grams).toBe(0);
  });
});

describe('proteinByDay', () => {
  const rec = (day: string, grams: number, updatedAt: string): ProteinDay => ({
    id: proteinIdFor(day),
    day,
    grams,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt,
  });

  it('indexes one record per day', () => {
    const map = proteinByDay([
      rec('2026-07-22', 92, '2026-07-22T10:00:00.000Z'),
      rec('2026-07-21', 148, '2026-07-21T22:00:00.000Z'),
    ]);
    expect(map.size).toBe(2);
    expect(map.get('2026-07-22')?.grams).toBe(92);
    expect(map.get('2026-07-21')?.grams).toBe(148);
  });

  it('keeps the later-updated record when a day is duplicated', () => {
    const map = proteinByDay([
      rec('2026-07-22', 60, '2026-07-22T09:00:00.000Z'),
      rec('2026-07-22', 92, '2026-07-22T12:00:00.000Z'),
    ]);
    expect(map.get('2026-07-22')?.grams).toBe(92);
  });
});

describe('proteinLineText', () => {
  it('formats the line and adds ✓ only when the goal is met', () => {
    expect(proteinLineText(60, 150)).toBe('🍗 60 g protein');
    expect(proteinLineText(150, 150)).toBe('🍗 150 g protein ✓');
    expect(proteinLineText(160, 150)).toBe('🍗 160 g protein ✓');
  });
});

describe('foldProteinLine', () => {
  it('appends the line to an empty entry', () => {
    expect(foldProteinLine('', 60, 150)).toBe('🍗 60 g protein');
  });

  it('appends after existing prose without disturbing it', () => {
    expect(foldProteinLine('Felt strong today.', 60, 150)).toBe(
      'Felt strong today.\n🍗 60 g protein',
    );
  });

  it('updates the total in place instead of duplicating (idempotent shape)', () => {
    const once = foldProteinLine('Ran 5k.', 60, 150);
    const twice = foldProteinLine(once, 92, 150);
    expect(twice).toBe('Ran 5k.\n🍗 92 g protein');
    // Exactly one protein line remains.
    expect(twice.match(/🍗/g)?.length).toBe(1);
  });

  it('reflects a newly-met goal when re-folding the same text', () => {
    const under = foldProteinLine('', 140, 150);
    expect(under).toBe('🍗 140 g protein');
    expect(foldProteinLine(under, 150, 150)).toBe('🍗 150 g protein ✓');
  });

  it('removes the line entirely at a total of 0, preserving prose', () => {
    const withLine = foldProteinLine('Journal text.', 60, 150);
    expect(foldProteinLine(withLine, 0, 150)).toBe('Journal text.');
  });

  it('removes the line from a protein-only entry, leaving it empty', () => {
    const withLine = foldProteinLine('', 60, 150);
    expect(foldProteinLine(withLine, 0, 150)).toBe('');
  });
});
