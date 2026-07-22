<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    protein,
    logProtein,
    getProteinGoal,
    setProteinGoal,
    upsertProteinLine,
  } from '../../lib/app/stores';
  import { proteinIdFor, type ProteinDay } from '../../lib/protein/types';
  import { todayKey } from '../../lib/date/dateUtils';

  const ACCENT = '#e08a2b';
  const PRESETS = [20, 30, 40];

  let today = $state(todayKey());
  let grams = $state(0);
  let goal = $state(150);

  // Undo one level: the most recently applied delta (0 = nothing to undo yet).
  let lastDelta = $state(0);

  let custom = $state('');
  let editingGoal = $state(false);
  let goalDraft = $state('');
  let goalEl = $state<HTMLInputElement>();

  const remaining = $derived(goal - grams);
  const pct = $derived(goal > 0 ? Math.min(100, Math.round((grams / goal) * 100)) : 0);
  const met = $derived(grams >= goal && goal > 0);

  async function load(): Promise<void> {
    const rec: ProteinDay | undefined = await protein.get(proteinIdFor(today));
    grams = rec?.grams ?? 0;
    goal = await getProteinGoal();
  }

  onMount(() => {
    void load();
    const off = protein.onChanged(() => void load());
    // Roll over to a fresh day when the app is re-focused across midnight.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        today = todayKey();
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  async function add(delta: number): Promise<void> {
    if (!delta) return;
    grams = await logProtein(delta); // optimistic; onChanged also refreshes
    lastDelta = delta;
  }

  function addCustom(): void {
    const n = Math.round(Number(custom));
    if (Number.isFinite(n) && n > 0) {
      void add(n);
      custom = '';
    }
  }
  function onCustomKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  }

  function undo(): void {
    if (lastDelta === 0) return;
    void add(-lastDelta);
    lastDelta = 0; // single level
  }

  async function startEditGoal(): Promise<void> {
    goalDraft = String(goal);
    editingGoal = true;
    await tick();
    goalEl?.focus();
    goalEl?.select();
  }
  async function commitGoal(): Promise<void> {
    editingGoal = false;
    const n = Math.round(Number(goalDraft));
    if (Number.isFinite(n) && n > 0 && n !== goal) {
      await setProteinGoal(n);
      goal = n;
      // Refresh today's folded line so its ✓ reflects the new goal.
      await upsertProteinLine(today, grams, goal);
    }
  }
  function onGoalKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      goalEl?.blur();
    } else if (e.key === 'Escape') {
      editingGoal = false;
    }
  }
</script>

<section class="protein" style="--accent: {ACCENT}">
  <div class="top">
    <span class="title">🍗 Protein</span>
    <span class="total" class:met>
      {grams}<span class="sep"> / {goal} g</span>
    </span>
  </div>

  <div class="bar" role="progressbar" aria-valuenow={grams} aria-valuemin="0" aria-valuemax={goal}>
    <span class="fill" class:met style="width: {pct}%"></span>
  </div>

  <p class="hint">
    {#if met}
      goal met{remaining < 0 ? ` · ${-remaining} g over` : ''} 🎉
    {:else}
      {remaining} g to go
    {/if}
  </p>

  <div class="adds">
    {#each PRESETS as p (p)}
      <button class="chip" onclick={() => add(p)}>+{p}</button>
    {/each}
    <input
      class="custom"
      type="number"
      inputmode="numeric"
      min="1"
      placeholder="+ g"
      bind:value={custom}
      onkeydown={onCustomKeydown}
      onblur={addCustom}
      aria-label="Custom grams"
    />
  </div>

  <div class="foot">
    {#if editingGoal}
      <span class="goal-edit">
        Goal
        <input
          bind:this={goalEl}
          class="goal-input"
          type="number"
          inputmode="numeric"
          min="1"
          bind:value={goalDraft}
          onkeydown={onGoalKeydown}
          onblur={commitGoal}
          aria-label="Daily protein goal"
        /> g
      </span>
    {:else}
      <button class="goal-btn" onclick={startEditGoal}>Goal {goal} g</button>
    {/if}
    {#if lastDelta !== 0}
      <button class="undo" onclick={undo}>Undo</button>
    {/if}
  </div>
</section>

<style>
  .protein {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 10px 0 6px;
    padding: 14px 16px;
    border-radius: 16px;
    background: var(--bg-elevated);
    border: 0.5px solid var(--separator);
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .total {
    font-size: 20px;
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .total.met {
    color: #3aa76d;
  }
  .total .sep {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .bar {
    height: 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text) 10%, transparent);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--accent);
    transition:
      width 0.25s ease,
      background-color 0.25s ease;
  }
  .fill.met {
    background: #3aa76d;
  }

  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .adds {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chip {
    flex: none;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
    font-size: 15px;
    font-weight: 700;
    padding: 8px 16px;
    cursor: pointer;
  }
  .chip:active {
    background: color-mix(in srgb, var(--accent) 28%, transparent);
  }
  .custom {
    flex: 1;
    min-width: 64px;
    border: 0.5px solid var(--separator);
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    font-size: 15px;
    padding: 8px 14px;
    outline: none;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .custom::-webkit-outer-spin-button,
  .custom::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .custom::placeholder {
    color: var(--text-placeholder);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 22px;
  }
  .goal-btn {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 2px 0;
    cursor: pointer;
  }
  .goal-btn:active {
    color: var(--text);
  }
  .goal-edit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .goal-input {
    width: 56px;
    border: none;
    border-bottom: 1.5px solid var(--accent);
    background: transparent;
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    padding: 1px 2px;
    outline: none;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .goal-input::-webkit-outer-spin-button,
  .goal-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .undo {
    border: none;
    background: transparent;
    color: var(--accent);
    font-size: 13px;
    font-weight: 600;
    padding: 2px 0;
    cursor: pointer;
  }
</style>
