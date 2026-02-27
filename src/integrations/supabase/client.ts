import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://qzelgoakigcjvhpxhqha.supabase.co";

// Accepts the standard Supabase anon key (VITE_SUPABASE_ANON_KEY)
// or the legacy Lovable publishable key (VITE_SUPABASE_PUBLISHABLE_KEY).
// IMPORTANT: Set VITE_SUPABASE_ANON_KEY in Cloudflare Pages dashboard
// with the JWT anon key from your Supabase project settings.
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_8DOf3EoIKBNNZLFOHV2pOQ_MXxmpMG3";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});