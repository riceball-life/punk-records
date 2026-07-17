<script lang="ts">
  import { onMount, tick } from 'svelte';
  import DayRow from './DayRow.svelte';
  import type { EntryStore } from '../lib/entries/entryStore';
  import type { Task } from '../lib/todos/types';
  import type { Milestone } from '../lib/milestones/types';
  import {
    initialWindow,
    growUp,
    growDown,
    trimTop,
    trimBottom,
    type Window,
  } from '../lib/scroll/window';

  let {
    keys,
    today,
    store,
    focus = today,
    tasksByDay = new Map<string, Task[]>(),
    milestonesByDay = new Map<string, Milestone[]>(),
    onAddTask,
    onToggleTask,
    onEditTask,
    onDeleteTask,
    onReorderTasks,
    onDeleteMilestone,
  }: {
    keys: string[];
    today: string;
    store: EntryStore;
    focus?: string;
    /** This day's checklist tasks + logged milestones, grouped by day. */
    tasksByDay?: Map<string, Task[]>;
    milestonesByDay?: Map<string, Milestone[]>;
    onAddTask?: (date: string, text: string) => void;
    onToggleTask?: (id: string) => void;
    onEditTask?: (id: string, text: string) => void;
    onDeleteTask?: (id: string) => void;
    onReorderTasks?: (date: string, orderedIds: string[]) => void;
    onDeleteMilestone?: (id: string) => void;
  } = $props();

  const BUFFER = 12; // rows rendered each side of today at start
  const BATCH = 10; // rows added per load
  const MAX = 45; // hard cap on rows kept in the DOM
  const THRESHOLD = 800; // px from an edge that triggers a load
  const TOP_PAD = 8; // gap above the landed row

  let container = $state<HTMLElement>();
  let win = $state<Window>({ start: 0, end: 0 });
  /** Guards against re-entrant loads while we mutate the window + scrollTop. */
  let busy = false;

  const visible = $derived(keys.slice(win.start, win.end));

  /** Ensure the given day keys have their text cached before we measure them. */
  async function preload(slice: string[]): Promise<void> {
    await Promise.all(slice.map((k) => store.load(k)));
  }

  function scrollToDate(date: string): void {
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-date="${date}"]`);
    if (!el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    container.scrollTop += eRect.top - cRect.top - TOP_PAD;
  }

  onMount(async () => {
    const idx = keys.indexOf(focus);
    const center = idx >= 0 ? idx : keys.length - 1;
    const target = initialWindow(keys.length, center, BUFFER, MAX);
    // Preload before rendering so rows mount at full height and landing is exact.
    await preload(keys.slice(target.start, target.end));
    win = target;
    await tick();
    scrollToDate(focus);
    // Focus the landed day's textarea so tapping a calendar day is ready to type.
    if (focus !== today) {
      container
        ?.querySelector<HTMLTextAreaElement>(`[data-date="${focus}"] textarea`)
        ?.focus();
    }
  });

  /** Keep scrollTop within the scrollable range so a bad compensation can't
      strand the viewport in blank space. */
  function clampScroll(): void {
    if (!container) return;
    const max = container.scrollHeight - container.clientHeight;
    if (container.scrollTop < 0) container.scrollTop = 0;
    else if (container.scrollTop > max) container.scrollTop = Math.max(0, max);
  }

  async function onScroll(): Promise<void> {
    if (busy || !container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Near the top → prepend older days (content added ABOVE → compensate).
    if (scrollTop < THRESHOLD && win.start > 0) {
      busy = true;
      try {
        const target = growUp(win, BATCH);
        await preload(keys.slice(target.start, win.start));
        if (!container) return;
        const prev = container.scrollHeight;
        win = target;
        await tick();
        if (!container) return;
        container.scrollTop += container.scrollHeight - prev;
        clampScroll();
        // Recycle off the bottom (below viewport → no compensation needed).
        win = trimBottom(win, MAX);
        await tick();
      } finally {
        busy = false;
      }
      return;
    }

    // Near the bottom → append newer days (content added BELOW → no compensation).
    if (scrollTop + clientHeight > scrollHeight - THRESHOLD && win.end < keys.length) {
      busy = true;
      try {
        const target = growDown(win, keys.length, BATCH);
        await preload(keys.slice(win.end, target.end));
        if (!container) return;
        win = target;
        await tick();
        if (!container) return;
        // Recycle off the top (content removed ABOVE → compensate).
        if (win.end - win.start > MAX) {
          const prev = container.scrollHeight;
          win = trimTop(win, MAX);
          await tick();
          if (!container) return;
          container.scrollTop += container.scrollHeight - prev;
          clampScroll();
        }
      } finally {
        busy = false;
      }
      return;
    }
  }
</script>

<div class="scroll" bind:this={container} onscroll={onScroll}>
  <!-- Spacer keeps the first real row clear of the toolbar's safe area. -->
  <div class="top-pad" aria-hidden="true"></div>
  {#each visible as date (date)}
    <DayRow
      {date}
      {today}
      {store}
      tasks={tasksByDay.get(date) ?? []}
      milestones={milestonesByDay.get(date) ?? []}
      {onAddTask}
      {onToggleTask}
      {onEditTask}
      {onDeleteTask}
      {onReorderTasks}
      {onDeleteMilestone}
    />
  {/each}
  <div class="bottom-pad" aria-hidden="true"></div>
</div>

<style>
  .scroll {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* We compensate scroll position manually on prepend; don't let the browser
       also anchor, or the two corrections fight and cause a jump. */
    overflow-anchor: none;
    /* While editing, keep the focused line above the keyboard + format bar.
       --edit-inset is published by FormatBar (keyboard + bar height); 0 otherwise. */
    scroll-padding-bottom: var(--edit-inset, 0px);
  }

  .top-pad {
    height: max(8px, env(safe-area-inset-top));
  }

  .bottom-pad {
    /* Normally clears the floating brain button; while editing, expands to the
       keyboard + format-bar height so the last day can scroll fully above them. */
    height: var(--edit-inset, calc(84px + env(safe-area-inset-bottom)));
  }
</style>
