import { NextRequest, NextResponse } from "next/server";
import { loadAuth, saveAuth, hashCode, isValidCode } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const data = loadAuth();
  if (!isValidCode(adminCode) || hashCode(adminCode) !== data.adminHash) {
    return NextResponse.json({ ok: false, error: "accès admin requis" }, { status: 403 });
  }
  const body = await req.json();
  const idx = data.tempCodes.findIndex((t: any) => t.code === body.code);
  if (idx === -1) return NextResponse.json({ ok: false, error: "code introuvable" }, { status: 404 });
  data.tempCodes.splice(idx, 1);
  saveAuth(data);
  return NextResponse.json({ ok: true, message: "code révoqué" });
}
