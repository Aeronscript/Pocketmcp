// src/lib/admin-auth.ts
// Helper pour vérifier qu'une requête vient d'un admin authentifié.
// À utiliser dans toutes les routes /api/admin/*.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./sessions";

export function requireAdmin(req: NextRequest): { ok: true; deviceId: string } | { ok: false; response: NextResponse } {
  const user = getCurrentUser(req);
  if (!user || !user.valid || user.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "admin requis" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, deviceId: user.deviceId };
}
