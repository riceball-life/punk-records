<script lang="ts">
  import CheckRow from './CheckRow.svelte';

  // A checklist: existing items as CheckRows plus a persistent "add" row at the
  // bottom (iOS Reminders style). Purely presentational — the parent owns the
  // data and the callbacks decide what a toggle/edit/add/delete means, so hub
  // reminders and the To-do section share this.
  interface Item {
    id: string;
    text: string;
    done: boolean;
    /** Optional right-aligned count badge (e.g. reminder miss-streak). */
    badge?: number;
  }

  let {
    items,
    accent = 'var(--today-tint)',
    placeholder = 'New reminder',
    onToggle,
    onEdit,
    onAdd,
    onDelete,
  }: {
    items: Item[];
    accent?: string;
    placeholder?: string;
    onToggle: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onAdd: (text: string) => void;
    onDelete: (id: string) => void;
  } = $props();

  let draft = $state('');

  function edited(id: string, text: string): void {
    if (text.trim() === '') onDelete(id);
    else onEdit(id, text);
  }

  function addFromDraft(): void {
    const text = draft.trim();
    if (text === '') return;
    onAdd(text);
    draft = '';
  }

  function onDraftKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFromDraft();
    }
  }
</script>

<div class="list">
  {#each items as item (item.id)}
    <CheckRow
      text={item.text}
      done={item.done}
      badge={item.badge ?? 0}
      {accent}
      onToggle={() => onToggle(item.id)}
      onEdit={(text) => edited(item.id, text)}
    />
  {/each}

  <div class="row add">
    <span class="plus" style="--row-accent: {accent}" aria-hidden="true">+</span>
    <input
      class="text"
      type="text"
      {placeholder}
      bind:value={draft}
      onkeydown={onDraftKeydown}
      onblur={addFromDraft}
    />
  </div>
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
  }

  .row.add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 4px;
  }

  .plus {
    flex: none;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    line-height: 1;
    color: var(--row-accent);
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

  .text::placeholder {
    color: var(--text-placeholder);
  }
</style>
