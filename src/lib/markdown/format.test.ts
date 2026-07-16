import { describe, it, expect } from 'vitest';
import { toggleChecklist, toggleBullet, toggleWrap } from './format';

describe('toggleChecklist', () => {
  it('adds a checkbox to a plain line', () => {
    expect(toggleChecklist('buy milk', 3)).toEqual({ value: '- [ ] buy milk', caret: 9 });
  });

  it('removes an existing checkbox (unchecked or checked)', () => {
    expect(toggleChecklist('- [ ] buy milk', 9)).toEqual({ value: 'buy milk', caret: 3 });
    expect(toggleChecklist('- [x] done', 8)).toEqual({ value: 'done', caret: 2 });
  });

  it('targets only the caret line', () => {
    expect(toggleChecklist('a\nb', 3)).toEqual({ value: 'a\n- [ ] b', caret: 9 });
  });
});

describe('toggleBullet', () => {
  it('adds and removes a plain bullet', () => {
    expect(toggleBullet('milk', 4)).toEqual({ value: '- milk', caret: 6 });
    expect(toggleBullet('- milk', 6)).toEqual({ value: 'milk', caret: 4 });
  });

  it('leaves checkbox lines alone (adds a bullet rather than stripping the dash)', () => {
    // "- [ ] x" is a checkbox, not a plain bullet → bullet button adds "- "
    expect(toggleBullet('- [ ] x', 6).value).toBe('- - [ ] x');
  });
});

describe('toggleWrap', () => {
  it('wraps a selection and unwraps it on re-toggle', () => {
    expect(toggleWrap('buy milk', 4, 8, '**')).toEqual({ value: 'buy **milk**', caret: 12 });
    // selection now includes the markers "**milk**" (4..12)
    expect(toggleWrap('buy **milk**', 4, 12, '**')).toEqual({ value: 'buy milk', caret: 8 });
  });

  it('unwraps when markers sit just outside the selection', () => {
    expect(toggleWrap('buy **milk**', 6, 10, '**')).toEqual({ value: 'buy milk', caret: 8 });
  });

  it('inserts an empty pair, and a second toggle removes it', () => {
    expect(toggleWrap('ab', 1, 1, '**')).toEqual({ value: 'a****b', caret: 3 });
    // caret between the empty pair at index 3
    expect(toggleWrap('a****b', 3, 3, '**')).toEqual({ value: 'ab', caret: 1 });
  });
});
