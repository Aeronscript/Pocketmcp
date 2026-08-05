import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const data = loadAuth();
  const code = "pmcp_" + randomBytes(6).toString("hex");
  data.tempCodes.push({ code, createdAt: Date.now(), claimed: false, label: body.label || undefined });
  saveAuth(data);
  return NextResponse.json({ ok: true, code, message: "code généré" });
}
