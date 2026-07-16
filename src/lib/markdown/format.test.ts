import { describe, it, expect } from 'vitest';
import { insertLinePrefix, wrapSelection } from './format';

describe('insertLinePrefix', () => {
  it('adds a checkbox prefix at the start of the caret line', () => {
    expect(insertLinePrefix('buy milk', 3, '- [ ] ')).toEqual({ value: '- [ ] buy milk', caret: 9 });
  });

  it('targets only the current line in a multi-line value', () => {
    const v = 'a\nb\nc';
    // caret on line "b" (index 2..3)
    expect(insertLinePrefix(v, 3, '- ')).toEqual({ value: 'a\n- b\nc', caret: 5 });
  });
});

describe('wrapSelection', () => {
  it('wraps a selection in the marker', () => {
    // wrap "milk" in "buy milk" (start 4, end 8)
    expect(wrapSelection('buy milk', 4, 8, '**')).toEqual({ value: 'buy **milk**', caret: 12 });
  });

  it('inserts empty markers with the caret between when nothing is selected', () => {
    expect(wrapSelection('ab', 1, 1, '**')).toEqual({ value: 'a****b', caret: 3 });
  });
});
