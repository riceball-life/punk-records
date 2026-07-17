<script lang="ts">
  import { toggleCalendar, calendarShowing } from '../lib/app/route.svelte';

  // Header button, dropped into every page's top-right. Shows a calendar icon
  // that jumps to the Archives calendar; while the calendar is on screen it shows
  // a list icon that returns to the day list.
  const showing = $derived(calendarShowing());
</script>

<button
  class="cal-toggle"
  onclick={toggleCalendar}
  aria-label={showing ? 'List view' : 'Calendar'}
  title={showing ? 'List' : 'Calendar'}
>
  {#if showing}
    <!-- list -->
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  {:else}
    <!-- calendar -->
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  {/if}
</button>

<style>
  .cal-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--today-tint);
    padding: 6px;
    border-radius: 999px;
    cursor: pointer;
  }
  .cal-toggle:active {
    background: color-mix(in srgb, var(--today-tint) 18%, transparent);
  }
</style>
