<script lang="ts">
  import { onMount } from 'svelte';
  import { syncEngine } from '../lib/app/stores';
  import { signOut } from '../lib/sync/auth';
  import type { SyncStatus } from '../lib/sync/syncEngine';

  let status = $state<SyncStatus>(syncEngine?.getStatus() ?? 'idle');

  const LABEL: Record<SyncStatus, string> = {
    idle: 'Synced',
    syncing: 'Syncing…',
    offline: 'Offline',
    error: 'Sync error',
  };

  onMount(() => syncEngine?.onStatus((s) => (status = s)));
</script>

{#if syncEngine}
  <div class="syncbar">
    <button class="status" data-status={status} onclick={() => syncEngine?.sync()}>
      <span class="dot"></span>{LABEL[status]}
    </button>
    <button class="signout" onclick={() => signOut()}>Sign out</button>
  </div>
{/if}

<style>
  .syncbar {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px;
    font-size: 12px;
    color: var(--text-secondary);
    border-bottom: 0.5px solid var(--separator);
  }

  button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 0;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--text-secondary);
  }

  .status[data-status='idle'] .dot {
    background: #30d158;
  }
  .status[data-status='syncing'] .dot {
    background: var(--today-tint);
  }
  .status[data-status='offline'] .dot,
  .status[data-status='error'] .dot {
    background: #ff453a;
  }

  .signout {
    color: var(--today-tint);
  }
</style>
