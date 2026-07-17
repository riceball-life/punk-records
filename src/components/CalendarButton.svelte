<script lang="ts">
  import { openCalendar, calendarShowing } from '../lib/app/route.svelte';
  import { active } from '../lib/app/activeEditor.svelte';

  // Persistent calendar shortcut at the bottom of every screen — jumps straight
  // to the Archives calendar from anywhere. Hidden while a text field is focused
  // so it never collides with the editing FormatBar / keyboard.
  const showing = $derived(calendarShowing());
  const hidden = $derived(active.editor !== null);
</script>

{#if !hidden}
  <button
    class="cal-btn"
    class:active={showing}
    onclick={openCalendar}
    aria-label="Calendar"
    aria-current={showing ? 'page' : undefined}
  >
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  </button>
{/if}

<style>
  .cal-btn {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom));
    z-index: 60;
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0.5px solid var(--separator);
    border-radius: 999px;
    color: var(--text);
    background: color-mix(in srgb, var(--bg) 78%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    cursor: pointer;
  }

  .cal-btn.active {
    color: var(--accent-text);
    background: var(--today-tint);
    border-color: transparent;
  }

  .cal-btn:active {
    transform: scale(0.94);
  }
</style>
