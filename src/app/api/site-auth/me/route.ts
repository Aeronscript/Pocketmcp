// src/app/api/site-auth/me/route.ts
// Retourne les infos du user courant (si authentifié).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/sessions";
import { getDeviceInfo } from "@/lib/device";

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  const info = getDeviceInfo(req);

  if (!user || !user.valid) {
    const res = NextResponse.json({
      ok: false,
      authenticated: false,
      deviceId: info.deviceId,
      banned: user?.banned || false,
    });

    // Set device cookie si nouveau
    if (info.isNew) {
      res.cookies.set("pocketmcp_device", info.deviceUUID, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 365 * 24 * 60 * 60,
        path: "/",
      });
    }
    return res;
  }

  const res = NextResponse.json({
    ok: true,
    authenticated: true,
    role: user.role,
    deviceId: user.deviceId,
    sessionId: user.sessionId,
    features: user.features,
  });

  if (info.isNew) {
    res.cookies.set("pocketmcp_device", info.deviceUUID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 365 * 24 * 60 * 60,
      path: "/",
    });
  }
  return res;
}
