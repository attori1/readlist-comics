import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authMe, authLogin, authRegister, authLogout } from "./api";
import type { User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authMe().then((u) => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) { setUser(await authLogin(email, password)); }
  async function register(email: string, password: string) { setUser(await authRegister(email, password)); }
  async function logout() { await authLogout(); setUser(null); }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}