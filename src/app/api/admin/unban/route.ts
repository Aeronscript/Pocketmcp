// src/app/api/admin/unban/route.ts
// Débannir un user par son deviceId (admin only).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth, unbanUser } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { deviceId } = body;
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "deviceId requis" }, { status: 400 });
  }

  const data = loadAuth();
  const unbanned = unbanUser(data, deviceId);
  if (!unbanned) {
    return NextResponse.json({ ok: false, error: "user introuvable" }, { status: 404 });
  }
  saveAuth(data);

  return NextResponse.json({ ok: true, unbanned: true, deviceId });
}
