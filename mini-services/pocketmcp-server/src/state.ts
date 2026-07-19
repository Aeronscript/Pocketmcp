// ════════════════════════════════════════════════════════════
// PocketMCP Server — état global, auth, CORS, rate-limit
// (extrait de index.ts pour alléger le fichier principal)
// ════════════════════════════════════════════════════════════
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { randomBytes, createHash } from "crypto";

export const __dirname = dirname(fileURLToPath(import.meta.url));
export const PORT = parseInt(process.env.POCKETMCP_PORT || "16384", 10);
// Bind localhost par défaut (sécurité : le serveur ne doit pas être exposé sur
// le réseau sans décision explicite). Pour binder sur toutes les interfaces
// (utile pour bridge depuis un émulateur Android sur une autre machine),
// export POCKETMCP_HOST=0.0.0.0.
export const HOST = process.env.POCKETMCP_HOST || "127.0.0.1";

// ─── Auth : admin code + temp codes ─────────────────────────
function loadAdminCode(): string {
  const envCode = process.env.POCKETMCP_ADMIN_CODE;
  if (envCode) return envCode;
  const envFile = join(homedir(), ".pocketmcp.env");
  try {
    if (existsSync(envFile)) {
      const content = readFileSync(envFile, "utf-8").trim();
      const match = content.match(/POCKETMCP_ADMIN_CODE=(.+)/);
      if (match) return match[1].trim();
    }
  } catch {}
  const generated = "adm_" + randomBytes(7).toString("hex");
  try {
    writeFileSync(envFile, `POCKETMCP_ADMIN_CODE=${generated}\n`, { mode: 0o600 });
    console.log(`\n┌─────────────────────────────────────────────────┐`);
    console.log(`│  🔐 ADMIN CODE: ${generated.padEnd(34)}│`);
    console.log(`│  Sauvegardé dans ~/.pocketmcp.env               │`);
    console.log(`└─────────────────────────────────────────────────┘\n`);
  } catch {
    console.log(`\n⚠ ADMIN CODE: ${generated}\n`);
  }
  return generated;
}

export const ADMIN_CODE = loadAdminCode();

export const tempCodes = new Map<string, { createdAt: number; claimedBy: string | null; label?: string; ttl: number }>();
export const TEMP_CODE_TTL = 60 * 60 * 1000;
export const MAX_TTL = 5 * 60 * 60 * 1000;

export function generateTempCode(label?: string, duration?: number): string {
  const code = "tmp_" + randomBytes(6).toString("hex");
  const ttl = Math.min(duration || TEMP_CODE_TTL, MAX_TTL);
  tempCodes.set(code, { createdAt: Date.now(), claimedBy: null, label, ttl });
  return code;
}

export function isValidCode(code: string): { valid: boolean; role: "admin" | "temp" | null } {
  if (!code) return { valid: false, role: null };
  if (code === ADMIN_CODE) return { valid: true, role: "admin" };
  const temp = tempCodes.get(code);
  if (!temp) return { valid: false, role: null };
  if (!temp.claimedBy && Date.now() - temp.createdAt > temp.ttl) {
    tempCodes.delete(code);
    return { valid: false, role: null };
  }
  return { valid: true, role: "temp" };
}

export function claimCode(code: string, clientId: string): boolean {
  const temp = tempCodes.get(code);
  if (!temp) return false;
  if (temp.claimedBy === null) {
    temp.claimedBy = clientId;
    log("info", "auth", `Code ${code} réclamé par ${clientId} (à vie)`);
    return true;
  }
  return temp.claimedBy === clientId;
}

export function extractCode(req: Request, url: URL): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return url.searchParams.get("code") || "";
}

export const whitelistedClients = new Set<string>();

// ─── Types ──────────────────────────────────────────────────
export interface RobloxClient {
  clientId: string;
  playerName: string;
  userId: number;
  placeId: number;
  jobId: string;
  transport: string;
  executor: string;
  connectedAt: number;
  lastHeartbeat: number;
  httpMode?: string;
  pollInterval?: number;
  supports?: {
    decompile: boolean;
    drawing: boolean;
    writefile: boolean;
    firebuttonclick: boolean;
    firesignal: boolean;
    screenshot: boolean;
    webSocket: boolean;
  };
}

export interface Command {
  id: string;
  type: string;
  [key: string]: any;
  createdAt: number;
}

export interface CommandResult {
  commandId: string;
  result: any;
  receivedAt: number;
}

export interface LogEntry {
  time: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
}

// ─── État global ────────────────────────────────────────────
export const clients = new Map<string, RobloxClient>();
export const commandQueues = new Map<string, Command[]>();
export const results = new Map<string, CommandResult[]>();
export const logs: LogEntry[] = [];
export const MAX_LOGS = 300;

export function log(level: LogEntry["level"], source: string, message: string) {
  const entry: LogEntry = {
    time: new Date().toLocaleTimeString("fr-FR"),
    level, source, message,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  const colors: Record<string, string> = {
    info: "\x1b[36m", warn: "\x1b[33m",
    error: "\x1b[31m", success: "\x1b[32m",
  };
  console.log(
    `${colors[level]}[${entry.time}] [${level.toUpperCase()}]\x1b[0m [${source}] ${message}`
  );
}

export function genId(): string {
  return "cmd_" + Math.random().toString(36).slice(2, 10);
}

// ─── CORS ───────────────────────────────────────────────────
// CORS restreint aux origins localhost uniquement (jamais *).
// Un seul origin par réponse est autorisé par les navigateurs, on sélectionne
// donc dynamiquement l'origin de la requête si c'est bien du localhost.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:16384",
  "http://127.0.0.1:16384",
  "null", // requêtes same-origin / file:// depuis le dashboard local
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:16384";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export const CORS = corsHeaders(new Request("http://localhost:16384"));

// ─── Rate limiting serveur MCP ──────────────────────────────
// (volontairement généreux : le dashboard local auto-refresh 2s + bridge
// Roblox ne doivent pas être bloqués ; les codes admin sont à 16^hex)
export const SERVER_RATE_LIMIT = 5000;
export const SERVER_RATE_WINDOW = 10 * 60 * 1000;
export const SERVER_RATE_BLOCK = 2 * 60 * 1000;
const serverAttempts = new Map<string, { count: number; firstAttempt: number; blockedUntil?: number }>();

export function checkServerRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = serverAttempts.get(ip);

  if (record?.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (record?.blockedUntil && now >= record.blockedUntil) {
    serverAttempts.delete(ip);
  }

  if (!record || now - record.firstAttempt > SERVER_RATE_WINDOW) {
    serverAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  record.count++;
  if (record.count > SERVER_RATE_LIMIT) {
    record.blockedUntil = now + SERVER_RATE_BLOCK;
    return { allowed: false, retryAfter: Math.ceil(SERVER_RATE_BLOCK / 1000) };
  }

  return { allowed: true };
}

export function getServerIP(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

// Détecte si la requête vient de localhost. Ne sert qu'à autoriser le dashboard
// local (servi sur /) à appeler /api/clients et /api/logs sans header Authorization.
// Attention : spoofable via x-forwarded-for — le vrai périmètre de sécurité est
// le bind 127.0.0.1 (voir HOST ci-dessus).
export function isLocalRequest(req: Request): boolean {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    return first === "127.0.0.1" || first === "::1";
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp === "127.0.0.1" || realIp === "::1";
  return true; // pas de header d'IP → probablement Bun direct en localhost
}

// Cleanup toutes les 10 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of serverAttempts) {
    if (now - r.firstAttempt > SERVER_RATE_BLOCK * 2) serverAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

// Requête en cours (utilisée par jsonResponse pour calculer les CORS dynamiques)
let currentRequest: Request | null = null;
export function setCurrentRequest(req: Request) { currentRequest = req; }

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(currentRequest || new Request("http://localhost:16384")) },
  });
}

export function getFirstClient(): string | null {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat < 10000) return id;
  }
  return null;
}

// ─── Envoi de commandes aux clients Roblox ──────────────────
export async function waitForResult(
  clientId: string,
  commandId: string,
  timeoutMs: number
): Promise<CommandResult | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = results.get(clientId) || [];
    const idx = list.findIndex((r) => r.commandId === commandId);
    if (idx >= 0) {
      const result = list[idx];
      list.splice(idx, 1);
      return result;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

// Envoie une commande à un client et attend le résultat
export async function sendCommand(
  clientId: string,
  cmd: Omit<Command, "id" | "createdAt">,
  timeoutMs = 30000
): Promise<any> {
  const command: Command = {
    id: genId(),
    createdAt: Date.now(),
    ...cmd,
  };
  const queue = commandQueues.get(clientId) || [];
  queue.push(command);
  commandQueues.set(clientId, queue);
  log("info", "mcp", `→ ${cmd.type} on ${clientId} (${command.id})`);

  const result = await waitForResult(clientId, command.id, timeoutMs);
  if (result) {
    const r = result.result;
    if (r.ok) {
      log("success", "exec", `✓ ${cmd.type} OK (${command.id})`);
    } else {
      log("error", "exec", `✗ ${cmd.type} failed: ${r.error || "?"} (${command.id})`);
    }
    return r;
  }
  log("warn", "mcp", `⏱ ${cmd.type} timeout (${command.id})`);
  return { ok: false, error: `Timeout after ${timeoutMs / 1000}s` };
}
