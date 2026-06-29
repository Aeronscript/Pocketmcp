import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
const DATA_FILE = join(process.cwd(), "data", "access-requests.json");
interface AccessRequest { id: string; email: string; name: string; message: string; createdAt: number; status: "pending" | "approved" | "rejected"; generatedCode?: string; }
function loadRequests(): AccessRequest[] { try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {} return []; }
function saveRequests(r: AccessRequest[]) { try { writeFileSync(DATA_FILE, JSON.stringify(r, null, 2)); } catch {} }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const message = body.message?.trim();
  const gmailRegex = /^[a-z0-9.]+@gmail\.com$/;
  if (!email || !gmailRegex.test(email)) return NextResponse.json({ ok: false, error: "adresse gmail valide obligatoire" }, { status: 400 });
  const localPart = email.split("@")[0];
  if (localPart.length < 5) return NextResponse.json({ ok: false, error: "adresse gmail trop courte — utilisez votre vrai compte" }, { status: 400 });
  if (/^[0-9]+$/.test(localPart)) return NextResponse.json({ ok: false, error: "adresse gmail invalide — utilisez votre vrai compte" }, { status: 400 });
  if (!name || name.length < 2) return NextResponse.json({ ok: false, error: "votre nom est requis (minimum 2 caractères)" }, { status: 400 });
  if (!message || message.length < 20) return NextResponse.json({ ok: false, error: "message obligatoire (minimum 20 caractères)" }, { status: 400 });
  const requests = loadRequests();
  if (requests.find(r => r.email === email && r.status === "pending")) return NextResponse.json({ ok: false, error: "vous avez déjà une demande en attente" }, { status: 409 });
  const request: AccessRequest = { id: "req_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), email, name, message, createdAt: Date.now(), status: "pending" };
  requests.push(request); saveRequests(requests);
  const adminEmail = "aeronscriptlabs@gmail.com";
  const mailtoUrl = `mailto:${adminEmail}?subject=${encodeURIComponent(`[pocketmcp] demande - ${name}`)}&body=${encodeURIComponent(`Nom: ${name}\nEmail: ${email}\nMessage: ${message}`)}`;
  return NextResponse.json({ ok: true, message: "demande envoyée", mailtoUrl, requestId: request.id });
}
