<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Toolbar from '../../components/Toolbar.svelte';
  import DayScroll from '../../components/DayScroll.svelte';
  import Calendar from '../../components/Calendar.svelte';
  import { repo, entryStore, syncEngine, todos, milestones } from '../../lib/app/stores';
  import { archivesView } from '../../lib/app/route.svelte';
  import { buildDayList } from '../../lib/entries/dayList';
  import { tasksByDay, taskOrder, newTask, markTaskDone, markTaskOpen, type Task } from '../../lib/todos/types';
  import { milestonesByDay, type Milestone } from '../../lib/milestones/types';
  import { todayKey, compareDayKeys } from '../../lib/date/dateUtils';

  // The journal's day-list state — the existing windowed scroll + calendar.
  let keys = $state<string[]>([]);
  let entrySet = $state<Set<string>>(new Set());
  let today = $state(todayKey());
  let focus = $state(todayKey());
  let ready = $state(false);
  // Bumped to remount the day-scroll when the set of days changes from a pull.
  let refreshToken = $state(0);
  // This day's checklist tasks + logged milestones, grouped by day. Reassigning
  // these Maps re-renders rows IN PLACE (no scroll remount), so editing/checking/
  // reordering a task never jumps the viewport.
  let tByDay = $state<Map<string, Task[]>>(new Map());
  let mByDay = $state<Map<string, Milestone[]>>(new Map());
  // Days with a logged milestone — gold dots in the calendar view.
  const milestoneSet = $derived(new Set(mByDay.keys()));

  onMount(() => {
    // A pull may have updated entries while this section was unmounted; drop any
    // stale cached text so we read fresh from local storage on entry.
    void (async () => {
      await entryStore.flush();
      entryStore.invalidate();
      await loadData();
      ready = true;
    })();

    // Live-refresh while mounted: entry pulls rebuild the list; todo/milestone
    // changes (local edits or pulls) refresh the per-day projections.
    const offEntries = syncEngine?.onChanged(() => void refreshFromLocal());
    const offTodos = todos.onChanged(() => void refreshArchive());
    const offMilestones = milestones.onChanged(() => void refreshArchive());
    return () => {
      offEntries?.();
      offTodos();
      offMilestones();
    };
  });

  // Leaving Archives persists any in-flight debounced edit.
  onDestroy(() => void entryStore.flush());

  function dayUnion(entryKeys: string[]): string[] {
    return buildDayList([...entryKeys, ...tByDay.keys(), ...mByDay.keys()], today);
  }

  async function loadData(): Promise<void> {
    today = todayKey();
    const [entryKeys, allTodos, allMilestones] = await Promise.all([
      repo.allKeys(),
      todos.list(),
      milestones.list(),
    ]);
    entrySet = new Set(entryKeys);
    tByDay = tasksByDay(allTodos);
    mByDay = milestonesByDay(allMilestones);
    keys = dayUnion(entryKeys);
  }

  /**
   * An entries pull changed local data. Rebuild the list and remount the scroll
   * so structural + content changes surface. Deferred while typing.
   */
  async function refreshFromLocal(): Promise<void> {
    const entryKeys = await repo.allKeys();
    entrySet = new Set(entryKeys);
    const next = dayUnion(entryKeys);

    const apply = async () => {
      await entryStore.flush();
      entryStore.invalidate();
      keys = next;
      refreshToken += 1;
    };
    const active = document.activeElement as HTMLElement | null;
    if (active?.tagName === 'TEXTAREA') {
      active.addEventListener('blur', () => void apply(), { once: true });
    } else {
      await apply();
    }
  }

  /**
   * A to-do or milestone changed. Rebuild the projections in place (no remount).
   * Only when something lands on a day not already in the list do we rebuild +
   * remount so the new day is placed correctly.
   */
  async function refreshArchive(): Promise<void> {
    const [allTodos, allMilestones] = await Promise.all([todos.list(), milestones.list()]);
    tByDay = tasksByDay(allTodos);
    mByDay = milestonesByDay(allMilestones);
    const dayKeys = new Set([...tByDay.keys(), ...mByDay.keys()]);
    const newDay = [...dayKeys].some((d) => !keys.includes(d));
    if (newDay) {
      keys = dayUnion(await repo.allKeys());
      refreshToken += 1;
    }
  }

  // --- checklist actions (unified with the To-do section) --------------------
  function onAddTask(date: string, text: string): void {
    const order = tByDay.get(date)?.length ?? 0;
    void todos.put(newTask(text, date, order));
  }
  async function onToggleTask(id: string): Promise<void> {
    const t = await todos.get(id);
    if (t) void todos.put(t.done ? markTaskOpen(t) : markTaskDone(t));
  }
  async function onEditTask(id: string, text: string): Promise<void> {
    const t = await todos.get(id);
    if (t) void todos.put({ ...t, text });
  }
  function onDeleteTask(id: string): void {
    void todos.remove(id);
  }
  /** Persist the new within-day order, pinning each item to this day. */
  async function onReorderTasks(date: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const t = await todos.get(orderedIds[i]!);
      if (t && (taskOrder(t) !== i || t.date !== date)) {
        void todos.put({ ...t, order: i, date });
      }
    }
  }
  function onDeleteMilestone(id: string): void {
    void milestones.remove(id);
  }

  /** Calendar tap: make sure the day is in the list, then jump to it to edit. */
  function pickDate(date: string): void {
    if (!keys.includes(date)) {
      keys = [...keys, date].sort(compareDayKeys);
    }
    focus = date;
    archivesView.mode = 'days';
  }
</script>

<Toolbar store={entryStore} title="Archives" />
{#if ready}
  {#if archivesView.mode === 'days'}
    <!-- Keyed by focus + refreshToken so a calendar tap or a pull-driven list
         change remounts the scroll, landing/anchoring cleanly. -->
    {#key `${focus}|${refreshToken}`}
      <DayScroll
        {keys}
        {today}
        {focus}
        store={entryStore}
        tasksByDay={tByDay}
        milestonesByDay={mByDay}
        {onAddTask}
        {onToggleTask}
        {onEditTask}
        {onDeleteTask}
        {onReorderTasks}
        {onDeleteMilestone}
      />
    {/key}
  {:else}
    <Calendar {today} {entrySet} {milestoneSet} onPick={pickDate} />
  {/if}
{/if}
