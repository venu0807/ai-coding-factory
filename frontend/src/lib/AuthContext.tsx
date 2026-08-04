import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "./supabase";

interface AuthCtx {
  user: { id: string; email?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore local-auth session first (persisted by lib/auth.ts)
    const raw = localStorage.getItem("local_user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore corrupt */ }
    }
    getSupabase().then((s) => {
      s.auth
        .getSession()
        .then(({ data: { session } }: any) => {
          if (session?.user)
            setUser({ id: session.user.id, email: session.user.email });
          setLoading(false);
        });
      const {
        data: { subscription },
      } = s.auth.onAuthStateChange((_event: string, session: any) => {
        if (session?.user)
          setUser({ id: session.user.id, email: session.user.email });
        else setUser(null);
      });
      return () => subscription.unsubscribe();
    });

    const onLocalAuth = () => {
      const u = localStorage.getItem("local_user");
      if (u) {
        try { setUser(JSON.parse(u)); } catch { /* ignore */ }
      }
      setLoading(false);
    };
    window.addEventListener("local-auth", onLocalAuth);
    return () => window.removeEventListener("local-auth", onLocalAuth);
  }, []);

  const signOut = async () => {
    const s = await getSupabase();
    await s.auth.signOut();
    localStorage.removeItem("local_token");
    localStorage.removeItem("local_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
