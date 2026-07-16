<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbar from './components/Toolbar.svelte';
  import DayScroll from './components/DayScroll.svelte';
  import Calendar from './components/Calendar.svelte';
  import StorageNote from './components/StorageNote.svelte';
  import SignIn from './components/SignIn.svelte';
  import SyncBar from './components/SyncBar.svelte';
  import FormatBar from './components/FormatBar.svelte';
  import { repo, entryStore, settings, syncEngine } from './lib/app/stores';
  import { isSupabaseConfigured } from './lib/sync/supabaseClient';
  import { currentUserId, onAuthChange } from './lib/sync/auth';
  import { buildDayList } from './lib/entries/dayList';
  import { todayKey, compareDayKeys } from './lib/date/dateUtils';

  let keys = $state<string[]>([]);
  let entrySet = $state<Set<string>>(new Set());
  let today = $state(todayKey());
  let focus = $state(todayKey());
  let view = $state<'days' | 'calendar'>('days');
  let ready = $state(false);

  // Auth gate. When sync isn't configured there's no gate — the app is "authed".
  let authed = $state(!isSupabaseConfigured);
  let authChecked = $state(!isSupabaseConfigured);
  // Bumped to remount the day-scroll when the set of days changes from a pull.
  let refreshToken = $state(0);
  let dataLoaded = false;
  let syncWired = false;

  onMount(async () => {
    // Persist debounced edits when the app is backgrounded or closed — iOS may
    // never fire a clean 'unload', so 'pagehide' + visibility are the reliable
    // hooks.
    const flush = () => void entryStore.flush();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    if (isSupabaseConfigured) {
      const uid = await currentUserId();
      authChecked = true;
      if (uid) await handleSignedIn(uid);
      onAuthChange((session) => {
        if (session) void handleSignedIn(session.user.id);
        else authed = false;
      });
    } else {
      await ensureLoaded();
    }
  });

  /** Runs on every sign-in (including after a sign-out/account switch). */
  async function handleSignedIn(uid: string): Promise<void> {
    authed = true;
    // Reset the sync watermark / wipe the previous account's data if the user
    // changed, so we always re-pull the full history for this account.
    const reset = syncEngine ? await syncEngine.prepareForUser(uid) : false;
    const firstLoad = !dataLoaded;
    await ensureLoaded();
    if (reset && !firstLoad) await refreshFromLocal(); // reflect a mid-session switch

    if (syncEngine) {
      await syncEngine.backfillIfNeeded();
      if (!syncWired) {
        syncEngine.onChanged(() => void refreshFromLocal());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void syncEngine?.sync();
        });
        window.addEventListener('online', () => void syncEngine?.sync());
        syncWired = true;
      }
      void syncEngine.sync();
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (dataLoaded) return;
    today = todayKey();
    focus = today;
    await loadData();
    ready = true;
    dataLoaded = true;
  }

  async function loadData(): Promise<void> {
    const entryKeys = await repo.allKeys();
    entrySet = new Set(entryKeys);
    keys = buildDayList(entryKeys, today);
  }

  /**
   * A pull changed local data. Update calendar dots immediately, then remount the
   * day-scroll so both structural (new/removed days) and content changes surface.
   * Deferred while the user is typing so we never yank the focused field away.
   */
  async function refreshFromLocal(): Promise<void> {
    const entryKeys = await repo.allKeys();
    entrySet = new Set(entryKeys);
    const next = buildDayList(entryKeys, today);

    const apply = async () => {
      await entryStore.flush(); // persist any in-flight edit before dropping cache
      entryStore.invalidate(); // pulled text bypassed the cache — drop it
      keys = next;
      refreshToken += 1; // remount so rows reload fresh and windows re-anchor
    };
    const active = document.activeElement as HTMLElement | null;
    if (active?.tagName === 'TEXTAREA') {
      active.addEventListener('blur', () => void apply(), { once: true });
    } else {
      await apply();
    }
  }

  function toggleView(): void {
    view = view === 'days' ? 'calendar' : 'days';
  }

  /** Calendar tap: make sure the day is in the list, then jump to it to edit. */
  function pickDate(date: string): void {
    if (!keys.includes(date)) {
      keys = [...keys, date].sort(compareDayKeys);
    }
    focus = date;
    view = 'days';
  }
</script>

<div class="app">
  <svelte:boundary onerror={(error) => console.error('[journal] render error:', error)}>
    {#if !authed}
      {#if authChecked}
        <SignIn />
      {/if}
    {:else}
      <Toolbar store={entryStore} {view} onToggleView={toggleView} />
      <SyncBar />
      {#if ready}
        <StorageNote {settings} />
        {#if view === 'days'}
          <!-- Keyed by focus + refreshToken so a calendar tap or a pull-driven
               list change remounts the scroll, landing/anchoring cleanly. -->
          {#key `${focus}|${refreshToken}`}
            <DayScroll {keys} {today} {focus} store={entryStore} />
          {/key}
        {:else}
          <Calendar {today} {entrySet} onPick={pickDate} />
        {/if}
        <!-- Global formatting toolbar; self-hides unless a day is being edited. -->
        <FormatBar />
      {/if}
    {/if}

    {#snippet failed(error, reset)}
      <div class="crash" role="alert">
        <h2>Something went wrong</h2>
        <p>Your entries are safe on this device. Try recovering, or reload.</p>
        <pre>{String(error)}</pre>
        <div class="crash-actions">
          <button onclick={reset}>Try again</button>
          <button onclick={() => location.reload()}>Reload</button>
        </div>
      </div>
    {/snippet}
  </svelte:boundary>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 720px;
    margin: 0 auto;
  }

  .crash {
    padding: 24px 20px;
    overflow-y: auto;
  }

  .crash h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  .crash p {
    margin: 0 0 12px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .crash pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    background: var(--bg-elevated);
    padding: 12px;
    border-radius: 8px;
    color: var(--text);
  }

  .crash-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .crash-actions button {
    border: none;
    border-radius: 999px;
    background: var(--today-tint);
    color: var(--accent-text);
    font-weight: 600;
    padding: 8px 16px;
    cursor: pointer;
  }
</style>
