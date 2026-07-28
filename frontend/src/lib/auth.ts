import { getSupabase } from './supabase';

export async function signUp(email: string, password: string) {
  const s = await getSupabase();
  const { data, error } = await s.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const s = await getSupabase();
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const s = await getSupabase();
  const { error } = await s.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const s = await getSupabase();
  const { data } = await s.auth.getSession();
  return data.session;
}
