import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether cloud sync is configured. When false, the app runs exactly as before
 * — local-only IndexedDB, no sign-in, no network — so it never breaks just
 * because env vars are missing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** The Supabase client, or `null` when sync isn't configured. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Magic-link callbacks land back on our URL with the token in the hash.
        detectSessionInUrl: true,
      },
    })
  : null;
