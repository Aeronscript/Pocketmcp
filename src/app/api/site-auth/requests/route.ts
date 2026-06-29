import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash, randomBytes } from "crypto";
const REQUESTS_FILE = join(process.cwd(), "data", "access-requests.json");
const AUTH_FILE = join(process.cwd(), "data", "auth-codes.json");
interface AccessRequest { id: string; email: string; name: string; message: string; createdAt: number; status: "pending" | "approved" | "rejected"; generatedCode?: string; }
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function loadRequests(): AccessRequest[] { try { if (existsSync(REQUESTS_FILE)) return JSON.parse(readFileSync(REQUESTS_FILE, "utf-8")); } catch {} return []; }
function saveRequests(r: AccessRequest[]) { try { writeFileSync(REQUESTS_FILE, JSON.stringify(r, null, 2)); } catch {} }
function loadAuth(): any { try { return JSON.parse(readFileSync(AUTH_FILE, "utf-8")); } catch { return { adminHash: "", tempCodes: [] }; } }
function saveAuth(d: any) { try { writeFileSync(AUTH_FILE, JSON.stringify(d, null, 2)); } catch {} }
export async function GET(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const auth = loadAuth();
  if (hashCode(adminCode) !== auth.adminHash) return NextResponse.json({ ok: false, error: "admin requis" }, { status: 403 });
  return NextResponse.json({ ok: true, requests: loadRequests() });
}
export async function POST(req: NextRequest) {
  const adminCode = req.headers.get("Authorization")?.slice(7) || "";
  const auth = loadAuth();
  if (hashCode(adminCode) !== auth.adminHash) return NextResponse.json({ ok: false, error: "admin requis" }, { status: 403 });
  const { action, requestId } = await req.json();
  const requests = loadRequests();
  const request = requests.find(r => r.id === requestId);
  if (!request) return NextResponse.json({ ok: false, error: "introuvable" }, { status: 404 });
  if (action === "approve") {
    const code = "pmcp_" + randomBytes(6).toString("hex");
    auth.tempCodes.push({ code, createdAt: Date.now(), claimed: false, label: `${request.name} (${request.email})` });
    saveAuth(auth);
    request.status = "approved"; request.generatedCode = code; saveRequests(requests);
    const mailtoUrl = `mailto:${request.email}?subject=${encodeURIComponent("[pocketmcp] votre code")}&body=${encodeURIComponent(`Bonjour ${request.name},\n\nVotre code d'accès (à usage unique) :\n${code}`)}`;
    return NextResponse.json({ ok: true, action: "approved", code, mailtoUrl });
  }
  if (action === "reject") { request.status = "rejected"; saveRequests(requests); return NextResponse.json({ ok: true, action: "rejected" }); }
  return NextResponse.json({ ok: false, error: "action invalide" }, { status: 400 });
}
