<script lang="ts">
  import { untrack } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import CheckRow from './CheckRow.svelte';
  import type { Task } from '../lib/todos/types';

  let {
    date,
    tasks,
    onAdd,
    onToggle,
    onEdit,
    onDelete,
    onReorder,
  }: {
    date: string;
    tasks: Task[];
    onAdd: (text: string) => void;
    onToggle: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    onReorder: (orderedIds: string[]) => void;
  } = $props();

  // Local copy the dnd zone reorders live; re-synced from props unless mid-drag.
  // svelte-ignore state_referenced_locally
  let ordered = $state<Task[]>([...tasks]);
  let dragging = $state(false);
  // Handle-initiated drag: rows aren't draggable until a grip is grabbed, so the
  // text inputs stay editable.
  let dragDisabled = $state(true);

  // Re-sync from props when tasks change, but PRESERVE the current local order so
  // a just-dropped reorder doesn't flicker back before the reload lands. Same ids
  // → keep order, refresh objects (so done/text edits show); ids added/removed →
  // take the incoming order. `untrack` keeps this from depending on `ordered`
  // (which it also writes), avoiding a reactive loop.
  $effect(() => {
    const next = tasks;
    untrack(() => {
      if (dragging) return;
      const byId = new Map(next.map((t) => [t.id, t]));
      const sameIds = ordered.length === next.length && ordered.every((o) => byId.has(o.id));
      ordered = sameIds ? ordered.map((o) => byId.get(o.id)!) : [...next];
    });
  });

  function consider(e: CustomEvent<DndEvent<Task>>): void {
    dragging = true;
    ordered = e.detail.items;
  }
  function finalize(e: CustomEvent<DndEvent<Task>>): void {
    ordered = e.detail.items;
    dragging = false;
    dragDisabled = true;
    onReorder(ordered.map((t) => t.id));
  }

  function grab(e: PointerEvent): void {
    e.preventDefault();
    dragDisabled = false;
  }

  function edited(id: string, text: string): void {
    if (text.trim() === '') onDelete(id);
    else onEdit(id, text);
  }

  let draft = $state('');
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

<div class="checklist">
  <div
    class="rows"
    use:dndzone={{
      items: ordered,
      dragDisabled,
      flipDurationMs: 150,
      // Unique per day so items can't (yet) be dragged into another day's list.
      type: `day-${date}`,
      dropTargetStyle: {},
    }}
    onconsider={consider}
    onfinalize={finalize}
  >
    {#each ordered as task (task.id)}
      <div class="item">
        <button
          class="handle"
          aria-label="Drag to reorder"
          onpointerdown={grab}
          ontouchstart={() => (dragDisabled = false)}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
            <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
            <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
            <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
          </svg>
        </button>
        <div class="row-body">
          <CheckRow
            text={task.text}
            done={task.done}
            onToggle={() => onToggle(task.id)}
            onEdit={(text) => edited(task.id, text)}
          />
        </div>
      </div>
    {/each}
  </div>

  <div class="add">
    <span class="plus" aria-hidden="true">+</span>
    <input
      class="add-input"
      type="text"
      placeholder="Add task"
      bind:value={draft}
      onkeydown={onDraftKeydown}
      onblur={addFromDraft}
    />
  </div>
</div>

<style>
  .checklist {
    margin-top: 10px;
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
    touch-action: none; /* let the drag lib own the gesture on the handle */
  }
  .handle:active {
    cursor: grabbing;
  }

  .row-body {
    flex: 1;
    min-width: 0;
  }

  .add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0 9px 24px; /* align text with rows (past the handle) */
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
    color: var(--today-tint);
  }
  .add-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 0;
    outline: none;
  }
  .add-input::placeholder {
    color: var(--text-placeholder);
  }
</style>
