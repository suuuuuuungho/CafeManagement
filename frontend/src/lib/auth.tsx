import { createContext, useContext, useState, type ReactNode } from "react";
import { api, type TokenResponse, type UserRole } from "./api";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  venueId: string | null;
  venueSlug: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (body: {
    email: string;
    password: string;
    venue_name: string;
    venue_slug: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_account_holder?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitialState(): AuthState {
  return {
    token: localStorage.getItem("access_token"),
    role: (localStorage.getItem("role") as UserRole | null) ?? null,
    venueId: localStorage.getItem("venue_id"),
    venueSlug: localStorage.getItem("venue_slug"),
  };
}

function persist(res: TokenResponse) {
  localStorage.setItem("access_token", res.access_token);
  if (res.role) localStorage.setItem("role", res.role);
  if (res.venue_id) localStorage.setItem("venue_id", res.venue_id);
  if (res.venue_slug) localStorage.setItem("venue_slug", res.venue_slug);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState);

  async function login(email: string, password: string) {
    const res = await api.post<TokenResponse>("/api/auth/login", { email, password });
    persist(res);
    setState({ token: res.access_token, role: res.role, venueId: res.venue_id, venueSlug: res.venue_slug });
  }

  async function signup(body: Parameters<AuthContextValue["signup"]>[0]) {
    const res = await api.post<TokenResponse>("/api/auth/signup", body);
    persist(res);
    setState({ token: res.access_token, role: res.role, venueId: res.venue_id, venueSlug: res.venue_slug });
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("venue_id");
    localStorage.removeItem("venue_slug");
    setState({ token: null, role: null, venueId: null, venueSlug: null });
  }

  return <AuthContext.Provider value={{ ...state, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
