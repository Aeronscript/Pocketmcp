import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function loadAuth(): any { try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {} return { adminHash: "", tempCodes: [] }; }
export async function GET(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const data = loadAuth();
  if (!adminCode || hashCode(adminCode) !== data.adminHash) return NextResponse.json({ ok: false, error: "accès admin requis" }, { status: 403 });
  return NextResponse.json({ ok: true, codes: data.tempCodes.map((t: any) => ({ code: t.code, createdAt: t.createdAt, claimed: t.claimed, claimedAt: t.claimedAt, label: t.label })) });
}
