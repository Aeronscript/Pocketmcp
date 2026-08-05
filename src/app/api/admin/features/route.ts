// src/app/api/admin/features/route.ts
// Grant ou revoke une beta feature pour un user (admin only).
//
// POST /api/admin/features
// Body: { deviceId, feature, action: "grant" | "revoke" }

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth, grantFeature, revokeFeature } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { deviceId, feature, action } = body;
  if (!deviceId || !feature || !action) {
    return NextResponse.json(
      { ok: false, error: "deviceId, feature et action requis" },
      { status: 400 }
    );
  }
  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json(
      { ok: false, error: "action doit être 'grant' ou 'revoke'" },
      { status: 400 }
    );
  }

  const data = loadAuth();
  const success = action === "grant"
    ? grantFeature(data, deviceId, feature)
    : revokeFeature(data, deviceId, feature);

  if (!success) {
    return NextResponse.json({ ok: false, error: "user introuvable" }, { status: 404 });
  }
  saveAuth(data);

  return NextResponse.json({ ok: true, deviceId, feature, action });
}
