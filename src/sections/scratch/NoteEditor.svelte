<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { notes } from '../../lib/app/stores';
  import type { Note } from '../../lib/notes/types';

  let { id, onClose }: { id: string; onClose: () => void } = $props();

  let note: Note | undefined;
  // svelte-ignore state_referenced_locally
  let text = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let deleted = false;

  onMount(async () => {
    note = await notes.get(id);
    text = note?.text ?? '';
    await tick();
    autosize();
    textarea?.focus();
  });

  function autosize(): void {
    const el = textarea;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function schedule(): void {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), 500);
  }

  async function save(): Promise<void> {
    if (!dirty || !note) return;
    dirty = false;
    note = await notes.put({ ...note, text });
  }

  function onInput(e: Event): void {
    text = (e.currentTarget as HTMLTextAreaElement).value;
    schedule();
    autosize();
  }

  /** Persist on the way out; discard a note left blank (iOS-Notes behavior). */
  async function flushAndCleanup(): Promise<void> {
    if (timer) clearTimeout(timer);
    if (deleted || !note) return;
    if (text.trim() === '') await notes.remove(note.id);
    else if (dirty) await notes.put({ ...note, text });
  }

  onDestroy(() => void flushAndCleanup());

  function del(): void {
    deleted = true;
    if (timer) clearTimeout(timer);
    if (note) void notes.remove(note.id);
    onClose();
  }
</script>

<header class="editor-header">
  <button class="link back" onclick={onClose} aria-label="Back to notes">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
    Notes
  </button>
  <span class="spacer" aria-hidden="true"></span>
  <button class="icon" onclick={del} aria-label="Delete note" title="Delete">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  </button>
</header>

<div class="note-scroll">
  <textarea
    bind:this={textarea}
    value={text}
    oninput={onInput}
    placeholder="Note"
    rows="1"
    spellcheck="true"
    autocapitalize="sentences"
  ></textarea>
</div>

<style>
  .editor-header {
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top) + 10px) 12px 10px;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
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

  .note-scroll {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px 20px calc(84px + env(safe-area-inset-bottom));
  }

  textarea {
    display: block;
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    padding: 0;
    margin: 0;
    line-height: 1.5;
    overflow: hidden;
    color: var(--text);
  }
  textarea::placeholder {
    color: var(--text-placeholder);
  }
</style>
