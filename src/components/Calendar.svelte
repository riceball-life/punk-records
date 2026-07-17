<script lang="ts">
  import { onMount, tick } from 'svelte';
  import MonthGrid from './MonthGrid.svelte';
  import { monthIndex, monthIndexOfKey, monthParts, monthRange } from '../lib/date/calendar';
  import { todayKey } from '../lib/date/dateUtils';

  let {
    today,
    entrySet,
    milestoneSet = new Set<string>(),
    onPick,
  }: {
    today: string;
    entrySet: Set<string>;
    milestoneSet?: Set<string>;
    onPick: (date: string) => void;
  } = $props();

  // Weekday header, Sunday-first to match the grid layout.
  const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const MIN_IDX = monthIndex(1900, 0);
  const MAX_IDX = monthIndex(2100, 11);
  const THRESHOLD = 600; // px from an edge that triggers loading more months
  const CHUNK = 12; // months added per extension

  let container = $state<HTMLElement>();
  let months = $state<number[]>([]);
  let busy = false;

  function currentMonthIdx(): number {
    return monthIndexOfKey(todayKey());
  }

  function scrollToMonth(idx: number): void {
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-month="${idx}"]`);
    if (!el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    container.scrollTop += eRect.top - cRect.top;
  }

  onMount(async () => {
    const todayIdx = currentMonthIdx();
    // Span from a bit before the earliest of (today, first entry) to a bit
    // after the latest, so today and every entry are reachable at open. The
    // range extends lazily on scroll, so arbitrary past/future days stay
    // reachable for creating entries.
    let lo = todayIdx;
    let hi = todayIdx;
    for (const key of entrySet) {
      const idx = monthIndexOfKey(key);
      if (idx < lo) lo = idx;
      if (idx > hi) hi = idx;
    }
    lo = Math.max(MIN_IDX, lo - 18);
    hi = Math.min(MAX_IDX, hi + 6);
    months = monthRange(lo, hi);

    await tick();
    scrollToMonth(todayIdx);
  });

  async function onScroll(): Promise<void> {
    if (busy || !container || months.length === 0) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const first = months[0]!;
    const last = months[months.length - 1]!;

    // Near the top → prepend older months (content added ABOVE → compensate).
    if (scrollTop < THRESHOLD && first > MIN_IDX) {
      busy = true;
      const newLo = Math.max(MIN_IDX, first - CHUNK);
      const prepend = monthRange(newLo, first - 1);
      const prev = container.scrollHeight;
      months = [...prepend, ...months];
      await tick();
      container.scrollTop += container.scrollHeight - prev;
      busy = false;
      return;
    }

    // Near the bottom → append newer months (content added BELOW → no compensation).
    if (scrollTop + clientHeight > scrollHeight - THRESHOLD && last < MAX_IDX) {
      busy = true;
      const newHi = Math.min(MAX_IDX, last + CHUNK);
      months = [...months, ...monthRange(last + 1, newHi)];
      await tick();
      busy = false;
    }
  }
</script>

<div class="calendar">
  <div class="weekdays" aria-hidden="true">
    {#each WEEKDAYS as d, i (i)}<span>{d}</span>{/each}
  </div>
  <div class="scroll" bind:this={container} onscroll={onScroll}>
    {#each months as idx (idx)}
      {@const p = monthParts(idx)}
      <div data-month={idx}>
        <MonthGrid year={p.year} month0={p.month0} {today} {entrySet} {milestoneSet} {onPick} />
      </div>
    {/each}
  </div>
</div>

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .weekdays {
    flex: none;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    padding: 6px 12px;
    border-bottom: 0.5px solid var(--separator);
  }

  .weekdays span {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overflow-anchor: none;
    /* Clear the floating brain button below the last month. */
    padding-bottom: calc(84px + env(safe-area-inset-bottom));
  }
</style>
