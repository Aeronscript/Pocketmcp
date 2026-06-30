import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function loadAuth(): any { try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {} return { adminHash: "", tempCodes: [] }; }
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
