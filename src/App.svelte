<script lang="ts">
  import { onMount } from 'svelte';
  import BrainHub from './components/BrainHub.svelte';
  import BrainButton from './components/BrainButton.svelte';
  import SignIn from './components/SignIn.svelte';
  import FormatBar from './components/FormatBar.svelte';
  import { entryStore, syncables } from './lib/app/stores';
  import { isSupabaseConfigured } from './lib/sync/supabaseClient';
  import { currentUserId, onAuthChange } from './lib/sync/auth';
  import { nav } from './lib/app/route.svelte';
  import { getSection } from './lib/sections/registry';

  // Auth gate. When sync isn't configured there's no gate — the app is "authed".
  let authed = $state(!isSupabaseConfigured);
  let authChecked = $state(!isSupabaseConfigured);
  let syncWired = false;

  // The active section's component (null while on the hub).
  const SectionComponent = $derived(
    nav.route.screen === 'section' ? (getSection(nav.route.id)?.component ?? null) : null,
  );

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
    }
  });

  /**
   * Runs on every sign-in (including after a sign-out/account switch). Reconciles
   * every sync engine — the entries journal plus each generic collection — so the
   * whole brain hub pulls its history and pushes local changes.
   */
  async function handleSignedIn(uid: string): Promise<void> {
    authed = true;
    // Reset watermarks / wipe a previous account's data across all engines.
    await Promise.all(syncables.map((s) => s.prepareForUser(uid)));
    await Promise.all(syncables.map((s) => s.backfillIfNeeded()));

    if (!syncWired) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void syncAll();
      });
      window.addEventListener('online', () => void syncAll());
      syncWired = true;
    }
    void syncAll();
  }

  function syncAll(): void {
    for (const s of syncables) void s.sync();
  }
</script>

<div class="app">
  <svelte:boundary onerror={(error) => console.error('[punk] render error:', error)}>
    {#if !authed}
      {#if authChecked}
        <SignIn />
      {/if}
    {:else}
      {#if nav.route.screen === 'hub'}
        <BrainHub />
      {:else if SectionComponent}
        <SectionComponent />
      {/if}
      <!-- Global chrome: return-to-hub button + the editing formatting toolbar. -->
      <BrainButton />
      <FormatBar />
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
