<script lang="ts">
  import { nav, goHub } from '../lib/app/route.svelte';
  import { active } from '../lib/app/activeEditor.svelte';

  // Persistent button anchored at the bottom of every screen; returns to the
  // brain hub. Reads as "active" while already on the hub. Hidden while a text
  // field is focused so it never collides with the editing FormatBar / keyboard.
  const onHub = $derived(nav.route.screen === 'hub');
  const hidden = $derived(active.editor !== null);
</script>

{#if !hidden}
  <button
    class="brain-btn"
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
{/if}

<style>
  .brain-btn {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 60;
    width: 56px;
    height: 56px;
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

  .brain-btn.active {
    color: var(--accent-text);
    background: var(--today-tint);
    border-color: transparent;
  }

  .brain-btn:active {
    transform: translateX(-50%) scale(0.94);
  }
</style>
