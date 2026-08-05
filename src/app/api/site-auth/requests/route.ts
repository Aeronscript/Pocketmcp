import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAuth, saveAuth } from "@/lib/auth-codes";

const REQUESTS_FILE = join(process.cwd(), "data", "access-requests.json");
interface AccessRequest {
  id: string;
  email: string;
  name: string;
  message: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
  generatedCode?: string;
}
function loadRequests(): AccessRequest[] {
  try { if (existsSync(REQUESTS_FILE)) return JSON.parse(readFileSync(REQUESTS_FILE, "utf-8")); } catch {}
  return [];
}
function saveRequests(r: AccessRequest[]) {
  try { writeFileSync(REQUESTS_FILE, JSON.stringify(r, null, 2)); } catch {}
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, requests: loadRequests() });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { action, requestId } = await req.json();
  const requests = loadRequests();
  const request = requests.find((r) => r.id === requestId);
  if (!request) return NextResponse.json({ ok: false, error: "introuvable" }, { status: 404 });
  if (action === "approve") {
    const code = "pmcp_" + randomBytes(6).toString("hex");
    const data = loadAuth();
    data.tempCodes.push({ code, createdAt: Date.now(), claimed: false, label: `${request.name} (${request.email})` });
    saveAuth(data);
    request.status = "approved";
    request.generatedCode = code;
    saveRequests(requests);
    const mailtoUrl = `mailto:${request.email}?subject=${encodeURIComponent("[pocketmcp] votre code")}&body=${encodeURIComponent(`Bonjour ${request.name},\n\nVotre code d'accès (à usage unique) :\n${code}`)}`;
    return NextResponse.json({ ok: true, action: "approved", code, mailtoUrl });
  }
  if (action === "reject") {
    request.status = "rejected";
    saveRequests(requests);
    return NextResponse.json({ ok: true, action: "rejected" });
  }
  return NextResponse.json({ ok: false, error: "action invalide" }, { status: 400 });
}
