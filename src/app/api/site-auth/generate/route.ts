import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes, createHash } from "crypto";
const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function loadAuth(): any { try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {} return { adminHash: "", tempCodes: [] }; }
function saveAuth(data: any) { try { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch {} }
export async function POST(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const data = loadAuth();
  if (!adminCode || hashCode(adminCode) !== data.adminHash) return NextResponse.json({ ok: false, error: "accès admin requis" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const code = "pmcp_" + randomBytes(6).toString("hex");
  data.tempCodes.push({ code, createdAt: Date.now(), claimed: false, label: body.label || undefined });
  saveAuth(data);
  return NextResponse.json({ ok: true, code, message: "code généré" });
}
