import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';

interface AuthCtx {
  user: { id: string; email?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    getSupabase().then((s) => {
      s.auth.getSession()
        .then(({ data: { session } }) => setUser(session?.user ?? null))
        .catch(() => {})
        .finally(() => setLoading(false));
      try {
        const sub = s.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
        });
        unsub = sub.data.subscription.unsubscribe;
      } catch {}
    });
    return () => unsub?.();
  }, []);

  const signOut = async () => {
    const s = await getSupabase();
    await s.auth.signOut();
  };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
