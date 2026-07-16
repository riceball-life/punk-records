<script lang="ts">
  import { onMount } from 'svelte';
  import type { Settings } from '../lib/db/settings';

  let { settings }: { settings: Settings } = $props();

  const KEY = 'storageNoteDismissed';
  let show = $state(false);

  onMount(async () => {
    const dismissed = await settings.get<boolean>(KEY);
    show = dismissed !== true;
  });

  async function dismiss(): Promise<void> {
    show = false;
    await settings.set(KEY, true);
  }
</script>

{#if show}
  <div class="note" role="status">
    <p>
      Your entries are stored <strong>only on this device</strong>. Use
      <strong>Export</strong> now and then to back it up.
    </p>
    <button onclick={dismiss} aria-label="Dismiss">Got it</button>
  </div>
{/if}

<style>
  .note {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: color-mix(in srgb, var(--today-tint) 14%, var(--bg));
    border-bottom: 0.5px solid var(--separator);
  }

  p {
    margin: 0;
    flex: 1;
    font-size: 13px;
    line-height: 1.35;
    color: var(--text);
  }

  button {
    flex: none;
    border: none;
    border-radius: 999px;
    background: var(--today-tint);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    cursor: pointer;
  }
</style>
