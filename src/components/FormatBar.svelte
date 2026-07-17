<script lang="ts">
  import { onMount } from 'svelte';
  import { active } from '../lib/app/activeEditor.svelte';
  import { toggleChecklist, toggleBullet, toggleWrap, type Edit } from '../lib/markdown/format';

  // Distance from the bottom of the window to sit above the on-screen keyboard.
  let bottom = $state(0);
  let barEl = $state<HTMLElement>();

  function updatePosition() {
    const vv = window.visualViewport;
    bottom = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  }

  onMount(() => {
    updatePosition();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updatePosition);
    vv?.addEventListener('scroll', updatePosition);
    return () => {
      vv?.removeEventListener('resize', updatePosition);
      vv?.removeEventListener('scroll', updatePosition);
      document.documentElement.style.removeProperty('--edit-inset');
    };
  });

  // Publish how much space the keyboard + this bar occupy at the bottom, so the
  // editing scroll area can reserve it (as trailing space AND scroll-padding) and
  // keep the line being edited above the bar. Cleared when nothing is focused.
  $effect(() => {
    const root = document.documentElement.style;
    if (active.editor && barEl) {
      const height = barEl.offsetHeight || 48;
      root.setProperty('--edit-inset', `${bottom + height + 24}px`);
    } else {
      root.removeProperty('--edit-inset');
    }
  });

  function run(fn: (value: string, start: number, end: number) => Edit) {
    const ed = active.editor;
    if (!ed) return;
    const el = ed.textarea;
    const edit = fn(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0);
    ed.apply(edit.value, edit.caret);
  }

  const checklist = () => run((v, s) => toggleChecklist(v, s));
  const bullet = () => run((v, s) => toggleBullet(v, s));
  const bold = () => run((v, s, e) => toggleWrap(v, s, e, '**'));
  const italic = () => run((v, s, e) => toggleWrap(v, s, e, '_'));
</script>

{#if active.editor}
  <!-- preventDefault on pointerdown keeps the textarea focused (and its selection)
       when a button is tapped, so formatting applies to the right place. -->
  <div
    bind:this={barEl}
    class="formatbar"
    role="toolbar"
    tabindex="-1"
    aria-label="Text formatting"
    style="bottom: {bottom}px"
    onpointerdown={(e) => e.preventDefault()}
  >
    <button onclick={checklist} aria-label="Checklist item" title="Checklist">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    </button>
    <button class="bold" onclick={bold} aria-label="Bold" title="Bold">B</button>
    <button class="italic" onclick={italic} aria-label="Italic" title="Italic">i</button>
    <button onclick={bullet} aria-label="Bullet list" title="Bullet">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="5" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none" />
        <path d="M10 7h9M10 12h9M10 17h9" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .formatbar {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: saturate(1.8) blur(20px);
    -webkit-backdrop-filter: saturate(1.8) blur(20px);
    border-top: 0.5px solid var(--separator);
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 36px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--text);
    font-size: 17px;
    cursor: pointer;
  }

  button:active {
    background: color-mix(in srgb, var(--today-tint) 22%, transparent);
  }

  .bold {
    font-weight: 800;
  }

  .italic {
    font-style: italic;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px;
  }
</style>
