// src/lib/device.ts
// Gestion du device ID : hash(cookie UUID + fingerprint navigateur)
//
// - Cookie `pocketmcp_device` (UUID, 10 ans) → persistant sur l'appareil
// - Fingerprint (UA + lang + timezone) → si cookie cleared, permet de retrouver le device
//
// Le device ID est une chaîne de 64 chars hex (SHA-256).
// Il est stable : un user qui revient avec le même navigateur aura le même device ID.

import { NextRequest, NextResponse } from "next/server";
import { computeDeviceId, generateDeviceUUID } from "./auth-codes";

const DEVICE_COOKIE = "pocketmcp_device";
const DEVICE_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60; // 10 ans

// Fingerprint basé sur les headers HTTP que le navigateur envoie toujours.
// Pas besoin de JS côté client — on utilise ce que le serveur reçoit.
function getFingerprint(req: NextRequest): string {
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";
  // Les headers suivants sont moins fiables mais ajoutent de l'entropie
  const accept = req.headers.get("accept") || "";
  const encoding = req.headers.get("accept-encoding") || "";
  // Sec-CH-UA (Chromium seulement) — header client hint
  const secChUa = req.headers.get("sec-ch-ua") || "";
  return [ua, lang, accept, encoding, secChUa].join("|");
}

// Récupère le device UUID existant depuis le cookie, ou en génère un nouveau
function getDeviceUUID(req: NextRequest): { uuid: string; isNew: boolean } {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing) return { uuid: existing, isNew: false };
  return { uuid: generateDeviceUUID(), isNew: true };
}

// Set le cookie device sur la réponse si pas déjà présent
export function setDeviceCookieIfNeeded(req: NextRequest, res: NextResponse): { deviceId: string; deviceUUID: string; isNew: boolean } {
  const { uuid, isNew } = getDeviceUUID(req);
  if (isNew) {
    res.cookies.set(DEVICE_COOKIE, uuid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: DEVICE_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  const fingerprint = getFingerprint(req);
  const deviceId = computeDeviceId(uuid, fingerprint);
  return { deviceId, deviceUUID: uuid, isNew };
}

// Récupère le device ID sans set le cookie (pour vérifier uniquement)
export function getDeviceInfo(req: NextRequest): { deviceId: string; deviceUUID: string; fingerprint: string; isNew: boolean } {
  const { uuid, isNew } = getDeviceUUID(req);
  const fingerprint = getFingerprint(req);
  const deviceId = computeDeviceId(uuid, fingerprint);
  return { deviceId, deviceUUID: uuid, fingerprint, isNew };
}

export { DEVICE_COOKIE };
