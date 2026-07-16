<script lang="ts">
  import { sendCode, verifyCode } from '../lib/sync/auth';

  type Step = 'email' | 'code';

  /** Pull a readable message out of whatever Supabase threw, and log the raw error. */
  function describe(err: unknown): string {
    console.error('[journal] auth error:', err);
    if (err instanceof Error && err.message) return err.message;
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      if (typeof o.message === 'string' && o.message) return o.message;
      if (typeof o.error_description === 'string') return o.error_description;
    }
    return 'Could not send the code. Check the browser console for details.';
  }

  let step = $state<Step>('email');
  let email = $state('');
  let code = $state('');
  let busy = $state(false);
  let errorMsg = $state('');

  async function submitEmail(e: Event): Promise<void> {
    e.preventDefault();
    if (!email.trim() || busy) return;
    busy = true;
    errorMsg = '';
    try {
      await sendCode(email.trim());
      step = 'code';
    } catch (err) {
      errorMsg = describe(err);
    } finally {
      busy = false;
    }
  }

  async function submitCode(e: Event): Promise<void> {
    e.preventDefault();
    if (code.trim().length < 6 || busy) return;
    busy = true;
    errorMsg = '';
    try {
      await verifyCode(email.trim(), code.trim());
      // On success the auth listener in App.svelte switches to the journal.
    } catch (err) {
      errorMsg = describe(err);
    } finally {
      busy = false;
    }
  }

  async function resend(): Promise<void> {
    if (busy) return;
    busy = true;
    errorMsg = '';
    try {
      await sendCode(email.trim());
    } catch (err) {
      errorMsg = describe(err);
    } finally {
      busy = false;
    }
  }

  function changeEmail(): void {
    step = 'email';
    code = '';
    errorMsg = '';
  }
</script>

<div class="signin">
  <div class="card">
    <h1>Punk Records</h1>

    {#if step === 'email'}
      <p class="lede">Sign in to sync</p>
      <p class="sub">Enter your email and we'll send a sign-in code — no password.</p>
      <form onsubmit={submitEmail}>
        <input
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
          inputmode="email"
          required
        />
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
      </form>
    {:else}
      <p class="lede">Enter your code</p>
      <p class="sub">
        We emailed a sign-in code to <strong>{email}</strong>. Enter it here to sign in.
      </p>
      <form onsubmit={submitCode}>
        <input
          type="text"
          bind:value={code}
          placeholder="Code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="10"
          class="code-input"
          required
        />
        <button type="submit" disabled={busy || code.trim().length === 0}>
          {busy ? 'Verifying…' : 'Verify & sign in'}
        </button>
      </form>
      <div class="secondary">
        <button type="button" class="link" onclick={resend} disabled={busy}>Resend code</button>
        <button type="button" class="link" onclick={changeEmail} disabled={busy}>
          Change email
        </button>
      </div>
    {/if}

    {#if errorMsg}
      <p class="err">{errorMsg}</p>
    {/if}
  </div>
</div>

<style>
  .signin {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px calc(env(safe-area-inset-left) + 20px);
  }

  .card {
    width: 100%;
    max-width: 360px;
    text-align: center;
  }

  h1 {
    margin: 0 0 24px;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .lede {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
  }

  .sub {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    border: 0.5px solid var(--separator);
    border-radius: 10px;
    background: var(--bg-elevated);
    color: var(--text);
    text-align: center;
  }

  .code-input {
    font-size: 24px;
    letter-spacing: 0.3em;
    font-variant-numeric: tabular-nums;
  }

  button[type='submit'] {
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    background: var(--today-tint);
    color: var(--accent-text);
    font-weight: 600;
    cursor: pointer;
  }

  button[type='submit']:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .secondary {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 16px;
  }

  .link {
    border: none;
    background: transparent;
    color: var(--today-tint);
    font-size: 13px;
    cursor: pointer;
    padding: 4px;
  }

  .link:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .err {
    margin: 16px 0 0;
    font-size: 13px;
    color: #ff453a;
  }
</style>
