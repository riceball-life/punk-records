import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * Canonicalize an email so the same inbox always maps to one account.
 * Lower-cases, and for Gmail strips dots and any `+tag` (Gmail ignores both) —
 * otherwise `andd.hong@` and `anddhong@` become two separate Supabase users.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return trimmed;
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.split('+')[0]!.replace(/\./g, '');
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

/** Current user id, or undefined when signed out / sync not configured. */
export async function currentUserId(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Send a sign-in email. With the email template exposing `{{ .Token }}`, the
 * message contains a 6-digit code (typed in-app — the reliable path for an
 * installed iOS PWA); `emailRedirectTo` keeps the magic link working as a
 * Safari fallback.
 */
export async function sendCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** Verify the 6-digit email code and establish the session. */
export async function verifyCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured');
  const { error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'email',
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
