import type { CollectionRecord } from '../sync/collection';

/**
 * A Scratch note — freeform plain text, iOS-Notes style. Each note is its own
 * synced record in the `notes` collection. Title/preview are derived from the
 * text (first line = title, the rest = preview), so there's no separate title
 * field to keep in sync.
 */
export interface Note extends CollectionRecord {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export function newNote(): Note {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text: '', createdAt: now, updatedAt: now };
}

/** First non-empty line, trimmed — the note's display title. */
export function noteTitle(note: Note): string {
  for (const line of note.text.split('\n')) {
    const t = line.trim();
    if (t) return t;
  }
  return 'New Note';
}

/** The text after the title line, whitespace-collapsed — the list preview. */
export function notePreview(note: Note): string {
  const lines = note.text.split('\n');
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++; // skip to title line
  const rest = lines
    .slice(i + 1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return rest || 'No additional text';
}
