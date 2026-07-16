/**
 * Tiny, safe markdown for journal entries. Entries stay plain text; this renders
 * a read-only view when a day isn't being edited. Deliberately minimal: bold,
 * italic, bullets, and tappable checkboxes — no HTML passthrough, no rich editor.
 */

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

/** Inline spans on an already-escaped string: **bold** and _italic_. */
function inline(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
}

const CHECKBOX = /^(\s*)- \[([ xX])\]\s?(.*)$/;
const BULLET = /^(\s*)- (.*)$/;

/**
 * Render entry text to a safe HTML string (all user text is escaped first).
 * Checkbox rows carry `data-line` so the UI can toggle the right source line.
 */
export function renderMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line, i) => {
      const cb = CHECKBOX.exec(line);
      if (cb) {
        const checked = cb[2]!.toLowerCase() === 'x';
        const content = inline(escapeHtml(cb[3]!)) || '<br>';
        return (
          `<div class="md-task${checked ? ' done' : ''}">` +
          `<span class="md-check" data-line="${i}" role="checkbox" aria-checked="${checked}"></span>` +
          `<span class="md-task-text">${content}</span></div>`
        );
      }
      const bullet = BULLET.exec(line);
      if (bullet) {
        return `<div class="md-bullet"><span class="md-dot">•</span><span>${inline(escapeHtml(bullet[2]!)) || '<br>'}</span></div>`;
      }
      if (line.trim() === '') return '<div class="md-line"><br></div>';
      return `<div class="md-line">${inline(escapeHtml(line))}</div>`;
    })
    .join('');
}

/** Flip the checkbox on the given source line; returns the new text (or the
 * original if that line isn't a checkbox). */
export function toggleTask(text: string, lineIndex: number): string {
  const lines = text.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return text;
  const m = /^(\s*- \[)([ xX])(\].*)$/.exec(line);
  if (!m) return text;
  lines[lineIndex] = `${m[1]}${m[2]!.toLowerCase() === 'x' ? ' ' : 'x'}${m[3]}`;
  return lines.join('\n');
}

/** Whether text contains any markdown we'd render differently than plain text. */
export function hasMarkdown(text: string): boolean {
  return /(\*\*.+?\*\*)|(_[^_\n]+_)|^\s*- /m.test(text);
}

export interface ListEdit {
  value: string;
  caret: number;
}

/**
 * Compute the Enter-key auto-continue edit for bullet/checkbox lists at `caret`,
 * or `null` if the caret's line isn't a list item. Continuing an item with
 * content starts the next item; pressing Enter on an *empty* item ends the list
 * (drops the prefix). Pure so it's unit-testable without a DOM.
 */
export function continueList(value: string, caret: number): ListEdit | null {
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  const beforeCaret = value.slice(lineStart, caret);
  const cb = /^(\s*)- \[[ xX]\] /.exec(beforeCaret);
  const bullet = cb ? null : /^(\s*)- /.exec(beforeCaret);
  if (!cb && !bullet) return null;

  const prefix = cb ? `${cb[1]}- [ ] ` : `${bullet![1]}- `;
  const lineEnd = value.indexOf('\n', caret);
  const afterCaret = value.slice(caret, lineEnd === -1 ? value.length : lineEnd);

  if (beforeCaret === prefix && afterCaret.trim() === '') {
    // Empty item → end the list.
    return { value: value.slice(0, lineStart) + value.slice(caret), caret: lineStart };
  }
  const insert = `\n${prefix}`;
  return { value: value.slice(0, caret) + insert + value.slice(caret), caret: caret + insert.length };
}
