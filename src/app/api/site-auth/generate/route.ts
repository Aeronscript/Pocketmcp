import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { loadAuth, saveAuth, hashCode, isValidCode } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  if (!isValidCode(adminCode) || hashCode(adminCode) !== loadAuth().adminHash) {
    return NextResponse.json({ ok: false, error: "accès admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const data = loadAuth();
  const code = "pmcp_" + randomBytes(6).toString("hex");
  data.tempCodes.push({ code, createdAt: Date.now(), claimed: false, label: body.label || undefined });
  saveAuth(data);
  return NextResponse.json({ ok: true, code, message: "code généré" });
}
