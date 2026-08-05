// src/app/api/site-auth/login/route.ts
// Login avec device binding + session persistante.
//
// Flow :
// 1. User envoie { code } dans le body
// 2. On récupère/crée le device ID (cookie + fingerprint)
// 3. Si code admin :
//    - Vérifie le hash SHA-256
//    - Si ce device est déjà admin → login direct
//    - Si un autre device est admin → 403 "admin déjà claimé"
//    - Sinon → claim admin pour ce device
// 4. Si code pmcp_ :
//    - Vérifie le code existe
//    - Si ce device est déjà enregistré → login direct
//    - Si code déjà claimé par un autre device → 403
//    - Sinon → claim code pour ce device
// 5. Crée une session (cookie signé HMAC, 30 jours)
// 6. Retourne { ok: true, role, deviceId }

import { NextRequest, NextResponse } from "next/server";
import { getClientIP, checkLoginRateLimit } from "@/lib/rate-limit";
import { loadAuth, saveAuth, hashCode, ensureAuthFile, claimAdmin, claimUserCode, isUserBanned } from "@/lib/auth-codes";
import { setDeviceCookieIfNeeded } from "@/lib/device";
import { createSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: `trop de tentatives — réessayez dans ${Math.ceil((rateCheck.retryAfter || 900) / 60)} min` },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter || 900) } }
    );
  }

  const body = await req.json();
  const code = body.code?.trim();
  if (!code) return NextResponse.json({ ok: false, error: "code requis" }, { status: 400 });

  ensureAuthFile();

  // Crée la réponse pour pouvoir set les cookies dessus
  const data = loadAuth();

  // Get device info (set cookie on response later)
  const deviceInfo = setDeviceCookieIfNeeded(req, new NextResponse());

  // Vérifie si ce device est banni (avant toute chose)
  if (isUserBanned(data, deviceInfo.deviceId)) {
    return NextResponse.json(
      { ok: false, error: "cet appareil est banni" },
      { status: 403 }
    );
  }

  // ─── Cas 1 : code admin ───────────────────────────────────
  if (hashCode(code) === data.adminHash) {
    const result = claimAdmin(data, deviceInfo.deviceId, ip);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 403 }
      );
    }
    saveAuth(data);

    // Crée la session et set les cookies
    const { token, session } = createSession(data, deviceInfo.deviceId, "admin", ip);
    saveAuth(data);

    const res = NextResponse.json({
      ok: true,
      role: "admin",
      deviceId: deviceInfo.deviceId,
      sessionId: session.sessionId,
      alreadyMine: result.alreadyMine || false,
    });
    // Set cookies
    if (deviceInfo.isNew) {
      res.cookies.set("pocketmcp_device", deviceInfo.deviceUUID, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 365 * 24 * 60 * 60,
        path: "/",
      });
    }
    res.cookies.set("pocketmcp_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  }

  // ─── Cas 2 : code pmcp_ (user) ────────────────────────────
  const result = claimUserCode(data, code, deviceInfo.deviceId, ip);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 403 }
    );
  }
  saveAuth(data);

  const { token, session } = createSession(data, deviceInfo.deviceId, "user", ip);
  saveAuth(data);

  const res = NextResponse.json({
    ok: true,
    role: "user",
    deviceId: deviceInfo.deviceId,
    sessionId: session.sessionId,
  });
  if (deviceInfo.isNew) {
    res.cookies.set("pocketmcp_device", deviceInfo.deviceUUID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 365 * 24 * 60 * 60,
      path: "/",
    });
  }
  res.cookies.set("pocketmcp_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}

// GET : vérifie si on a une session active (pour le frontend au chargement)
export async function GET(req: NextRequest) {
  const { getCurrentUser } = await import("@/lib/sessions");
  const { getDeviceInfo } = await import("@/lib/device");
  const user = getCurrentUser(req);
  const info = getDeviceInfo(req);

  if (!user || !user.valid) {
    return NextResponse.json({
      ok: false,
      authenticated: false,
      deviceId: info.deviceId,
      banned: user?.banned || false,
    });
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    role: user.role,
    deviceId: user.deviceId,
    features: user.features,
  });
}
