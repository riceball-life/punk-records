<script lang="ts">
  import { onMount } from 'svelte';
  import ChecklistView from './ChecklistView.svelte';
  import SyncBar from './SyncBar.svelte';
  import StorageNote from './StorageNote.svelte';
  import CalendarToggle from './CalendarToggle.svelte';
  import InteractiveBrainHub, {
    type BrainZone,
    type BrainZoneId,
  } from './InteractiveBrainHub.svelte';
  import { sections } from '../lib/sections/registry';
  import type { SectionId } from '../lib/sections/types';
  import { goSection } from '../lib/app/route.svelte';
  import { reminders, settings } from '../lib/app/stores';
  import {
    newReminder,
    isDoneOn,
    missCount,
    markDone,
    markUndone,
    type Reminder,
  } from '../lib/reminders/types';
  import { todayKey } from '../lib/date/dateUtils';
  import { currentTheme, setTheme, type Theme } from '../lib/app/theme';

  // --- brain hub navigation ---------------------------------------------------
  // Map the four brain quarters to the app's sections, in registry order.
  const ZONE_ORDER: BrainZoneId[] = ['upper-left', 'upper-right', 'lower-left', 'lower-right'];
  const brainZones: BrainZone[] = sections.slice(0, 4).map((s, i) => ({
    id: ZONE_ORDER[i]!,
    label: s.label,
    accent: s.accent,
    disabled: !s.enabled,
  }));
  const zoneToSection = new Map<BrainZoneId, SectionId>(
    sections.slice(0, 4).map((s, i) => [ZONE_ORDER[i]!, s.id] as const),
  );
  function onZoneSelect(e: { id: BrainZoneId }): void {
    const id = zoneToSection.get(e.id);
    if (id) goSection(id);
  }

  // --- theme toggle -----------------------------------------------------------
  let theme = $state<Theme>(currentTheme());
  function toggleTheme(): void {
    theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
  }

  // --- daily reminders (hub quick list) --------------------------------------
  let items = $state<Reminder[]>([]);
  // Recomputed on visibility so the daily reset / miss-streak stays correct if
  // the app is left open across midnight.
  let today = $state(todayKey());

  // Raw records → what the checklist renders: done-today + red miss-streak badge.
  const displayItems = $derived(
    items.map((r) => ({ id: r.id, text: r.text, done: isDoneOn(r, today), badge: missCount(r, today) })),
  );

  async function load(): Promise<void> {
    const all = await reminders.list();
    items = all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  onMount(() => {
    void load();
    const off = reminders.onChanged(() => void load());
    const onVisible = () => {
      if (document.visibilityState === 'visible') today = todayKey();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  function toggle(id: string): void {
    const r = items.find((x) => x.id === id);
    if (!r) return;
    void reminders.put(isDoneOn(r, today) ? markUndone(r) : markDone(r, today));
  }
  function edit(id: string, text: string): void {
    const r = items.find((x) => x.id === id);
    if (r) void reminders.put({ ...r, text });
  }
  function add(text: string): void {
    void reminders.put(newReminder(text));
  }
  function remove(id: string): void {
    void reminders.remove(id);
  }
</script>

<header class="hub-header">
  <div class="left"><CalendarToggle /></div>
  <h1>Punk Records</h1>
  <div class="right">
    <button
      class="icon"
      onclick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
    {#if theme === 'dark'}
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
    {/if}
    </button>
  </div>
</header>

<SyncBar />
<StorageNote {settings} />

<div class="hub">
  <div class="brain-wrap">
    <InteractiveBrainHub zones={brainZones} onselect={onZoneSelect} showPanel={false} />
  </div>

  <section class="reminders">
    <h2>Daily Reminders</h2>
    <ChecklistView
      items={displayItems}
      placeholder="New daily reminder"
      onToggle={toggle}
      onEdit={edit}
      onAdd={add}
      onDelete={remove}
    />
  </section>
</div>

<style>
  .hub-header {
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
    background: color-mix(in srgb, var(--header-bg) 88%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    border-bottom: 0.5px solid var(--separator);
  }

  .hub-header h1 {
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
  .left {
    justify-self: start;
    display: flex;
    align-items: center;
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

  .hub {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* Leave room for the fixed brain button at the bottom. */
    padding: 20px 20px calc(96px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .brain-wrap {
    width: 100%;
    max-width: 440px;
    margin: 8px 0 20px;
    /* Theme the widget to the app palette: neutral lines that brighten to each
       section's accent on hover; labels get a --bg-colored halo for legibility. */
    --brain-background: transparent;
    --brain-line: color-mix(in srgb, var(--text) 22%, transparent);
    --brain-line-strong: color-mix(in srgb, var(--text) 42%, transparent);
    --brain-glow: var(--today-tint);
    --brain-focus-color: var(--today-tint);
    --brain-label-color: var(--text);
    --brain-divider: color-mix(in srgb, var(--text) 70%, transparent);
    --brain-label-halo: var(--bg);
    --brain-hover-opacity: 1;
  }

  .reminders {
    width: 100%;
    max-width: 480px;
  }
  .reminders h2 {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }
</style>
