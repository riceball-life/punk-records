<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Toolbar from '../../components/Toolbar.svelte';
  import DayScroll from '../../components/DayScroll.svelte';
  import Calendar from '../../components/Calendar.svelte';
  import { repo, entryStore, syncEngine, todos, milestones } from '../../lib/app/stores';
  import { buildDayList } from '../../lib/entries/dayList';
  import { markTaskOpen } from '../../lib/todos/types';
  import { buildArchiveByDay, type ArchiveEntry } from '../../lib/archive/entries';
  import { todayKey, compareDayKeys } from '../../lib/date/dateUtils';

  // The journal's day-list state — lifted verbatim from the old App shell so the
  // existing windowed scroll + calendar keep working unchanged, now living inside
  // the Archives section.
  let keys = $state<string[]>([]);
  let entrySet = $state<Set<string>>(new Set());
  let today = $state(todayKey());
  let focus = $state(todayKey());
  let view = $state<'days' | 'calendar'>('days');
  let ready = $state(false);
  // Bumped to remount the day-scroll when the set of days changes from a pull.
  let refreshToken = $state(0);
  // Day-log entries (completed to-dos + logged milestones) grouped by day — the
  // auto-archive projection. Updating this Map (new reference) re-renders rows IN
  // PLACE without remounting the scroll, so toggling an entry never jumps the view.
  let archiveByDay = $state<Map<string, ArchiveEntry[]>>(new Map());
  // Days with at least one logged milestone — gold dots in the calendar view.
  let milestoneSet = $state<Set<string>>(new Set());

  function milestoneDaysOf(map: Map<string, ArchiveEntry[]>): Set<string> {
    const set = new Set<string>();
    for (const [day, entries] of map) {
      if (entries.some((e) => e.kind === 'milestone')) set.add(day);
    }
    return set;
  }

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
    // changes (local edits or pulls) refresh the projection.
    const offEntries = syncEngine?.onChanged(() => void refreshFromLocal());
    const offTodos = todos.onChanged(() => void refreshArchive());
    const offMilestones = milestones.onChanged(() => void refreshArchive());
    return () => {
      offEntries?.();
      offTodos();
      offMilestones();
    };
  });

  // Leaving Archives (back to the hub / another section) persists any in-flight
  // debounced edit, in case a blur didn't already fire on unmount.
  onDestroy(() => void entryStore.flush());

  async function loadData(): Promise<void> {
    today = todayKey();
    const [entryKeys, allTodos, allMilestones] = await Promise.all([
      repo.allKeys(),
      todos.list(),
      milestones.list(),
    ]);
    entrySet = new Set(entryKeys);
    archiveByDay = buildArchiveByDay(allTodos, allMilestones);
    milestoneSet = milestoneDaysOf(archiveByDay);
    keys = buildDayList([...entryKeys, ...archiveByDay.keys()], today);
  }

  /**
   * An entries pull changed local data. Rebuild the list (keeping the current
   * projection's days) and remount the scroll so structural + content changes
   * surface. Deferred while typing so we never yank the focused field away.
   */
  async function refreshFromLocal(): Promise<void> {
    const entryKeys = await repo.allKeys();
    entrySet = new Set(entryKeys);
    const next = buildDayList([...entryKeys, ...archiveByDay.keys()], today);

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
   * A to-do or milestone changed. Rebuild the projection in place (no remount).
   * Only when an entry lands on a day not already in the list (e.g. a cross-device
   * pull onto a past day) do we rebuild + remount so the new day is placed right.
   */
  async function refreshArchive(): Promise<void> {
    const [allTodos, allMilestones] = await Promise.all([todos.list(), milestones.list()]);
    const next = buildArchiveByDay(allTodos, allMilestones);
    archiveByDay = next;
    milestoneSet = milestoneDaysOf(next);
    const newDay = [...next.keys()].some((d) => !keys.includes(d));
    if (newDay) {
      const entryKeys = await repo.allKeys();
      keys = buildDayList([...entryKeys, ...next.keys()], today);
      refreshToken += 1;
    }
  }

  /** Act on a projected entry: uncheck a to-do (back to To-do) or delete a milestone. */
  async function onEntryAction(entry: ArchiveEntry): Promise<void> {
    if (entry.kind === 'task') {
      const t = await todos.get(entry.id);
      if (t) void todos.put(markTaskOpen(t));
    } else {
      void milestones.remove(entry.id);
    }
  }

  function toggleView(): void {
    view = view === 'days' ? 'calendar' : 'days';
  }

  /** Calendar tap: make sure the day is in the list, then jump to it to edit. */
  function pickDate(date: string): void {
    if (!keys.includes(date)) {
      keys = [...keys, date].sort(compareDayKeys);
    }
    focus = date;
    view = 'days';
  }
</script>

<Toolbar store={entryStore} {view} onToggleView={toggleView} title="Archives" />
{#if ready}
  {#if view === 'days'}
    <!-- Keyed by focus + refreshToken so a calendar tap or a pull-driven list
         change remounts the scroll, landing/anchoring cleanly. -->
    {#key `${focus}|${refreshToken}`}
      <DayScroll {keys} {today} {focus} store={entryStore} {archiveByDay} {onEntryAction} />
    {/key}
  {:else}
    <Calendar {today} {entrySet} {milestoneSet} onPick={pickDate} />
  {/if}
{/if}
