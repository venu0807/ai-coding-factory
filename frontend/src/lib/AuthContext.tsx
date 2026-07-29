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
  }, []);

  const signOut = async () => {
    const s = await getSupabase();
    await s.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
