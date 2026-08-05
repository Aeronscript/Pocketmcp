// src/app/api/site-auth/logout/route.ts
// Logout : détruit la session courante et clear le cookie.

import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  endSession(req, res);
  return res;
}
