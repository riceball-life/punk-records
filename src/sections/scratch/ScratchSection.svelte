<script lang="ts">
  import { onMount } from 'svelte';
  import NoteEditor from './NoteEditor.svelte';
  import CalendarToggle from '../../components/CalendarToggle.svelte';
  import { notes } from '../../lib/app/stores';
  import { newNote, noteTitle, notePreview, type Note } from '../../lib/notes/types';

  let items = $state<Note[]>([]);
  let openId = $state<string | null>(null);

  async function load(): Promise<void> {
    const all = await notes.list();
    // Most-recently edited first, iOS-Notes style.
    items = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  onMount(() => {
    void load();
    const off = notes.onChanged(() => void load());
    return off;
  });

  async function createNote(): Promise<void> {
    const n = newNote();
    await notes.put(n);
    openId = n.id;
  }

  function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

{#if openId}
  <NoteEditor id={openId} onClose={() => (openId = null)} />
{:else}
  <header class="list-header">
    <span class="spacer" aria-hidden="true"></span>
    <h1>Scratch</h1>
    <div class="right">
      <CalendarToggle />
      <button class="icon" onclick={createNote} aria-label="New note" title="New note">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  </header>

  <div class="list">
    {#if items.length === 0}
      <div class="empty">
        <p class="title">No notes yet</p>
        <p class="sub">Tap + to start a note.</p>
      </div>
    {:else}
      {#each items as note (note.id)}
        <button class="card" onclick={() => (openId = note.id)}>
          <span class="card-title">{noteTitle(note)}</span>
          <span class="card-meta">
            <span class="card-date">{shortDate(note.updatedAt)}</span>
            <span class="card-preview">{notePreview(note)}</span>
          </span>
        </button>
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

  .right {
    grid-column: 3;
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

  .card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 12px 0;
    border-bottom: 0.5px solid var(--separator);
    cursor: pointer;
  }
  .card:active {
    background: color-mix(in srgb, var(--text) 5%, transparent);
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    display: flex;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    min-width: 0;
  }
  .card-date {
    flex: none;
  }
  .card-preview {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
