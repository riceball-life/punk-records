<script lang="ts">
  import { nav, goHub, goSection, goArchiveDays } from '../lib/app/route.svelte';
  import { active } from '../lib/app/activeEditor.svelte';
  import { getSection } from '../lib/sections/registry';
  import type { SectionId } from '../lib/sections/types';

  // Persistent bottom navigation bar, anchored on every screen. Section arrangement
  // around the raised center brain:
  //   Act (To-do, Tracker) on the left · brain · Capture (Scratch, Archives) on the right.
  const LEFT: SectionId[] = ['todo', 'tracker'];
  const RIGHT: SectionId[] = ['scratch', 'archives'];

  const onHub = $derived(nav.route.screen === 'hub');
  // Hidden while a text field is focused so it never collides with the editing
  // FormatBar / on-screen keyboard (same behavior the old brain button had).
  const hidden = $derived(active.editor !== null);

  function isActive(id: SectionId): boolean {
    return nav.route.screen === 'section' && nav.route.id === id;
  }
</script>

{#snippet tab(id: SectionId)}
  {@const s = getSection(id)}
  {#if s}
    {@const Icon = s.icon}
    {@const on = isActive(id)}
    <button
      class="tab"
      class:on
      class:disabled={!s.enabled}
      style={on ? `color:${s.accent}` : undefined}
      onclick={() => s.enabled && (id === 'archives' ? goArchiveDays() : goSection(id))}
      aria-label={s.label}
      aria-current={on ? 'page' : undefined}
      disabled={!s.enabled}
    >
      <Icon />
    </button>
  {/if}
{/snippet}

{#if !hidden}
  <nav class="nav" aria-label="Sections">
    <div class="group">
      {#each LEFT as id (id)}{@render tab(id)}{/each}
    </div>

    <button
      class="brain"
      class:active={onHub}
      onclick={goHub}
      aria-label="Brain hub"
      aria-current={onHub ? 'page' : undefined}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 4.2c2.8-1.9 6.6-.2 6.6 3.4 1.9 1 1.9 4.6 0 5.6-.5 2.8-3.8 3.8-6.6 2.8-2.8 1-6.1 0-6.6-2.8-1.9-1-1.9-4.6 0-5.6 0-3.6 3.8-5.3 6.6-3.4z" />
        <path d="M12 4.2v13" stroke-opacity="0.55" />
      </svg>
    </button>

    <div class="group">
      {#each RIGHT as id (id)}{@render tab(id)}{/each}
    </div>
  </nav>
{/if}

<style>
  .nav {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 0;
    z-index: 40;
    width: 100%;
    max-width: 720px;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    /* Frosted chrome that pairs with the top header bars. */
    padding: 0 10px env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--header-bg) 88%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    border-top: 0.5px solid var(--separator);
    /* Let the raised center brain protrude above the bar. */
    overflow: visible;
  }

  .group {
    flex: 1;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
  }

  .tab {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.15s ease;
  }
  /* .tab.on gets its accent color via an inline style. */
  .tab.disabled {
    opacity: 0.4;
    cursor: default;
  }
  .tab:not(.disabled):active {
    transform: scale(0.9);
  }

  .brain {
    flex: none;
    width: 56px;
    height: 56px;
    /* Lift above the bar for the docked / raised look. */
    align-self: flex-start;
    margin: -20px 8px 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0.5px solid var(--separator);
    border-radius: 999px;
    color: var(--today-tint);
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    cursor: pointer;
  }
  .brain.active {
    color: var(--accent-text);
    background: var(--today-tint);
    border-color: transparent;
  }
  .brain:active {
    transform: scale(0.94);
  }
</style>
