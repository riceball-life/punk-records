<script lang="ts">
  import { onMount } from 'svelte';
  import TaskList from '../../components/TaskList.svelte';
  import CalendarToggle from '../../components/CalendarToggle.svelte';
  import { todos } from '../../lib/app/stores';
  import {
    newTask,
    markTaskDone,
    taskInboxOrder,
    taskCategory,
    groupTasksByCategory,
    type Task,
  } from '../../lib/todos/types';

  const ACCENT = '#2fa7b5';
  // Shared across every category list so tasks can be dragged between categories.
  const GROUP = 'todo';

  let openTasks = $state<Task[]>([]);
  // Just-created categories with no tasks yet (so they can be added to).
  let pendingCategories = $state<string[]>([]);
  let newCat = $state('');

  async function load(): Promise<void> {
    const all = await todos.list();
    openTasks = all.filter((t) => !t.done);
  }

  onMount(() => {
    void load();
    const off = todos.onChanged(() => void load());
    return off;
  });

  // Always include an "Other" (uncategorized) group so there's an add row even
  // when empty. Headers only show once a named category is in use.
  const groups = $derived.by(() => {
    const g = groupTasksByCategory(openTasks, pendingCategories);
    if (!g.some((x) => x.category === '')) g.push({ category: '', label: 'Other', items: [] });
    return g;
  });
  const hasCategories = $derived(groups.some((g) => g.category !== ''));

  /** Short "Jul 15" tag for a task filed under a specific journal day. */
  function dayTag(dateKey: string | null): string | undefined {
    if (!dateKey) return undefined;
    const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function toggle(id: string): void {
    const t = openTasks.find((x) => x.id === id);
    if (t) void todos.put(markTaskDone(t));
  }
  function edit(id: string, text: string): void {
    const t = openTasks.find((x) => x.id === id);
    if (t) void todos.put({ ...t, text });
  }
  function remove(id: string): void {
    void todos.remove(id);
  }
  function add(category: string, text: string): void {
    const inCat = openTasks.filter((t) => taskCategory(t) === category).length;
    void todos.put({ ...newTask(text), category, inboxOrder: inCat });
  }
  /** Persist the new order + category for a group (also handles a cross-category move). */
  async function reorder(category: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const t = openTasks.find((x) => x.id === orderedIds[i]);
      if (t && (taskInboxOrder(t) !== i || taskCategory(t) !== category)) {
        void todos.put({ ...t, inboxOrder: i, category });
      }
    }
  }

  function addCategory(): void {
    const name = newCat.trim();
    if (name && !groups.some((g) => g.category === name)) {
      pendingCategories = [...pendingCategories, name];
    }
    newCat = '';
  }
  function onNewCatKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    }
  }
</script>

<header class="section-header">
  <div class="left"><CalendarToggle /></div>
  <h1>To-do</h1>
  <span class="spacer" aria-hidden="true"></span>
</header>

<div class="body">
  {#each groups as group (group.category)}
    {#if hasCategories}
      <h2 class="cat">{group.label}</h2>
    {/if}
    <TaskList
      tasks={group.items}
      group={GROUP}
      listId={group.category}
      accent={ACCENT}
      placeholder="New task"
      metaOf={(t) => dayTag(t.date)}
      onToggle={toggle}
      onEdit={edit}
      onAdd={(text) => add(group.category, text)}
      onDelete={remove}
      onReorder={(listId, ids) => reorder(listId, ids)}
    />
  {/each}

  <div class="newcat">
    <span class="plus" aria-hidden="true">+</span>
    <input
      class="newcat-input"
      type="text"
      placeholder="New category"
      bind:value={newCat}
      onkeydown={onNewCatKeydown}
      onblur={addCategory}
      autocapitalize="words"
    />
  </div>
</div>

<style>
  .section-header {
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
    background: color-mix(in srgb, var(--header-bg) 88%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    border-bottom: 0.5px solid var(--separator);
  }
  .section-header h1 {
    margin: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .section-header .left {
    justify-self: start;
    display: flex;
    align-items: center;
  }

  .body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 8px 20px calc(84px + env(safe-area-inset-bottom));
  }

  .cat {
    margin: 18px 0 2px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }
  .cat:first-child {
    margin-top: 6px;
  }

  .newcat {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    padding: 9px 4px;
    border-top: 0.5px solid var(--separator);
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
    color: var(--text-secondary);
  }
  .newcat-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 0;
    outline: none;
  }
  .newcat-input::placeholder {
    color: var(--text-placeholder);
  }
</style>
