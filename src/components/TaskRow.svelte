<script lang="ts">
  import { tick } from 'svelte';

  // A checklist row whose text is *rendered* (selectable) until you click it to
  // edit — so selection can span multiple rows, and dragging (via the handle) is
  // never confused with a text cursor. Used by the journal + To-do checklists.
  let {
    id,
    text,
    done,
    accent = 'var(--today-tint)',
    meta = '',
    onToggle,
    onEdit,
  }: {
    id: string;
    text: string;
    done: boolean;
    accent?: string;
    meta?: string;
    onToggle: () => void;
    onEdit: (text: string) => void;
  } = $props();

  let editing = $state(false);
  // svelte-ignore state_referenced_locally
  let value = $state(text);
  let inputEl = $state<HTMLInputElement>();

  // Track external text changes while not editing.
  $effect(() => {
    if (!editing) value = text;
  });
  // Focus the field when entering edit mode.
  $effect(() => {
    if (editing && inputEl) {
      inputEl.focus();
      inputEl.setSelectionRange(value.length, value.length);
    }
  });

  async function startEdit(): Promise<void> {
    // A click that was actually a drag-selection leaves a selection — don't edit.
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    editing = true;
    await tick();
  }

  function commit(): void {
    editing = false;
    if (value !== text) onEdit(value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      value = text;
      (e.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div class="row" data-sortable-id={id}>
  <button
    class="check"
    class:done
    style="--row-accent: {accent}"
    onclick={onToggle}
    aria-pressed={done}
    aria-label={done ? 'Mark not done' : 'Mark done'}
  >
    {#if done}
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 12l4 4 10-11" />
      </svg>
    {/if}
  </button>

  {#if editing}
    <input
      bind:this={inputEl}
      class="text-input"
      class:done
      type="text"
      bind:value
      onblur={commit}
      onkeydown={onKeydown}
    />
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <span class="text" class:done onclick={startEdit}>{text}</span>
  {/if}

  {#if meta}
    <span class="meta">{meta}</span>
  {/if}

  <button class="handle" data-sortable-handle aria-label="Drag to reorder">
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
    </svg>
  </button>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 4px;
    border-bottom: 0.5px solid var(--separator);
  }

  .check {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1.8px solid color-mix(in srgb, var(--text-secondary) 60%, transparent);
    background: transparent;
    color: var(--accent-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    transition: background-color 0.12s ease, border-color 0.12s ease;
  }
  .check.done {
    background: var(--row-accent);
    border-color: var(--row-accent);
  }

  .text,
  .text-input {
    flex: 1;
    min-width: 0;
    color: var(--text);
    line-height: 1.4;
  }

  .text {
    cursor: text;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    user-select: text;
    -webkit-user-select: text;
  }

  .text-input {
    border: none;
    background: transparent;
    padding: 0;
    outline: none;
  }

  .text.done,
  .text-input.done {
    color: var(--text-secondary);
    text-decoration: line-through;
  }

  .meta {
    flex: none;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .handle {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    color: var(--text-placeholder);
    cursor: grab;
    padding: 0;
    touch-action: none; /* the sortable owns the gesture on the handle */
  }
  .handle:active {
    cursor: grabbing;
  }
</style>
