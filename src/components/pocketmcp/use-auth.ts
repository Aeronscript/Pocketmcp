"use client";

import { useState, useEffect, useCallback } from "react";

interface AuthState {
  isLoggedIn: boolean;
  role: "admin" | "user" | null;
  code: string | null;
  loading: boolean;
}

const SESSION_KEY = "pmcp_auth_code";

export function useAuth(): AuthState & {
  login: (code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
} {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    role: null,
    code: null,
    loading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      Promise.resolve().then(() => setState(prev => ({ ...prev, loading: false })));
      return;
    }
    let cancelled = false;
    fetch(`/api/site-auth/check?code=${encodeURIComponent(stored)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.ok) {
          setState({ isLoggedIn: true, role: data.role, code: stored, loading: false });
        } else {
          localStorage.removeItem(SESSION_KEY);
          setState({ isLoggedIn: false, role: null, code: null, loading: false });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ isLoggedIn: false, role: null, code: null, loading: false });
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (code: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/site-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem(SESSION_KEY, code);
        setState({ isLoggedIn: true, role: data.role, code, loading: false });
        return { ok: true };
      }
      return { ok: false, error: data.error || "code invalide" };
    } catch {
      return { ok: false, error: "erreur de connexion" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState({ isLoggedIn: false, role: null, code: null, loading: false });
  }, []);

  return { ...state, login, logout };
}
