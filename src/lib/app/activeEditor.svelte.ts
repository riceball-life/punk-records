/**
 * Tracks the day textarea currently being edited so a single global formatting
 * toolbar can act on it. `apply` writes a new value + caret back through the
 * owning DayRow (updating its state, autosave, and autosize).
 */
export interface ActiveEditor {
  textarea: HTMLTextAreaElement;
  apply: (value: string, caret: number) => void;
}

export const active = $state<{ editor: ActiveEditor | null }>({ editor: null });
