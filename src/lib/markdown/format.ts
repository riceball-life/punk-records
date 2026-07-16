/**
 * Pure text transforms behind the formatting toolbar buttons. Each takes the
 * current value + selection and returns the new value and where to put the
 * caret. They *toggle*: applying twice removes the formatting. DOM-free so
 * they're unit-testable.
 */

export interface Edit {
  value: string;
  caret: number;
}

const CHECK_PREFIX = /^(\s*)- \[[ xX]\] /;
const BULLET_PREFIX = /^(\s*)- (?!\[[ xX]\] )/; // "- " not starting a checkbox

function lineStartAt(value: string, caret: number): number {
  return value.lastIndexOf('\n', caret - 1) + 1;
}

function removePrefix(value: string, lineStart: number, len: number, caret: number): Edit {
  return {
    value: value.slice(0, lineStart) + value.slice(lineStart + len),
    caret: Math.max(lineStart, caret - len),
  };
}

function addPrefix(value: string, lineStart: number, prefix: string, caret: number): Edit {
  return { value: value.slice(0, lineStart) + prefix + value.slice(lineStart), caret: caret + prefix.length };
}

/** Toggle a checklist item on the caret's line (adds `- [ ] `, or removes an
 * existing `- [ ]`/`- [x]`). */
export function toggleChecklist(value: string, caret: number): Edit {
  const ls = lineStartAt(value, caret);
  const m = CHECK_PREFIX.exec(value.slice(ls));
  return m ? removePrefix(value, ls, m[0].length, caret) : addPrefix(value, ls, '- [ ] ', caret);
}

/** Toggle a plain bullet on the caret's line (leaves checkboxes alone). */
export function toggleBullet(value: string, caret: number): Edit {
  const ls = lineStartAt(value, caret);
  const m = BULLET_PREFIX.exec(value.slice(ls));
  return m ? removePrefix(value, ls, m[0].length, caret) : addPrefix(value, ls, '- ', caret);
}

/**
 * Toggle wrapping the selection in `marker` (e.g. "**"). Unwraps when the
 * markers already surround the selection, or when the caret sits inside an
 * empty pair; otherwise wraps (empty selection → caret between the markers).
 */
export function toggleWrap(value: string, start: number, end: number, marker: string): Edit {
  const m = marker.length;
  // Markers immediately outside the selection (or an empty caret between a pair).
  if (value.slice(start - m, start) === marker && value.slice(end, end + m) === marker) {
    return {
      value: value.slice(0, start - m) + value.slice(start, end) + value.slice(end + m),
      caret: start === end ? start - m : end - m,
    };
  }
  // Selection itself includes the surrounding markers.
  if (start !== end && value.slice(start, start + m) === marker && value.slice(end - m, end) === marker && end - start >= 2 * m) {
    return { value: value.slice(0, start) + value.slice(start + m, end - m) + value.slice(end), caret: end - 2 * m };
  }
  if (start === end) {
    return { value: value.slice(0, start) + marker + marker + value.slice(start), caret: start + m };
  }
  return { value: value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end), caret: end + 2 * m };
}
