<script lang="ts">
  import { onMount } from 'svelte';
  import ChecklistView from '../../components/ChecklistView.svelte';
  import { todos } from '../../lib/app/stores';
  import { newTask, markTaskDone, type Task } from '../../lib/todos/types';

  const ACCENT = '#2fa7b5';

  // The active list shows OPEN tasks only (from the inbox and from journal-day
  // checklists — they're unified). Checking one completes it and removes it here.
  let openTasks = $state<Task[]>([]);

  async function load(): Promise<void> {
    const all = await todos.list();
    openTasks = all
      .filter((t) => !t.done)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  onMount(() => {
    void load();
    const off = todos.onChanged(() => void load());
    return off;
  });

  /** Short "Jul 15" tag for a task filed under a specific journal day. */
  function dayTag(dateKey: string | null): string | undefined {
    if (!dateKey) return undefined;
    const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const items = $derived(
    openTasks.map((t) => ({ id: t.id, text: t.text, done: false, meta: dayTag(t.date) })),
  );

  function toggle(id: string): void {
    const t = openTasks.find((x) => x.id === id);
    if (t) void todos.put(markTaskDone(t)); // complete → archives + leaves this list
  }
  function edit(id: string, text: string): void {
    const t = openTasks.find((x) => x.id === id);
    if (t) void todos.put({ ...t, text });
  }
  function add(text: string): void {
    void todos.put(newTask(text));
  }
  function remove(id: string): void {
    void todos.remove(id);
  }
</script>

<header class="section-header">
  <span class="spacer" aria-hidden="true"></span>
  <h1>To-do</h1>
  <span class="spacer" aria-hidden="true"></span>
</header>

<div class="body">
  {#if openTasks.length === 0}
    <div class="empty">
      <p class="title">All done</p>
      <p class="sub">Add a task below. Checking it off files it into Archives.</p>
    </div>
  {/if}
  <ChecklistView
    {items}
    accent={ACCENT}
    placeholder="New task"
    onToggle={toggle}
    onEdit={edit}
    onAdd={add}
    onDelete={remove}
  />
</div>

<style>
  .section-header {
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
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

  .body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 8px 20px calc(84px + env(safe-area-inset-bottom));
  }

  .empty {
    text-align: center;
    padding: 40px 24px 20px;
    color: var(--text-secondary);
  }
  .empty .title {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .empty .sub {
    margin: 0;
    font-size: 15px;
  }
</style>
