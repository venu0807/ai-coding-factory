const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function falseClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
  };
}

let _supabase: any = null;
let _supabaseLoading = false;
let _initError: string | null = null;

export function getSupabaseError() { return _initError; }

export async function getSupabase() {
  if (_supabaseLoading || _supabase) return _supabase || falseClient();
  _supabaseLoading = true;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    _supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e: any) {
    _initError = e?.message || String(e);
    console.error("Supabase init error:", _initError);
    _supabase = false;
  }
  return _supabase || falseClient();
}

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function authedFetch(path: string, init?: RequestInit) {
  const s = await getSupabase();
  const token = s.auth ? (await s.auth.getSession()).data.session?.access_token : undefined;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> || {}),
  };
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}