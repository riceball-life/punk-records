<script lang="ts">
  import { onMount } from 'svelte';
  import ChecklistView from './ChecklistView.svelte';
  import SyncBar from './SyncBar.svelte';
  import StorageNote from './StorageNote.svelte';
  import CalendarToggle from './CalendarToggle.svelte';
  import { sections } from '../lib/sections/registry';
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

  // --- brain geometry ---------------------------------------------------------
  // A stylized, symmetric brain silhouette. Sections fill lobe "slots" in
  // registry order (NW, NE, SW, SE); the 4th slot is reserved (e.g. a future
  // Tracker) so the layout already has a home for it.
  const OUTLINE =
    'M100 14 C128 10 156 18 166 40 C184 44 188 72 172 86 C186 104 170 132 146 134 ' +
    'C140 152 116 158 100 150 C84 158 60 152 54 134 C30 132 14 104 28 86 ' +
    'C12 72 16 44 34 40 C44 18 72 10 100 14 Z';
  const FISSURE = 'M100 18 C108 42 92 62 100 84 C108 106 92 128 100 148';
  const HDIV = 'M34 88 C68 80 132 80 168 88';
  const GYRI = [
    'M70 34 C60 44 78 50 66 60',
    'M130 34 C140 44 122 50 134 60',
    'M64 108 C56 118 74 122 62 132',
    'M136 108 C144 118 126 122 138 132',
  ];
  const SLOTS = [
    { x: 0, y: 0, lx: 62, ly: 50 },
    { x: 100, y: 0, lx: 138, ly: 50 },
    { x: 0, y: 88, lx: 62, ly: 120 },
    { x: 100, y: 88, lx: 138, ly: 120 },
  ];

  function open(index: number): void {
    const section = sections[index];
    if (section?.enabled) goSection(section.id);
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
  <span class="spacer" aria-hidden="true"></span>
  <h1>Punk Records</h1>
  <div class="right">
    <CalendarToggle />
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
  <svg class="brain" viewBox="0 0 200 176" role="group" aria-label="Brain sections">
    <defs>
      <clipPath id="brainClip"><path d={OUTLINE} /></clipPath>
    </defs>

    <g clip-path="url(#brainClip)">
      <rect x="0" y="0" width="200" height="176" fill="var(--bg-elevated)" />
      {#each SLOTS as slot, i}
        {@const section = sections[i]}
        {#if section}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <rect
            class="lobe-fill"
            class:enabled={section.enabled}
            x={slot.x}
            y={slot.y}
            width="100"
            height="88"
            fill={section.accent}
            opacity={section.enabled ? 0.34 : 0.12}
            onclick={() => open(i)}
            role={section.enabled ? 'button' : undefined}
            tabindex={section.enabled ? 0 : undefined}
            aria-label={section.enabled ? `Open ${section.label}` : undefined}
            onkeydown={(e) => {
              if (section.enabled && (e.key === 'Enter' || e.key === ' ')) open(i);
            }}
          />
        {/if}
      {/each}
      <g class="gyri" fill="none" stroke="var(--text)" stroke-width="1.4" stroke-linecap="round">
        {#each GYRI as d}
          <path {d} />
        {/each}
      </g>
    </g>

    <!-- outline + lobe dividers on top -->
    <path d={OUTLINE} fill="none" stroke="var(--text)" stroke-opacity="0.28" stroke-width="1.6" />
    <path d={FISSURE} fill="none" stroke="var(--text)" stroke-opacity="0.18" stroke-width="1.4" />
    <path d={HDIV} fill="none" stroke="var(--text)" stroke-opacity="0.18" stroke-width="1.4" />

    <!-- labels (not clipped, so they never get cut off) -->
    {#each SLOTS as slot, i}
      {@const section = sections[i]}
      {#if section}
        <text
          class="lobe-label"
          class:disabled={!section.enabled}
          x={slot.lx}
          y={slot.ly}
          text-anchor="middle"
        >
          {section.label}
        </text>
        {#if !section.enabled}
          <text class="lobe-soon" x={slot.lx} y={slot.ly + 13} text-anchor="middle">soon</text>
        {/if}
      {/if}
    {/each}
  </svg>

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
    background: color-mix(in srgb, var(--bg) 82%, transparent);
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

  .brain {
    width: min(340px, 82vw);
    height: auto;
    margin: 8px 0 20px;
  }

  .gyri {
    opacity: 0.12;
  }

  .lobe-fill.enabled {
    cursor: pointer;
    transition: opacity 0.12s ease;
  }
  .lobe-fill.enabled:hover {
    opacity: 0.5 !important;
  }
  .lobe-fill.enabled:active {
    opacity: 0.62 !important;
  }
  .lobe-fill:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  .lobe-label {
    fill: var(--text);
    font-family: var(--font);
    font-size: 13px;
    font-weight: 700;
    pointer-events: none;
  }
  .lobe-label.disabled {
    fill: var(--text-secondary);
    opacity: 0.7;
  }
  .lobe-soon {
    fill: var(--text-secondary);
    font-family: var(--font);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    pointer-events: none;
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
