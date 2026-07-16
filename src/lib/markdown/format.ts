/**
 * Pure text transforms behind the formatting toolbar buttons. Each takes the
 * current value + selection and returns the new value and where to put the
 * caret. DOM-free so they're unit-testable.
 */

export interface Edit {
  value: string;
  caret: number;
}

/** Insert `prefix` at the start of the line that contains `caret` (e.g. "- [ ] "). */
export function insertLinePrefix(value: string, caret: number, prefix: string): Edit {
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  return {
    value: value.slice(0, lineStart) + prefix + value.slice(lineStart),
    caret: caret + prefix.length,
  };
}

/**
 * Wrap the selection in `marker` (e.g. "**"). With no selection, insert the
 * markers and drop the caret between them so the user can type.
 */
export function wrapSelection(value: string, start: number, end: number, marker: string): Edit {
  if (start === end) {
    return {
      value: value.slice(0, start) + marker + marker + value.slice(start),
      caret: start + marker.length,
    };
  }
  const selected = value.slice(start, end);
  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    caret: end + 2 * marker.length,
  };
}
