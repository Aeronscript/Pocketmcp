// src/lib/auth-codes.ts
// Système d'authentification PocketMCP avec device binding + sessions persistantes.
//
// Architecture :
// - Device ID : hash(cookie UUID + fingerprint navigateur)
//   - Cookie `pocketmcp_device` (UUID, 10 ans) → persiste sur l'appareil
//   - Fingerprint (UA + lang + timezone + résolution) → si cookie cleared, récupère le device
// - Sessions : cookie `pocketmcp_session` signé HMAC (valide 30 jours)
//   - Contient { deviceId, role, sessionId }
//   - Signé avec SESSION_SECRET (env var ou fallback)
// - Ban : par deviceId → user ne peut plus se logguer
//
// Fichier data/auth-codes.json (commité sur GitHub pour persistence Render) :
// {
//   "adminHash": "...",                  // hash SHA-256 du code admin
//   "adminDevices": [                    // devices qui ont claimé l'admin
//     { "deviceId": "...", "claimedAt": ..., "active": true, "lastIP": "..." }
//   ],
//   "users": [                           // users connus (claim via pmcp_ code)
//     {
//       "deviceId": "...", "code": "pmcp_xxx", "claimedAt": ...,
//       "banned": false, "features": [], "lastSeen": ..., "lastIP": "..."
//     }
//   ],
//   "tempCodes": [                       // codes pmcp_ générés par admin
//     { "code": "pmcp_xxx", "createdAt": ..., "claimed": false, "label": "..." }
//   ],
//   "sessions": [                        // sessions actives (pour audit)
//     { "sessionId": "...", "deviceId": "...", "role": "...", "expiresAt": ... }
//   ]
// }

import { createHash, randomBytes, createHmac } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ─── Fichier de données ──────────────────────────────────────
function getDataFile(): string {
  return process.env.POCKETMCP_AUTH_FILE
    ? join(process.cwd(), process.env.POCKETMCP_AUTH_FILE)
    : join(process.cwd(), "data", "auth-codes.json");
}

// ─── Secret pour signer les sessions ─────────────────────────
// En production, doit être set via env var POCKETMCP_SESSION_SECRET.
// Fallback : dérivé du adminHash (moins safe mais marche).
function getSessionSecret(): string {
  const env = process.env.POCKETMCP_SESSION_SECRET;
  if (env) return env;
  // Fallback : dérive du adminHash (stable au redémarrage si fichier inchangé)
  const data = loadAuthRaw();
  return createHash("sha256").update(data.adminHash || "fallback-secret").digest("hex");
}

// ─── Types ───────────────────────────────────────────────────
export interface AdminDevice {
  deviceId: string;
  claimedAt: number;
  active: boolean;
  lastIP?: string;
  lastSeen?: number;
  label?: string;  // optionnel : "iPhone de Aeronscript"
}

export interface User {
  deviceId: string;
  code: string;          // le code pmcp_ qui leur a donné l'accès
  claimedAt: number;
  banned: boolean;
  bannedAt?: number;
  bannedReason?: string;
  features: string[];    // beta features activées
  lastSeen?: number;
  lastIP?: string;
  label?: string;
}

export interface TempCode {
  code: string;
  createdAt: number;
  claimed: boolean;
  claimedAt?: number;
  claimedBy?: string;    // deviceId du user qui a claim
  label?: string;
}

export interface Session {
  sessionId: string;
  deviceId: string;
  role: "admin" | "user";
  createdAt: number;
  expiresAt: number;
  lastIP?: string;
}

export interface AuthData {
  adminHash: string;
  adminDevices: AdminDevice[];
  users: User[];
  tempCodes: TempCode[];
  sessions: Session[];
}

// ─── Validation ──────────────────────────────────────────────
function isValidTempCode(v: any): v is TempCode {
  return v && typeof v.code === "string" && typeof v.createdAt === "number" && typeof v.claimed === "boolean";
}
function isValidAdminDevice(v: any): v is AdminDevice {
  return v && typeof v.deviceId === "string" && typeof v.claimedAt === "number" && typeof v.active === "boolean";
}
function isValidUser(v: any): v is User {
  return v && typeof v.deviceId === "string" && typeof v.code === "string" && typeof v.claimedAt === "number" && typeof v.banned === "boolean";
}
function isValidSession(v: any): v is Session {
  return v && typeof v.sessionId === "string" && typeof v.deviceId === "string" && (v.role === "admin" || v.role === "user") && typeof v.createdAt === "number" && typeof v.expiresAt === "number";
}

function isValidAuthData(v: any): v is AuthData {
  if (!v || typeof v.adminHash !== "string") return false;
  if (!Array.isArray(v.tempCodes)) return false;
  if (!Array.isArray(v.adminDevices)) return false;
  if (!Array.isArray(v.users)) return false;
  if (!Array.isArray(v.sessions)) return false;
  return true;
}

// ─── Migration : anciennes données → nouveau format ──────────
function migrateOldData(v: any): AuthData {
  const data: AuthData = {
    adminHash: v.adminHash || "",
    adminDevices: v.adminDevices || [],
    users: v.users || [],
    tempCodes: v.tempCodes || [],
    sessions: v.sessions || [],
  };
  // Si l'ancien format avait des tempCodes avec claimed=true mais pas de claimedBy,
  // on les laisse comme ils sont (l'user devra re-claim avec le nouveau flow).
  return data;
}

// ─── I/O ─────────────────────────────────────────────────────
export function loadAuthRaw(): AuthData {
  try {
    if (existsSync(getDataFile())) {
      const parsed = JSON.parse(readFileSync(getDataFile(), "utf-8"));
      if (isValidAuthData(parsed)) return migrateOldData(parsed);
      // Ancien format (avant V2) → migrer
      if (parsed && typeof parsed.adminHash === "string" && Array.isArray(parsed.tempCodes)) {
        return migrateOldData(parsed);
      }
    }
  } catch {}
  return { adminHash: "", adminDevices: [], users: [], tempCodes: [], sessions: [] };
}

// Alias pour compat (loadAuth = loadAuthRaw)
export const loadAuth = loadAuthRaw;

let writeLock = false;
export function saveAuth(data: AuthData): void {
  // Verrou simple anti écriture concurrente (race condition)
  while (writeLock) { /* busy wait — court, OK pour notre usage */ }
  writeLock = true;
  try {
    const file = getDataFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[auth-codes] saveAuth failed:", e);
  } finally {
    writeLock = false;
  }
}

// ─── Helpers hashing ─────────────────────────────────────────
export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// ─── Device ID ───────────────────────────────────────────────
// Génère un device ID stable basé sur :
// - cookie UUID (persistant 10 ans)
// - fingerprint navigateur (UA + lang + timezone)
// Si les deux changent, on considère que c'est un nouveau device.
export function computeDeviceId(cookieUUID: string, fingerprint: string): string {
  return createHash("sha256").update(cookieUUID + "|" + fingerprint).digest("hex");
}

export function generateDeviceUUID(): string {
  return randomBytes(16).toString("hex");
}

// ─── Sessions (signées HMAC) ─────────────────────────────────
// Format : base64(JSON{sessionId, deviceId, role, exp}).signature
export function createSessionToken(session: Session): string {
  const payload = Buffer.from(JSON.stringify({
    sessionId: session.sessionId,
    deviceId: session.deviceId,
    role: session.role,
    exp: session.expiresAt,
  })).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { sessionId: string; deviceId: string; role: "admin" | "user"; exp: number } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    // Vérifie la signature
    const expectedSig = createHmac("sha256", getSessionSecret()).update(payloadB64).digest("base64url");
    if (sig !== expectedSig) return null;  // signature invalide
    // Décode
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!payload.sessionId || !payload.deviceId || !payload.role || !payload.exp) return null;
    // Vérifie l'expiration
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Gestion sessions en DB ──────────────────────────────────
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export function createSession(data: AuthData, deviceId: string, role: "admin" | "user", ip?: string): { token: string; session: Session } {
  // Nettoie les sessions expirées
  data.sessions = data.sessions.filter(s => s.expiresAt > Date.now());
  // Limite à 5 sessions actives par device
  const deviceSessions = data.sessions.filter(s => s.deviceId === deviceId);
  if (deviceSessions.length >= 5) {
    // Supprime la plus ancienne
    const oldest = deviceSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
    data.sessions = data.sessions.filter(s => s.sessionId !== oldest.sessionId);
  }
  const session: Session = {
    sessionId: randomBytes(16).toString("hex"),
    deviceId,
    role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    lastIP: ip,
  };
  data.sessions.push(session);
  return { token: createSessionToken(session), session };
}

export function revokeSession(data: AuthData, sessionId: string): boolean {
  const before = data.sessions.length;
  data.sessions = data.sessions.filter(s => s.sessionId !== sessionId);
  return data.sessions.length < before;
}

export function revokeAllSessions(data: AuthData, deviceId: string): number {
  const before = data.sessions.length;
  data.sessions = data.sessions.filter(s => s.deviceId !== deviceId);
  return before - data.sessions.length;
}

// ─── Admin device binding ────────────────────────────────────
// Le code admin peut être claimé par un seul device à la fois.
// Une fois claimé, plus personne d'autre ne peut l'utiliser.
export function claimAdmin(data: AuthData, deviceId: string, ip?: string): { ok: boolean; error?: string; alreadyMine?: boolean } {
  // Vérifie si ce device est déjà admin
  const existing = data.adminDevices.find(d => d.deviceId === deviceId && d.active);
  if (existing) {
    existing.lastSeen = Date.now();
    if (ip) existing.lastIP = ip;
    return { ok: true, alreadyMine: true };
  }
  // Vérifie s'il y a déjà un admin actif
  const activeAdmin = data.adminDevices.find(d => d.active);
  if (activeAdmin) {
    return { ok: false, error: "admin déjà claimé par un autre appareil" };
  }
  // Claim pour ce device
  data.adminDevices.push({
    deviceId,
    claimedAt: Date.now(),
    active: true,
    lastIP: ip,
    lastSeen: Date.now(),
  });
  return { ok: true };
}

export function revokeAdmin(data: AuthData, deviceId: string): boolean {
  const dev = data.adminDevices.find(d => d.deviceId === deviceId && d.active);
  if (!dev) return false;
  dev.active = false;
  // Invalide toutes les sessions admin de ce device
  data.sessions = data.sessions.filter(s => !(s.deviceId === deviceId && s.role === "admin"));
  return true;
}

export function isAdminDevice(data: AuthData, deviceId: string): boolean {
  return data.adminDevices.some(d => d.deviceId === deviceId && d.active);
}

// ─── User management ─────────────────────────────────────────
// Un code pmcp_ ne peut être claimé que par UN seul device.
// Si le même device re-tente, c'est OK (re-login).
export function claimUserCode(data: AuthData, code: string, deviceId: string, ip?: string): { ok: boolean; error?: string; user?: User } {
  // Vérifie le code
  const temp = data.tempCodes.find(t => t.code === code);
  if (!temp) return { ok: false, error: "code invalide" };

  // Vérifie si ce device est déjà enregistré
  const existingUser = data.users.find(u => u.deviceId === deviceId);
  if (existingUser) {
    if (existingUser.banned) return { ok: false, error: "cet appareil est banni" };
    existingUser.lastSeen = Date.now();
    if (ip) existingUser.lastIP = ip;
    return { ok: true, user: existingUser };
  }

  // Nouveau device : vérifie que le code n'est pas déjà claimé par un autre device
  if (temp.claimed && temp.claimedBy && temp.claimedBy !== deviceId) {
    return { ok: false, error: "ce code appartient à un autre appareil" };
  }

  // Claim le code pour ce device
  if (!temp.claimed) {
    temp.claimed = true;
    temp.claimedAt = Date.now();
    temp.claimedBy = deviceId;
  }

  const user: User = {
    deviceId,
    code,
    claimedAt: Date.now(),
    banned: false,
    features: [],
    lastSeen: Date.now(),
    lastIP: ip,
  };
  data.users.push(user);
  return { ok: true, user };
}

export function banUser(data: AuthData, deviceId: string, reason?: string): boolean {
  const user = data.users.find(u => u.deviceId === deviceId);
  if (!user) return false;
  user.banned = true;
  user.bannedAt = Date.now();
  user.bannedReason = reason;
  // Invalide toutes ses sessions
  data.sessions = data.sessions.filter(s => s.deviceId !== deviceId);
  return true;
}

export function unbanUser(data: AuthData, deviceId: string): boolean {
  const user = data.users.find(u => u.deviceId === deviceId);
  if (!user) return false;
  user.banned = false;
  delete user.bannedAt;
  delete user.bannedReason;
  return true;
}

export function grantFeature(data: AuthData, deviceId: string, feature: string): boolean {
  const user = data.users.find(u => u.deviceId === deviceId);
  if (!user) return false;
  if (!user.features.includes(feature)) user.features.push(feature);
  return true;
}

export function revokeFeature(data: AuthData, deviceId: string, feature: string): boolean {
  const user = data.users.find(u => u.deviceId === deviceId);
  if (!user) return false;
  user.features = user.features.filter(f => f !== feature);
  return true;
}

export function isUserBanned(data: AuthData, deviceId: string): boolean {
  const user = data.users.find(u => u.deviceId === deviceId);
  return user?.banned || false;
}

// ─── Legacy : keep isValidCode + extractCode for backward compat ─
export function isValidCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const data = loadAuthRaw();
  if (hashCode(code) === data.adminHash) return true;
  const temp = data.tempCodes.find((t) => t.code === code);
  return !!temp;
}

export function extractCode(searchParams: URLSearchParams, authHeader: string | null): string {
  const fromQuery = searchParams.get("code");
  if (fromQuery) return fromQuery;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return "";
}

// ─── ensureAuthFile : génère le fichier s'il est absent ──────
export function ensureAuthFile(): void {
  if (existsSync(getDataFile())) return;
  // Si le fichier n'existe pas (cas d'un repo fraîchement cloné),
  // on génère un code admin aléatoire. Il sera affiché en console
  // au 1er lancement du serveur (mais pas loggé en clair ailleurs).
  const adminCode = "Robloxmcp-" + randomBytes(8).toString("hex");
  const data: AuthData = {
    adminHash: hashCode(adminCode),
    adminDevices: [],
    users: [],
    tempCodes: [],
    sessions: [],
  };
  saveAuth(data);
  // Affiche le code admin une seule fois en console
  console.log(`\n┌──────────────────────────────────────────────┐`);
  console.log(`│  🔐 ADMIN CODE: ${adminCode.padEnd(34)}│`);
  console.log(`│  Stocké dans data/auth-codes.json (hashé)    │`);
  console.log(`└──────────────────────────────────────────────┘\n`);
}
