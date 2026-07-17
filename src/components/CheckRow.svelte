<script lang="ts">
  // One checkbox row: a tappable circle + inline-editable single-line text.
  // Data-source-agnostic so both hub reminders and the To-do section reuse it.
  // Clearing the text and blurring deletes the row (iOS-Reminders behavior).
  let {
    text,
    done,
    accent = 'var(--today-tint)',
    badge = 0,
    meta = '',
    onToggle,
    onEdit,
    onEnter,
  }: {
    text: string;
    done: boolean;
    accent?: string;
    /** Optional right-aligned count (e.g. reminder miss-streak). Hidden when < 1. */
    badge?: number;
    /** Optional small right-aligned label (e.g. a To-do's day). */
    meta?: string;
    onToggle: () => void;
    onEdit: (text: string) => void;
    onEnter?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(text);
  let focused = $state(false);
  // Reflect external changes (e.g. a sync pull) unless the user is mid-edit.
  $effect(() => {
    if (!focused) value = text;
  });

  function commit(): void {
    focused = false;
    if (value !== text) onEdit(value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
      onEnter?.();
    }
  }
</script>

<div class="row">
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
  <input
    class="text"
    class:done
    type="text"
    bind:value
    onfocus={() => (focused = true)}
    onblur={commit}
    onkeydown={onKeydown}
  />
  {#if meta}
    <span class="meta">{meta}</span>
  {/if}
  {#if badge >= 1}
    <span class="badge" aria-label="{badge} days missed">{badge}</span>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 4px;
    border-bottom: 0.5px solid var(--separator);
  }

  .meta {
    flex: none;
    font-size: 12px;
    color: var(--text-secondary);
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

  .text {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 0;
    outline: none;
  }

  .text.done {
    color: var(--text-secondary);
    text-decoration: line-through;
  }

  .badge {
    flex: none;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ff453a;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }
</style>
