import { NextRequest, NextResponse } from "next/server";
import { loadAuth, hashCode, isValidCode } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const data = loadAuth();
  if (!isValidCode(adminCode) || hashCode(adminCode) !== data.adminHash) {
    return NextResponse.json({ ok: false, error: "accès admin requis" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    codes: data.tempCodes.map((t) => ({
      code: t.code,
      createdAt: t.createdAt,
      claimed: t.claimed,
      claimedAt: t.claimedAt,
      label: t.label,
    })),
  });
}
