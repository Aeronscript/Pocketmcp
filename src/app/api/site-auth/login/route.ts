import { NextRequest, NextResponse } from "next/server";
import { getClientIP, checkLoginRateLimit } from "@/lib/rate-limit";
import { loadAuth, saveAuth, hashCode, ensureAuthFile } from "@/lib/auth-codes";

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

  // Garantit que le fichier auth existe (génère un admin code au 1er lancement
  // si le repo vient d'être cloné et que data/auth-codes.json est absent/gitignoré).
  ensureAuthFile();

  const data = loadAuth();
  if (hashCode(code) === data.adminHash) return NextResponse.json({ ok: true, role: "admin" });
  const tempCode = data.tempCodes.find((t) => t.code === code);
  if (!tempCode) return NextResponse.json({ ok: false, error: "code invalide" }, { status: 401 });
  if (tempCode.claimed) return NextResponse.json({ ok: false, error: "ce code a déjà été utilisé" }, { status: 401 });
  tempCode.claimed = true;
  tempCode.claimedAt = Date.now();
  saveAuth(data);
  return NextResponse.json({ ok: true, role: "user" });
}
