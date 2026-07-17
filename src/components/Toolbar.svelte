<script lang="ts">
  import type { EntryStore } from '../lib/entries/entryStore';
  import { todayKey } from '../lib/date/dateUtils';
  import { currentTheme, setTheme, type Theme } from '../lib/app/theme';
  import CalendarToggle from './CalendarToggle.svelte';

  let {
    store,
    title = 'Punk Records',
  }: {
    store: EntryStore;
    title?: string;
  } = $props();

  let exporting = $state(false);
  let theme = $state<Theme>(currentTheme());

  function toggleTheme(): void {
    theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
  }

  async function exportJson(): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      // Flush any debounced edits so the export reflects the latest keystrokes.
      await store.flush();
      const entries = await store.exportAll();
      const payload = {
        app: 'journal',
        version: 1,
        exportedAt: new Date().toISOString(),
        entries,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `punk-records-export-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
  }
</script>

<header class="toolbar">
  <span class="spacer" aria-hidden="true"></span>
  <h1>{title}</h1>
  <div class="right">
    <CalendarToggle />
    <button
      class="icon"
      onclick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {#if theme === 'dark'}
        <!-- sun: tap to go light -->
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      {:else}
        <!-- moon: tap to go dark -->
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      {/if}
    </button>
    <button
      class="icon"
      onclick={exportJson}
      disabled={exporting}
      aria-label="Export all entries"
      title="Export"
    >
      <!-- export: arrow up out of a tray -->
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 15V3" />
        <path d="M8 7l4-4 4 4" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    </button>
  </div>
</header>

<style>
  .toolbar {
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

  h1 {
    margin: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .right {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--today-tint);
    padding: 6px;
    cursor: pointer;
    border-radius: 999px;
  }

  .icon:active {
    background: color-mix(in srgb, var(--today-tint) 18%, transparent);
  }

  .icon:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
