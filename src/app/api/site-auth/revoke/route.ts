import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth } from "@/lib/auth-codes";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const data = loadAuth();
  const idx = data.tempCodes.findIndex((t) => t.code === body.code);
  if (idx === -1) return NextResponse.json({ ok: false, error: "code introuvable" }, { status: 404 });
  data.tempCodes.splice(idx, 1);
  saveAuth(data);
  return NextResponse.json({ ok: true, message: "code révoqué" });
}
