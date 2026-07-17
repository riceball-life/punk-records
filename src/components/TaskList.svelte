<script lang="ts">
  import TaskRow from './TaskRow.svelte';
  import { sortable } from '../lib/dnd/sortable';
  import type { Task } from '../lib/todos/types';

  let {
    tasks,
    group,
    listId,
    accent = 'var(--today-tint)',
    placeholder = 'Add task',
    metaOf,
    onAdd,
    onToggle,
    onEdit,
    onDelete,
    onReorder,
  }: {
    tasks: Task[];
    /** Lists sharing a group allow dragging items between them (To-do categories). */
    group: string;
    listId: string;
    accent?: string;
    placeholder?: string;
    /** Optional right-aligned label per row (e.g. a To-do's day). */
    metaOf?: (task: Task) => string | undefined;
    onAdd: (text: string) => void;
    onToggle: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    onReorder: (listId: string, orderedIds: string[]) => void;
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

<div class="checklist" use:sortable={{ group, listId, onReorder }}>
  {#each tasks as task (task.id)}
    <TaskRow
      id={task.id}
      text={task.text}
      done={task.done}
      {accent}
      meta={metaOf?.(task) ?? ''}
      onToggle={() => onToggle(task.id)}
      onEdit={(text) => edited(task.id, text)}
    />
  {/each}

  <div class="add">
    <span class="plus" style="--row-accent: {accent}" aria-hidden="true">+</span>
    <input
      class="add-input"
      type="text"
      {placeholder}
      bind:value={draft}
      onkeydown={onDraftKeydown}
      onblur={addFromDraft}
    />
  </div>
</div>

<style>
  .checklist {
    display: flex;
    flex-direction: column;
  }

  .add {
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
