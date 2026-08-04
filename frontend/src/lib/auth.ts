import { authedFetch, API_BASE } from './supabase';

export async function signUp(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.msg || "Signup failed");
  }
  return persistLocalAuth(await res.json());
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return persistLocalAuth(await res.json());
}

// Local-auth fallback returns { access_token, user }. Store it so authedFetch
// can send the Bearer token and AuthContext can restore the session on reload.
function persistLocalAuth(res: any) {
  if (res?.access_token) {
    localStorage.setItem("local_token", res.access_token);
    if (res.user) localStorage.setItem("local_user", JSON.stringify(res.user));
    window.dispatchEvent(new Event("local-auth"));
  }
  return res;
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Reset failed");
  return res.json();
}
