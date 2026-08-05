"use client";

import { useState, useEffect, useCallback } from "react";

interface AuthState {
  isLoggedIn: boolean;
  role: "admin" | "user" | null;
  deviceId: string | null;
  features: string[];
  loading: boolean;
}

export function useAuth(): AuthState & {
  login: (code: string) => Promise<{ ok: boolean; error?: string; role?: string }>;
  logout: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    role: null,
    deviceId: null,
    features: [],
    loading: true,
  });

  // Au chargement : vérifie si on a une session active (cookie httpOnly)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-auth/me", { credentials: "same-origin" })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.ok && data.authenticated) {
          setState({
            isLoggedIn: true,
            role: data.role,
            deviceId: data.deviceId,
            features: data.features || [],
            loading: false,
          });
        } else {
          setState({
            isLoggedIn: false,
            role: null,
            deviceId: data.deviceId || null,
            features: [],
            loading: false,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          isLoggedIn: false,
          role: null,
          deviceId: null,
          features: [],
          loading: false,
        });
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (code: string): Promise<{ ok: boolean; error?: string; role?: string }> => {
    try {
      const res = await fetch("/api/site-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setState({
          isLoggedIn: true,
          role: data.role,
          deviceId: data.deviceId,
          features: data.role === "admin" ? ["*"] : [],
          loading: false,
        });
        return { ok: true, role: data.role };
      }
      return { ok: false, error: data.error || "code invalide" };
    } catch {
      return { ok: false, error: "erreur de connexion" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/site-auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {}
    setState({
      isLoggedIn: false,
      role: null,
      deviceId: null,
      features: [],
      loading: false,
    });
  }, []);

  return { ...state, login, logout };
}
