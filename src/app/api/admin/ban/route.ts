// src/app/api/admin/ban/route.ts
// Ban un user par son deviceId (admin only).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth, banUser } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { deviceId, reason } = body;
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "deviceId requis" }, { status: 400 });
  }

  // Un admin ne peut pas se bannir lui-même
  if (deviceId === auth.deviceId) {
    return NextResponse.json({ ok: false, error: "tu ne peux pas te bannir toi-même" }, { status: 400 });
  }

  const data = loadAuth();
  const banned = banUser(data, deviceId, reason);
  if (!banned) {
    return NextResponse.json({ ok: false, error: "user introuvable" }, { status: 404 });
  }
  saveAuth(data);

  return NextResponse.json({ ok: true, banned: true, deviceId });
}
