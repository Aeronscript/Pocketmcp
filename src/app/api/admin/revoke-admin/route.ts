// src/app/api/admin/revoke-admin/route.ts
// Révoque un device admin (admin only).
// Permet de "libérer" le slot admin pour qu'un autre device puisse le claim.
//
// ATTENTION : si tu révoques ton propre device admin, tu perds l'accès admin
// jusqu'à ce que tu re-utilises le code admin pour re-claim.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth, revokeAdmin } from "@/lib/auth-codes";
import { endSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { deviceId } = body;
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "deviceId requis" }, { status: 400 });
  }

  const data = loadAuth();
  const revoked = revokeAdmin(data, deviceId);
  if (!revoked) {
    return NextResponse.json({ ok: false, error: "device admin introuvable" }, { status: 404 });
  }
  saveAuth(data);

  // Si l'admin révoque son propre device, on le logout
  const res = NextResponse.json({ ok: true, revoked: true, deviceId });
  if (deviceId === auth.deviceId) {
    endSession(req, res);
  }

  return res;
}
