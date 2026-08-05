// src/app/api/site-auth/check/route.ts
// Vérifie si un code est valide (pour les bridges qui download le bundle).
// Note : ce endpoint est PUBLIC (pas de rate limit) car utilisé par les scripts
// d'install. Le rate limit est sur /api/site-auth/login.

import { NextRequest, NextResponse } from "next/server";
import { loadAuth, hashCode } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "code requis" }, { status: 400 });

  const data = loadAuth();

  // Code admin : toujours valide pour download (le check se fait côté serveur)
  if (hashCode(code) === data.adminHash) {
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // Code pmcp_ : valide s'il existe dans tempCodes
  // Note : on ne vérifie pas "claimed" ici car c'est le code de download,
  // pas le code de login. Le claim se fait via /api/site-auth/login.
  const tempCode = (data.tempCodes || []).find((t) => t.code === code);
  if (tempCode) {
    return NextResponse.json({ ok: true, role: "user" });
  }

  return NextResponse.json({ ok: false, error: "session invalide" }, { status: 401 });
}
