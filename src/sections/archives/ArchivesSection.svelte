<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Toolbar from '../../components/Toolbar.svelte';
  import DayScroll from '../../components/DayScroll.svelte';
  import Calendar from '../../components/Calendar.svelte';
  import { repo, entryStore, syncEngine, milestones } from '../../lib/app/stores';
  import { archivesView } from '../../lib/app/route.svelte';
  import { buildDayList } from '../../lib/entries/dayList';
  import { milestoneDayKey } from '../../lib/milestones/types';
  import { todayKey, compareDayKeys } from '../../lib/date/dateUtils';

  // The journal's day-list state — the windowed scroll + calendar.
  let keys = $state<string[]>([]);
  let entrySet = $state<Set<string>>(new Set());
  let today = $state(todayKey());
  let focus = $state(todayKey());
  let ready = $state(false);
  // Bumped to remount the day-scroll when the set of days changes from a pull.
  let refreshToken = $state(0);
  // Days with a logged milestone — gold dots in the calendar view.
  let milestoneSet = $state<Set<string>>(new Set());

  onMount(() => {
    // A pull may have updated entries while this section was unmounted; drop any
    // stale cached text so we read fresh from local storage on entry.
    void (async () => {
      await entryStore.flush();
      entryStore.invalidate();
      await loadData();
      ready = true;
    })();

    // Entry pulls rebuild the day list; milestone changes refresh the gold dots.
    const offEntries = syncEngine?.onChanged(() => void refreshFromLocal());
    const offMilestones = milestones.onChanged(() => void loadMilestones());
    return () => {
      offEntries?.();
      offMilestones();
    };
  });

  // Leaving Archives persists any in-flight debounced edit.
  onDestroy(() => void entryStore.flush());

  async function loadMilestones(): Promise<void> {
    milestoneSet = new Set((await milestones.list()).map(milestoneDayKey));
  }

  async function loadData(): Promise<void> {
    today = todayKey();
    const [entryKeys] = await Promise.all([repo.allKeys(), loadMilestones()]);
    entrySet = new Set(entryKeys);
    keys = buildDayList(entryKeys, today);
  }

  /**
   * An entries pull changed local data. Rebuild the list and remount the scroll.
   * Deferred while typing so we never yank the focused field away.
   */
  async function refreshFromLocal(): Promise<void> {
    const entryKeys = await repo.allKeys();
    entrySet = new Set(entryKeys);
    const next = buildDayList(entryKeys, today);

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
      <DayScroll {keys} {today} {focus} store={entryStore} />
    {/key}
  {:else}
    <Calendar {today} {entrySet} {milestoneSet} onPick={pickDate} />
  {/if}
{/if}
