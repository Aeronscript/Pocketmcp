// src/app/api/admin/sessions/route.ts
// Liste les sessions actives (admin only).
// Permet aussi de révoquer une session via DELETE.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth, revokeSession, revokeAllSessions } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const data = loadAuth();
  const now = Date.now();
  const activeSessions = (data.sessions || []).filter(s => s.expiresAt > now);

  return NextResponse.json({
    ok: true,
    sessions: activeSessions.map(s => ({
      sessionId: s.sessionId,
      deviceId: s.deviceId,
      role: s.role,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      lastIP: s.lastIP,
    })),
  });
}

// DELETE : révoque une session
// Body: { sessionId } OU { deviceId } (pour revoke toutes les sessions d'un device)
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { sessionId, deviceId } = body;

  const data = loadAuth();
  let revoked = 0;

  if (sessionId) {
    if (revokeSession(data, sessionId)) revoked = 1;
  } else if (deviceId) {
    // Un admin ne peut pas révoquer ses propres sessions
    if (deviceId === auth.deviceId) {
      return NextResponse.json(
        { ok: false, error: "utilise /api/site-auth/logout pour te déconnecter" },
        { status: 400 }
      );
    }
    revoked = revokeAllSessions(data, deviceId);
  } else {
    return NextResponse.json(
      { ok: false, error: "sessionId ou deviceId requis" },
      { status: 400 }
    );
  }

  saveAuth(data);
  return NextResponse.json({ ok: true, revoked });
}
