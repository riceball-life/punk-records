<script lang="ts">
  import { monthGridCells, monthLabel } from '../lib/date/calendar';

  let {
    year,
    month0,
    today,
    entrySet,
    onPick,
  }: {
    year: number;
    month0: number;
    today: string;
    entrySet: Set<string>;
    onPick: (date: string) => void;
  } = $props();

  const cells = $derived(monthGridCells(year, month0));
  const label = $derived(monthLabel(year, month0));

  function dayNum(key: string): number {
    return Number(key.slice(-2));
  }
</script>

<section class="month">
  <h2>{label}</h2>
  <div class="grid">
    {#each cells as cell, i (cell ?? `blank-${i}`)}
      {#if cell}
        <button
          class="day"
          class:is-today={cell === today}
          onclick={() => onPick(cell)}
          aria-label={`${label} ${dayNum(cell)}${entrySet.has(cell) ? ', has entry' : ''}`}
        >
          <span class="num">{dayNum(cell)}</span>
          <span class="dot" class:visible={entrySet.has(cell)} aria-hidden="true"></span>
        </button>
      {:else}
        <span class="blank" aria-hidden="true"></span>
      {/if}
    {/each}
  </div>
</section>

<style>
  .month {
    padding: 8px 12px 20px;
  }

  h2 {
    margin: 12px 6px 10px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .blank {
    aspect-ratio: 1;
  }

  .day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border: none;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    position: relative;
    padding: 0;
  }

  .num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  /* Days with an entry: a blue dot beneath the number (iOS Calendar style). */
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: transparent;
  }

  .dot.visible {
    background: var(--entry-tint);
  }

  /* Today: filled amber disc around the number. */
  .is-today .num {
    background: var(--today-tint);
    color: var(--accent-text);
    font-weight: 700;
  }

  .day:active .num {
    background: color-mix(in srgb, var(--today-tint) 30%, transparent);
  }

  .is-today:active .num {
    background: var(--today-tint);
  }
</style>
