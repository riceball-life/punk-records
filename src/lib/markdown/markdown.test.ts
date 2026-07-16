import { describe, it, expect } from 'vitest';
import { renderMarkdown, toggleTask, continueList } from './markdown';

describe('renderMarkdown', () => {
  it('escapes HTML in user text', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toContain('&lt;script&gt;');
    expect(renderMarkdown('a & b')).toContain('a &amp; b');
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**hi**')).toContain('<strong>hi</strong>');
    expect(renderMarkdown('_hi_')).toContain('<em>hi</em>');
  });

  it('renders bullets', () => {
    expect(renderMarkdown('- milk')).toContain('md-bullet');
  });

  it('renders unchecked and checked tasks with their source line index', () => {
    const html = renderMarkdown('- [ ] todo\n- [x] done');
    expect(html).toContain('data-line="0"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('data-line="1"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('md-task done');
  });
});

describe('toggleTask', () => {
  it('checks an unchecked box and vice versa', () => {
    expect(toggleTask('- [ ] a', 0)).toBe('- [x] a');
    expect(toggleTask('- [x] a', 0)).toBe('- [ ] a');
  });

  it('targets the right line and leaves others alone', () => {
    expect(toggleTask('- [ ] a\n- [ ] b', 1)).toBe('- [ ] a\n- [x] b');
  });

  it('is a no-op on non-checkbox lines', () => {
    expect(toggleTask('just text', 0)).toBe('just text');
    expect(toggleTask('- bullet', 0)).toBe('- bullet');
  });
});

describe('continueList', () => {
  it('returns null when the caret is not on a list line', () => {
    expect(continueList('hello', 5)).toBeNull();
  });

  it('continues a bullet with a new bullet', () => {
    // caret at end of "- milk"
    expect(continueList('- milk', 6)).toEqual({ value: '- milk\n- ', caret: 9 });
  });

  it('continues a checkbox with a fresh unchecked checkbox', () => {
    const v = '- [x] done';
    const expected = '- [x] done\n- [ ] ';
    expect(continueList(v, v.length)).toEqual({ value: expected, caret: expected.length });
  });

  it('preserves indentation', () => {
    expect(continueList('  - a', 5)).toEqual({ value: '  - a\n  - ', caret: 10 });
  });

  it('ends the list when Enter is pressed on an empty item', () => {
    // "- " with caret right after the prefix → drop it, leaving a blank line
    expect(continueList('- ', 2)).toEqual({ value: '', caret: 0 });
    expect(continueList('- [ ] ', 6)).toEqual({ value: '', caret: 0 });
  });

  it('keeps earlier lines when ending a list', () => {
    const v = 'a\n- ';
    expect(continueList(v, v.length)).toEqual({ value: 'a\n', caret: 2 });
  });
});
