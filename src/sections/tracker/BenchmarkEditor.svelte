<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { benchmarks, milestones, appendToTodayEntry } from '../../lib/app/stores';
  import { defaultMilestoneText, type Benchmark } from '../../lib/tracker/types';
  import { newMilestone } from '../../lib/milestones/types';

  let {
    id,
    onClose,
    categories = [],
  }: { id: string; onClose: () => void; categories?: string[] } = $props();

  let bench: Benchmark | undefined;
  let name = $state('');
  let value = $state('');
  let unit = $state('');
  let category = $state('');
  let oldValue = ''; // the value when the editor opened → "up from" baseline

  let nameEl = $state<HTMLInputElement>();
  let valueEl = $state<HTMLInputElement>();

  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let deleted = false;

  // Milestone log offer: shown when the value has changed from a prior value.
  const showOffer = $derived(
    value.trim() !== '' && oldValue.trim() !== '' && value.trim() !== oldValue.trim(),
  );
  let msText = $state('');
  let msTouched = $state(false);
  let logged = $state(false);

  onMount(async () => {
    bench = await benchmarks.get(id);
    if (bench) {
      name = bench.name;
      value = bench.value;
      unit = bench.unit;
      category = bench.category ?? '';
      oldValue = bench.value;
    }
    await tick();
    (name.trim() === '' ? nameEl : valueEl)?.focus();
  });

  // Keep the default milestone text in sync with the fields until the user edits it.
  $effect(() => {
    if (!msTouched && bench) {
      msText = defaultMilestoneText({ ...bench, name, value, unit }, oldValue);
    }
  });

  function schedule(): void {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), 500);
  }

  async function save(): Promise<void> {
    if (!dirty || !bench || deleted) return;
    dirty = false;
    bench = await benchmarks.put({
      ...bench,
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim(),
      category: category.trim(),
    });
  }

  function onValueInput(e: Event): void {
    value = (e.currentTarget as HTMLInputElement).value;
    // A fresh value re-opens the offer and refreshes the default text.
    msTouched = false;
    logged = false;
    schedule();
  }

  async function logMilestone(): Promise<void> {
    if (!bench) return;
    const text = msText.trim();
    if (text === '') return;
    await save(); // persist the new value alongside the milestone
    // Keep a milestone record (calendar gold dots + future history) AND log it as
    // a line in today's journal entry.
    void milestones.put(newMilestone(text, bench.id));
    await appendToTodayEntry(`🏅 ${text}`);
    logged = true;
  }

  function del(): void {
    deleted = true;
    if (timer) clearTimeout(timer);
    if (bench) void benchmarks.remove(bench.id);
    onClose();
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    if (deleted || !bench) return;
    // Discard a benchmark left unnamed; otherwise flush any pending edit.
    if (name.trim() === '') void benchmarks.remove(bench.id);
    else if (dirty)
      void benchmarks.put({
        ...bench,
        name: name.trim(),
        value: value.trim(),
        unit: unit.trim(),
        category: category.trim(),
      });
  });
</script>

<header class="editor-header">
  <button class="link" onclick={onClose} aria-label="Back to tracker">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
    Tracker
  </button>
  <span class="spacer" aria-hidden="true"></span>
  <button class="icon" onclick={del} aria-label="Delete benchmark" title="Delete">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  </button>
</header>

<div class="body">
  <label class="field">
    <span class="label">Benchmark</span>
    <input
      bind:this={nameEl}
      class="input name"
      type="text"
      placeholder="e.g. Bench Press"
      bind:value={name}
      oninput={schedule}
      autocapitalize="words"
    />
  </label>

  <div class="row">
    <label class="field grow">
      <span class="label">Current best</span>
      <input
        bind:this={valueEl}
        class="input"
        type="text"
        placeholder="e.g. 205"
        value={value}
        oninput={onValueInput}
      />
    </label>
    <label class="field unit">
      <span class="label">Unit</span>
      <input
        class="input"
        type="text"
        placeholder="lbs"
        bind:value={unit}
        oninput={schedule}
        autocapitalize="none"
      />
    </label>
  </div>

  <label class="field">
    <span class="label">Category (optional)</span>
    <input
      class="input"
      type="text"
      list="benchmark-categories"
      placeholder="e.g. Strength"
      bind:value={category}
      oninput={schedule}
      autocapitalize="words"
    />
    <datalist id="benchmark-categories">
      {#each categories as c (c)}
        <option value={c}></option>
      {/each}
    </datalist>
  </label>

  {#if showOffer}
    <div class="offer">
      {#if logged}
        <p class="logged">✓ Logged to Archives</p>
      {:else}
        <span class="label">Log this PR to Archives?</span>
        <input
          class="input ms"
          type="text"
          bind:value={msText}
          oninput={() => (msTouched = true)}
          aria-label="Milestone text"
        />
        <button class="log-btn" onclick={logMilestone}>Log to Archives</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor-header {
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top) + 10px) 12px 10px;
    background: color-mix(in srgb, var(--header-bg) 88%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    border-bottom: 0.5px solid var(--separator);
  }
  .link {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: none;
    background: transparent;
    color: var(--today-tint);
    font-size: 16px;
    padding: 6px 4px;
    cursor: pointer;
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

  .body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 18px 20px calc(84px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .row {
    display: flex;
    gap: 12px;
  }
  .grow {
    flex: 1;
  }
  .unit {
    width: 90px;
    flex: none;
  }

  .label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .input {
    width: 100%;
    border: none;
    border-radius: 10px;
    background: var(--bg-elevated);
    color: var(--text);
    padding: 11px 12px;
    outline: none;
  }
  .input::placeholder {
    color: var(--text-placeholder);
  }
  .input.name {
    font-size: 18px;
    font-weight: 600;
  }

  .offer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: 12px;
    background: color-mix(in srgb, #e08a2b 12%, var(--bg-elevated));
    border: 0.5px solid color-mix(in srgb, #e08a2b 40%, transparent);
  }
  .offer .ms {
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }
  .log-btn {
    align-self: flex-start;
    border: none;
    border-radius: 999px;
    background: #e08a2b;
    color: #fff;
    font-weight: 600;
    padding: 8px 16px;
    cursor: pointer;
  }
  .log-btn:active {
    opacity: 0.85;
  }
  .logged {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #e08a2b;
  }
</style>
