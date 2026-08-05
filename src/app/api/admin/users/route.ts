// src/app/api/admin/users/route.ts
// Liste tous les users (admin only).
// Retourne aussi les devices admin et les sessions actives.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const data = loadAuth();
  const now = Date.now();

  // Nettoie les sessions expirées pour pas les retourner
  const activeSessions = (data.sessions || []).filter(s => s.expiresAt > now);

  return NextResponse.json({
    ok: true,
    users: (data.users || []).map(u => ({
      deviceId: u.deviceId,
      code: u.code,
      claimedAt: u.claimedAt,
      banned: u.banned,
      bannedAt: u.bannedAt,
      bannedReason: u.bannedReason,
      features: u.features,
      lastSeen: u.lastSeen,
      lastIP: u.lastIP,
      label: u.label,
    })),
    adminDevices: (data.adminDevices || []).map(d => ({
      deviceId: d.deviceId,
      claimedAt: d.claimedAt,
      active: d.active,
      lastIP: d.lastIP,
      lastSeen: d.lastSeen,
      label: d.label,
    })),
    tempCodes: (data.tempCodes || []).map(t => ({
      code: t.code,
      createdAt: t.createdAt,
      claimed: t.claimed,
      claimedAt: t.claimedAt,
      claimedBy: t.claimedBy,
      label: t.label,
    })),
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
