import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'voice-messages';

let supabaseAdminInstance: SupabaseClient | null = null;
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns a Supabase client with admin/service-role privileges (server-side only).
 * Falls back to anon key if SUPABASE_SERVICE_ROLE_KEY is not defined.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAdminInstance;
}

/**
 * Returns a standard Supabase client (can be used on client or server with anon key).
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(url, key);
  }

  return supabaseClientInstance;
}
