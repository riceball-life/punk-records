<script lang="ts">
  import { untrack } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import CheckRow from './CheckRow.svelte';

  // A checklist: existing items as CheckRows plus a persistent "add" row at the
  // bottom (iOS Reminders style). Purely presentational — the parent owns the
  // data and the callbacks decide what a toggle/edit/add/delete means, so hub
  // reminders and the To-do section share this. Pass `onReorder` to enable
  // handle-based drag-to-reorder (To-do); omit it for a static list (reminders).
  interface Item {
    id: string;
    text: string;
    done: boolean;
    /** Optional right-aligned count badge (e.g. reminder miss-streak). */
    badge?: number;
    /** Optional small right-aligned label (e.g. a To-do's day). */
    meta?: string;
  }

  let {
    items,
    accent = 'var(--today-tint)',
    placeholder = 'New reminder',
    dndType = 'todo-inbox',
    onToggle,
    onEdit,
    onAdd,
    onDelete,
    onReorder,
  }: {
    items: Item[];
    accent?: string;
    placeholder?: string;
    /** Shared across lists that should allow dragging items between them. */
    dndType?: string;
    onToggle: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onAdd: (text: string) => void;
    onDelete: (id: string) => void;
    /** When provided, rows get a drag handle; called with the new id order on drop. */
    onReorder?: (orderedIds: string[]) => void;
  } = $props();

  const reorderable = $derived(!!onReorder);

  // Local order the dnd zone reorders live; re-synced from props unless mid-drag.
  // Preserves local order on same-id updates so a drop doesn't flicker back.
  // svelte-ignore state_referenced_locally
  let ordered = $state<Item[]>([...items]);
  let dragging = $state(false);
  let dragDisabled = $state(true);

  $effect(() => {
    const next = items;
    untrack(() => {
      if (!reorderable || dragging) {
        ordered = [...next];
        return;
      }
      const byId = new Map(next.map((t) => [t.id, t]));
      const sameIds = ordered.length === next.length && ordered.every((o) => byId.has(o.id));
      ordered = sameIds ? ordered.map((o) => byId.get(o.id)!) : [...next];
    });
  });

  function consider(e: CustomEvent<DndEvent<Item>>): void {
    dragging = true;
    ordered = e.detail.items;
  }
  function finalize(e: CustomEvent<DndEvent<Item>>): void {
    ordered = e.detail.items;
    dragging = false;
    dragDisabled = true;
    onReorder?.(ordered.map((t) => t.id));
  }

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
  {#if reorderable}
    <div
      class="rows"
      use:dndzone={{ items: ordered, dragDisabled, flipDurationMs: 150, type: dndType, dropTargetStyle: {} }}
      onconsider={consider}
      onfinalize={finalize}
    >
      {#each ordered as item (item.id)}
        <div class="item">
          <button
            class="handle"
            aria-label="Drag to reorder"
            onpointerdown={(e) => {
              e.preventDefault();
              dragDisabled = false;
            }}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
              <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
              <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
            </svg>
          </button>
          <div class="row-body">
            <CheckRow
              text={item.text}
              done={item.done}
              badge={item.badge ?? 0}
              meta={item.meta ?? ''}
              {accent}
              onToggle={() => onToggle(item.id)}
              onEdit={(text) => edited(item.id, text)}
            />
          </div>
        </div>
      {/each}
    </div>
  {:else}
    {#each items as item (item.id)}
      <CheckRow
        text={item.text}
        done={item.done}
        badge={item.badge ?? 0}
        meta={item.meta ?? ''}
        {accent}
        onToggle={() => onToggle(item.id)}
        onEdit={(text) => edited(item.id, text)}
      />
    {/each}
  {/if}

  <div class="row add" class:indented={reorderable}>
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

  .item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .handle {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    align-self: stretch;
    border: none;
    background: transparent;
    color: var(--text-placeholder);
    cursor: grab;
    padding: 0;
    touch-action: none;
  }
  .handle:active {
    cursor: grabbing;
  }

  .row-body {
    flex: 1;
    min-width: 0;
  }

  .row.add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 4px;
  }
  /* Align the add row's text with rows that have a drag handle. */
  .row.add.indented {
    padding-left: 28px;
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
