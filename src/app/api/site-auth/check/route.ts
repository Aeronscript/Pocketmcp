import { NextRequest, NextResponse } from "next/server";
import { loadAuth, hashCode, isValidCode } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "code requis" }, { status: 400 });
  const data = loadAuth();
  if (hashCode(code) === data.adminHash) return NextResponse.json({ ok: true, role: "admin" });
  const tempCode = (data.tempCodes || []).find((t: any) => t.code === code);
  if (tempCode && tempCode.claimed) return NextResponse.json({ ok: true, role: "user" });
  return NextResponse.json({ ok: false, error: "session invalide" }, { status: 401 });
}
