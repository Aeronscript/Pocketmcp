import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes, createHash } from "crypto";
import { getClientIP, checkLoginRateLimit } from "@/lib/rate-limit";

const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");
interface AuthData { adminHash: string; tempCodes: any[]; }
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function loadAuth(): AuthData {
  try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {}
  const adminCode = "Robloxmcp-" + randomBytes(8).toString("hex");
  const data: AuthData = { adminHash: hashCode(adminCode), tempCodes: [] };
  try { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); console.log("CODE ADMIN:", adminCode); } catch {}
  return data;
}
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) return NextResponse.json({ ok: false, error: `trop de tentatives — réessayez dans ${Math.ceil((rateCheck.retryAfter || 900) / 60)} min` }, { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter || 900) } });
  const body = await req.json();
  const code = body.code?.trim();
  if (!code) return NextResponse.json({ ok: false, error: "code requis" }, { status: 400 });
  const data = loadAuth();
  if (hashCode(code) === data.adminHash) return NextResponse.json({ ok: true, role: "admin" });
  const tempCode = data.tempCodes.find((t: any) => t.code === code);
  if (!tempCode) return NextResponse.json({ ok: false, error: "code invalide" }, { status: 401 });
  if (tempCode.claimed) return NextResponse.json({ ok: false, error: "ce code a déjà été utilisé" }, { status: 401 });
  tempCode.claimed = true; tempCode.claimedAt = Date.now();
  try { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch {}
  return NextResponse.json({ ok: true, role: "user" });
}
