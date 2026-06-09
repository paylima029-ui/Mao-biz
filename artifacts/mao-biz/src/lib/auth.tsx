import { createContext, useContext, useEffect, useState } from "react";

interface AuthState {
  isAuthenticated: boolean | null;
  username: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me", { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error("not authenticated");
      })
      .then((data) => {
        setIsAuthenticated(true);
        setUsername(data.username);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUsername(null);
      });
  }, []);

  async function login(username: string, password: string) {
    const r = await fetch("/api/admin/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (r.ok) {
      setIsAuthenticated(true);
      setUsername(username);
      return { ok: true };
    }
    const data = await r.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "Erreur de connexion" };
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
