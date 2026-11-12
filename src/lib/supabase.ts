import { createClient } from '@supabase/supabase-js';

// These are intentionally public browser credentials (publishable key), protected by database RLS.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://rnsbjfgnefwxdiymmoep.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable__FP5lCfijY19WsQtctn4aw_4RFC08WM';

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
