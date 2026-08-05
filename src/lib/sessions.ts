// src/lib/sessions.ts
// Gestion des sessions : cookie `pocketmcp_session` signé HMAC.
//
// Format du cookie : base64url(payload).signature
// Payload : { sessionId, deviceId, role, exp }
// Signature : HMAC-SHA256 avec SESSION_SECRET
//
// Le cookie est httpOnly + secure (prod) + sameSite=lax.
// Durée : 30 jours.
//
// Vérification :
// 1. Signature valide (HMAC)
// 2. Pas expirée (exp > now)
// 3. Session existe encore dans data.auth-codes.json.sessions
// 4. Device pas banni
// 5. Si admin : device toujours actif dans adminDevices

import { NextRequest, NextResponse } from "next/server";
import {
  loadAuth, saveAuth, verifySessionToken, createSession, revokeSession,
  type Session,
} from "./auth-codes";
import { getDeviceInfo } from "./device";

const SESSION_COOKIE = "pocketmcp_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours en secondes

// Re-export createSession pour que les routes puissent l'utiliser
export { createSession };

export interface SessionUser {
  deviceId: string;
  role: "admin" | "user";
  sessionId: string;
  features: string[];
  banned: boolean;
  valid: boolean;
}

// Vérifie la session courante et retourne les infos user
export function getCurrentUser(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const data = loadAuth();
  // Vérifie que la session existe encore dans la DB
  const session = data.sessions.find(s => s.sessionId === payload.sessionId);
  if (!session) return null;

  // Vérifie le device
  if (payload.role === "admin") {
    const adminDev = data.adminDevices.find(d => d.deviceId === payload.deviceId && d.active);
    if (!adminDev) return null;
  } else {
    const user = data.users.find(u => u.deviceId === payload.deviceId);
    if (!user) return null;
    if (user.banned) {
      return {
        deviceId: payload.deviceId,
        role: "user",
        sessionId: payload.sessionId,
        features: [],
        banned: true,
        valid: false,
      };
    }
    return {
      deviceId: payload.deviceId,
      role: "user",
      sessionId: payload.sessionId,
      features: user.features,
      banned: false,
      valid: true,
    };
  }

  return {
    deviceId: payload.deviceId,
    role: "admin",
    sessionId: payload.sessionId,
    features: ["*"], // admin a tout
    banned: false,
    valid: true,
  };
}

// Détruit la session courante (logout)
export function endSession(req: NextRequest, res: NextResponse): boolean {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    res.cookies.delete(SESSION_COOKIE);
    return false;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.cookies.delete(SESSION_COOKIE);
    return false;
  }

  const data = loadAuth();
  const revoked = revokeSession(data, payload.sessionId);
  if (revoked) saveAuth(data);

  res.cookies.delete(SESSION_COOKIE);
  return revoked;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
