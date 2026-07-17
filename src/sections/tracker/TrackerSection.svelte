<script lang="ts">
  import { onMount } from 'svelte';
  import BenchmarkEditor from './BenchmarkEditor.svelte';
  import { benchmarks } from '../../lib/app/stores';
  import {
    newBenchmark,
    formatValue,
    groupByCategory,
    distinctCategories,
    type Benchmark,
  } from '../../lib/tracker/types';

  let items = $state<Benchmark[]>([]);
  let openId = $state<string | null>(null);

  // Grouped under category headers; headers only show once any category is in use.
  const groups = $derived(groupByCategory(items));
  const hasCategories = $derived(groups.some((g) => g.category !== ''));
  const categoryOptions = $derived(distinctCategories(items));

  async function load(): Promise<void> {
    const all = await benchmarks.list();
    // Named benchmarks only (unnamed drafts stay hidden).
    items = all.filter((b) => b.name.trim() !== '');
  }

  onMount(() => {
    void load();
    const off = benchmarks.onChanged(() => void load());
    return off;
  });

  async function createBenchmark(): Promise<void> {
    const b = newBenchmark();
    await benchmarks.put(b);
    openId = b.id;
  }
</script>

{#if openId}
  <BenchmarkEditor id={openId} categories={categoryOptions} onClose={() => (openId = null)} />
{:else}
  <header class="list-header">
    <span class="spacer" aria-hidden="true"></span>
    <h1>Tracker</h1>
    <button class="icon" onclick={createBenchmark} aria-label="New benchmark" title="New benchmark">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </header>

  <div class="list">
    {#if items.length === 0}
      <div class="empty">
        <p class="title">No benchmarks yet</p>
        <p class="sub">Tap + to track a personal record.</p>
      </div>
    {:else}
      {#each groups as group (group.category)}
        {#if hasCategories}
          <h2 class="cat">{group.label}</h2>
        {/if}
        {#each group.items as b (b.id)}
          <button class="card" onclick={() => (openId = b.id)}>
            <span class="card-name">{b.name}</span>
            <span class="card-value">{formatValue(b.value, b.unit) || '—'}</span>
          </button>
        {/each}
      {/each}
    {/if}
  </div>
{/if}

<style>
  .list-header {
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
  .list-header h1 {
    margin: 0;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .icon {
    grid-column: 3;
    justify-self: end;
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
  .icon:active {
    background: color-mix(in srgb, var(--today-tint) 18%, transparent);
  }

  .list {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px 20px calc(84px + env(safe-area-inset-bottom));
  }

  .cat {
    margin: 18px 0 2px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }
  .cat:first-child {
    margin-top: 8px;
  }

  .card {
    display: flex;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 14px 0;
    border-bottom: 0.5px solid var(--separator);
    cursor: pointer;
  }
  .card:active {
    background: color-mix(in srgb, var(--text) 5%, transparent);
  }
  .card-name {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-value {
    flex: none;
    font-size: 16px;
    font-weight: 600;
    color: #e08a2b;
  }

  .empty {
    text-align: center;
    padding: 64px 24px;
    color: var(--text-secondary);
  }
  .empty .title {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .empty .sub {
    margin: 0;
    font-size: 15px;
  }
</style>
