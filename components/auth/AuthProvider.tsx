"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  permissions?: string[];
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAuth: (token: string | null, user?: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "ott_auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Start with loading: true to prevent AuthGuard from redirecting before we check localStorage
  const [loading, setLoading] = useState<boolean>(true);

  // hydrate token from storage immediately on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY) || null;
      if (t) setToken(t);
    } catch {
      // ignore
    }
  }, []);

  // Public routes should not trigger session check
  const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

  function isPublicRoute(p?: string | null) {
    if (!p) return false;
    return PUBLIC_ROUTES.some((r) => p === r || p.startsWith(r + "/"));
  }

  // fetch profile on mount or token/pathname change (non-blocking). Only run when not on a public route
  useEffect(() => {
    let mounted = true;

    async function fetchMe() {
      if (isPublicRoute(pathname)) {
        // on public pages we skip session fetch
        setUser(null);
        setLoading(false);
        return;
      }

      // only call /api/auth/me if a token exists in localStorage or a non-httpOnly cookie is present
      let clientHasToken = false;
      try {
        const t = localStorage.getItem(STORAGE_KEY);
        if (t) clientHasToken = true;
      } catch {}

      try {
        if (!clientHasToken && typeof document !== "undefined") {
          clientHasToken = document.cookie.split(";").some((c) => c.trim().startsWith("auth_token="));
        }
      } catch {}

      if (!clientHasToken) {
        // No detectable token on client, avoid calling /api/auth/me to prevent unnecessary 401s
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
        if (!mounted) return;
        if (!res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (mounted) {
          setUser(data?.user ?? null);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    void fetchMe();
    return () => { mounted = false };
  }, [token, pathname]);

  const setAuth = (t: string | null, u: User | null = null) => {
    try {
      if (t) localStorage.setItem(STORAGE_KEY, t);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    // Attempt server logout but don't block UI
    try {
      void fetch("/api/auth/logout", { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
    } catch {}

    // Clear client storage
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
    } catch {}

    setToken(null);
    setUser(null);
    // navigate to login and replace history
    try {
      router.replace("/login");
    } catch {
      window.location.href = "/login";
    }
  };

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token) || Boolean(user),
    loading,
    setAuth,
    logout
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthProvider;
