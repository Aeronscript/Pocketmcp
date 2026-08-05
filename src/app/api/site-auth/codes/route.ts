import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth } from "@/lib/auth-codes";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const data = loadAuth();
  return NextResponse.json({
    ok: true,
    codes: (data.tempCodes || []).map((t) => ({
      code: t.code,
      createdAt: t.createdAt,
      claimed: t.claimed,
      claimedAt: t.claimedAt,
      claimedBy: t.claimedBy,
      label: t.label,
    })),
  });
}
