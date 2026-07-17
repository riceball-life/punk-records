import { describe, it, expect } from 'vitest';
import { newNote, noteTitle, notePreview, type Note } from './types';

function note(text: string): Note {
  return { ...newNote(), text };
}

describe('noteTitle', () => {
  it('uses the first non-empty line', () => {
    expect(noteTitle(note('Groceries\nmilk\neggs'))).toBe('Groceries');
    expect(noteTitle(note('\n\n  Trip plan  \nx'))).toBe('Trip plan');
  });
  it('falls back to "New Note" when blank', () => {
    expect(noteTitle(note(''))).toBe('New Note');
    expect(noteTitle(note('   \n  '))).toBe('New Note');
  });
});

describe('notePreview', () => {
  it('collapses the text after the title line', () => {
    expect(notePreview(note('Groceries\nmilk\neggs'))).toBe('milk eggs');
  });
  it('reports when there is no body', () => {
    expect(notePreview(note('Just a title'))).toBe('No additional text');
    expect(notePreview(note(''))).toBe('No additional text');
  });
});
