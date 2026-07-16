<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { EntryStore } from '../lib/entries/entryStore';
  import { formatHeader } from '../lib/date/format';
  import { renderMarkdown, toggleTask, continueList } from '../lib/markdown/markdown';

  let {
    date,
    today,
    store,
  }: { date: string; today: string; store: EntryStore } = $props();

  // Seed from the cache synchronously when available so the row renders at its
  // correct height on first paint (accurate landing / scroll anchoring).
  // svelte-ignore state_referenced_locally
  let text = $state(store.peek(date) ?? '');
  // Empty days open ready to type; days with content show the rendered view.
  // svelte-ignore state_referenced_locally
  let editing = $state((store.peek(date) ?? '').trim() === '');
  let textarea = $state<HTMLTextAreaElement>();
  let touched = false;

  const header = $derived(formatHeader(date, today));
  const html = $derived(renderMarkdown(text));

  onMount(async () => {
    if (store.peek(date) === undefined) {
      const loaded = await store.load(date);
      if (!touched && text === '') {
        text = loaded;
        editing = loaded.trim() === '';
      }
    }
    if (editing) {
      await tick();
      autosize();
    }
  });

  function autosize() {
    const el = textarea;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function onInput(e: Event) {
    // Read straight from the DOM so we persist the *current* value (avoids a
    // race with the binding that could restore the previous keystroke).
    touched = true;
    const value = (e.currentTarget as HTMLTextAreaElement).value;
    text = value;
    store.edit(date, value);
    autosize();
  }

  function onBlur() {
    void store.flush();
    // Non-empty → show the formatted view; empty → stay an open field.
    editing = text.trim() === '';
  }

  /** Enter continues a bullet/checkbox list; Enter on an empty item ends it. */
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return; // Shift+Enter = plain newline
    const el = e.currentTarget as HTMLTextAreaElement;
    const { selectionStart, selectionEnd, value } = el;
    if (selectionStart === null || selectionStart !== selectionEnd) return;

    const edit = continueList(value, selectionStart);
    if (!edit) return;

    e.preventDefault();
    el.value = edit.value;
    el.setSelectionRange(edit.caret, edit.caret);
    touched = true;
    text = edit.value;
    store.edit(date, edit.value);
    autosize();
  }

  async function enterEdit() {
    touched = true;
    editing = true;
    await tick();
    textarea?.focus();
    autosize();
  }

  function onRenderedClick(e: MouseEvent) {
    const check = (e.target as HTMLElement).closest<HTMLElement>('.md-check');
    if (check) {
      // Tap a checkbox: toggle just that line, save, stay in the view.
      const line = Number(check.dataset.line);
      const next = toggleTask(text, line);
      if (next !== text) {
        text = next;
        store.edit(date, next);
        void store.flush();
      }
      return;
    }
    void enterEdit();
  }

  function onRenderedKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void enterEdit();
    }
  }
</script>

<section class="day" data-date={date} class:is-today={header.isToday}>
  <header class="day-header">
    <span class="label">{header.label}</span>
    <span class="date">{header.dateStr}</span>
  </header>
  {#if editing}
    <textarea
      bind:this={textarea}
      value={text}
      oninput={onInput}
      onkeydown={onKeydown}
      onblur={onBlur}
      placeholder={header.isToday ? 'Write about today…' : 'Add a note…'}
      rows="1"
      spellcheck="true"
      autocapitalize="sentences"
    ></textarea>
  {:else}
    <!-- Rendered markdown; click to edit, tap a checkbox to toggle it. -->
    <div
      class="rendered"
      role="button"
      tabindex="0"
      onclick={onRenderedClick}
      onkeydown={onRenderedKeydown}
    >
      {@html html}
    </div>
  {/if}
</section>

<style>
  .day {
    padding: 14px 20px 18px;
    border-bottom: 0.5px solid var(--separator);
  }

  .day-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
  }

  .label {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .is-today .label {
    color: var(--today-tint);
  }

  .date {
    font-size: 13px;
    color: var(--text-secondary);
  }

  textarea {
    display: block;
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    padding: 0;
    margin: 0;
    line-height: 1.45;
    overflow: hidden; /* height is managed by autosize() */
    -webkit-font-smoothing: inherit;
  }

  textarea::placeholder {
    color: var(--text-placeholder);
  }

  .rendered {
    line-height: 1.45;
    cursor: text;
    outline: none;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  /* :global — these classes live inside {@html} rendered markup. */
  .rendered :global(.md-line) {
    white-space: pre-wrap;
    min-height: 1.45em;
  }

  .rendered :global(strong) {
    font-weight: 700;
  }

  .rendered :global(em) {
    font-style: italic;
  }

  .rendered :global(.md-bullet) {
    display: flex;
    gap: 8px;
  }

  .rendered :global(.md-dot) {
    color: var(--text-secondary);
    flex: none;
  }

  .rendered :global(.md-task) {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .rendered :global(.md-check) {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    border: 1.5px solid var(--text-secondary);
    border-radius: 5px;
    position: relative;
    cursor: pointer;
    box-sizing: border-box;
  }

  .rendered :global(.md-task.done .md-check) {
    background: var(--today-tint);
    border-color: var(--today-tint);
  }

  .rendered :global(.md-task.done .md-check)::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: solid var(--accent-text);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .rendered :global(.md-task.done .md-task-text) {
    color: var(--text-secondary);
    text-decoration: line-through;
  }
</style>
