// server/state.ts
// État global partagé du serveur PocketMCP + helpers fs/logging.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { randomBytes } from "crypto";

export const ROOT = dirname(fileURLToPath(import.meta.url)) + "/.."; // racine pocketmcp

// Port/HOST du serveur (centralisé pour éviter les imports circulaires)
export const PORT = 16384;
export const HOST = "0.0.0.0";

// ─── Admin code (auth) ───────────────────────────────────────────
//
// VULN-006 fix / P1 #5 + P1 #6 : la clé admin suit désormais la philosophie
// "jetable + rotative + révocable" alignée avec le pairing.
//
// - getAdminCode() : lit la clé dans ~/.pocketmcp.env (mode 0600).
//   Si elle n'existe pas, la génère et l'affiche UNE SEULE FOIS en console.
// - revokeAdminCode() : supprime ~/.pocketmcp.env, le serveur doit redémarrer
//   pour en générer une nouvelle. Couvre le cas "ma machine est compromise,
//   je flingue ma clé" sans pouvoir la régénérer depuis le dashboard (ce qui
//   créerait une boucle).
// - CLI : `bun index.ts --reset-admin` détruit la clé et quitte.
//   C'est le canal out-of-band : l'utilisateur doit avoir un accès physique
//   au téléphone (Termux) pour reset la clé. Aucune route HTTP ne permet
//   de reset sans connaître la clé courante.
const ADMIN_ENV_FILE = () => join(homedir(), ".pocketmcp.env");

export function getAdminCode(): string {
  const env = ADMIN_ENV_FILE();
  try {
    if (existsSync(env)) {
      const m = readFileSync(env, "utf-8").trim().match(/POCKETMCP_ADMIN_CODE=(.+)/);
      if (m) return m[1].trim();
    }
  } catch {}
  const code = "adm_" + randomBytes(7).toString("hex");
  try {
    writeFileSync(env, `POCKETMCP_ADMIN_CODE=${code}\n`, { mode: 0o600 });
    console.log(`\n┌──────────────────────────────────────────────┐
│  🔐 ADMIN CODE: ${code.padEnd(34)}│
│  Sauvegardé dans ~/.pocketmcp.env            │
│  (P1 #5 : jamais affiché à nouveau. Si tu    │
│   le perds, lance: bun index.ts --reset-admin)│
└──────────────────────────────────────────────┘`);
  } catch {
    console.log(`\n⚠ ADMIN CODE: ${code}`);
  }
  return code;
}

// P1 #6 : révocation de la clé admin.
// Supprime ~/.pocketmcp.env. Le serveur doit redémarrer pour générer
// une nouvelle clé (qui sera affichée en console une fois au démarrage).
// Aucune route HTTP ne peut reset sans connaître la clé courante (pas de
// boucle de lock-out). L'utilisateur doit avoir accès physique au téléphone
// (canal out-of-band) pour lancer la commande CLI.
export function revokeAdminCode(): boolean {
  const env = ADMIN_ENV_FILE();
  try {
    if (existsSync(env)) {
      // Renomme en .revoked-<timestamp> au lieu de supprimer (audit trail)
      const backup = env + ".revoked-" + Date.now();
      renameSync(env, backup);
      console.log(`\n⚠ Clé admin révoquée. Backup: ${backup}`);
      console.log(`⚠ Redémarre le serveur pour générer une nouvelle clé.`);
      return true;
    }
  } catch (e: any) {
    console.log(`\n❌ Erreur révocation: ${e.message}`);
  }
  return false;
}

// P1 #5 : canal out-of-band via CLI.
// `bun index.ts --reset-admin` détruit la clé et quitte.
// L'utilisateur doit avoir accès physique au téléphone (Termux).
if (process.argv.includes("--reset-admin")) {
  console.log("=== PocketMCP — Reset admin code ===");
  revokeAdminCode();
  process.exit(0);
}

export const ADMIN_CODE = getAdminCode();

// ─── Pairing code (appairage bridge ↔ dashboard) ──────────────
// Le serveur génère un pairCode affiché dans le dashboard.
// Le bridge doit le renvoyer dans /api/register pour être accepté.
//
// VULN-006 fix : la philosophie est désormais "jetable + rotatif" :
// - pairCode long (32 hex = 128 bits, anti brute-force)
// - TTL court (10 min) pour les pairing non consommés
// - Invalidation atomique après usage (verrou, anti race condition)
// - Régénération à la demande via /api/paircode (admin)
export interface PairCode {
  code: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;     // true après qu'un bridge l'a utilisé
  consumedBy: string | null;  // clientId du bridge qui l'a consommé
}
const PAIR_TTL_MS = 10 * 60 * 1000; // 10 min (was 24h, trop long)
let currentPair: PairCode;

// Verrou atomique pour consumePairCode (anti race condition TOCTOU).
// Si 2 requêtes arrivent à 2ms d'écart, la 2e sera bloquée pendant que la 1ère
// invalide le code.
let pairLock = false;

export function generatePairCode(): PairCode {
  // VULN-006 fix : 32 hex chars = 128 bits d'entropie (anti brute-force).
  // Était 6 chiffres (10^6 = 1M combinaisons, brute-forçable en ~17 min
  // même avec rate limit).
  const code = "pmcp_" + randomBytes(16).toString("hex");
  const now = Date.now();
  currentPair = { code, createdAt: now, expiresAt: now + PAIR_TTL_MS, consumed: false, consumedBy: null };
  return currentPair;
}
export function getPairCode(): PairCode { return currentPair; }
generatePairCode(); // initialise currentPair au démarrage

// consumePairCode retourne désormais le code en clair si valide (pour dériver
// la clé de session), ou null si invalide. Le code n'est jamais loggé.
export function consumePairCode(code: string | undefined): string | null {
  // VULN-006 fix : verrou atomique (anti race condition).
  // On ne peut pas avoir 2 consumePairCode() en parallèle.
  if (pairLock) return null;
  pairLock = true;
  try {
    if (!code) return null;
    if (!currentPair) return null;
    if (currentPair.consumed) return null;            // déjà utilisé → refus
    if (Date.now() > currentPair.expiresAt) return null; // expiré → refus
    if (code.trim() !== currentPair.code) return null;   // invalide → refus
    // Marque comme consommé (single-use réel)
    currentPair.consumed = true;
    currentPair.consumedBy = null; // sera set par handleRegister après création du client
    // Retourne le code (sera utilisé pour dériver la clé de session puis GC)
    return currentPair.code;
  } finally {
    pairLock = false;
  }
}

// Pour que handleRegister puisse marquer qui a consommé le code (audit trail)
export function markPairConsumedBy(clientId: string) {
  if (currentPair && currentPair.consumed) {
    currentPair.consumedBy = clientId;
  }
}

// ─── Clients bridge (un client Roblox = un exécuteur) ────────────
export interface Client {
  clientId: string;
  playerName: string;
  userId: string;
  placeId: string;
  jobId: string;
  transport: string;
  executor: string;
  httpMode: string;
  supports: any;
  connectedAt: number;
  lastHeartbeat: number;
  gameName: string;
  gameThumb: string;
  playing: number;
  // P0 #1 fix : clé de session AES-XOR dérivée du pairCode (chiffrée en RAM).
  // Si undefined : le bridge ne supporte pas le chiffrement (compat descendante).
  sessionKey?: Buffer;
  // P0 #1 fix : dernier nonce vu pour ce client (anti-replay).
  lastNonce?: bigint;
}

// P0 #2 fix : la session expire côté SERVEUR après 24h (et non côté client).
// Le serveur ignore l'horloge client et se base sur connectedAt + 24h.
// Si un client patche son os.time(), le serveur refusera quand même.
export const SESSION_MAX_MS = 24 * 60 * 60 * 1000; // 24h

export function isSessionExpired(client: Client, now = Date.now()): boolean {
  return (now - client.connectedAt) > SESSION_MAX_MS;
}

// ─── isLocalRequest (pour dashboard local sans auth admin) ──────
// Permet au dashboard servi sur / d'appeler /api/clients et /api/logs
// sans header Authorization. Les autres IPs (réseau local) doivent
// fournir le code admin.
export function isLocalRequest(req: Request): boolean {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first === "127.0.0.1" || first === "::1") return true;
    return false;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp === "127.0.0.1" || realIp === "::1";
  }
  // Pas de header d'IP → Bun direct en localhost
  return true;
}

export function getServerIP(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

// ─── Rate limiting serveur (P2 #9) ──────────────────────────────
// S'applique UNIQUEMENT aux échecs d'auth (tentatives de pairCode invalides
// sur /api/register, ou codes admin invalides sur endpoints admin).
// 100 req/10min = ~10 essais/min, suffisant pour légitime, cassant pour brute force.
export const SERVER_RATE_LIMIT = 100;
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

// Cleanup toutes les 10 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of serverAttempts) {
    if (now - r.firstAttempt > SERVER_RATE_BLOCK * 2) serverAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

// Cache des infos jeux (placeId → {name, thumb, playing})
const gameCache = new Map<string, { name: string; thumb: string; playing: number }>();

export async function fetchGameInfo(placeId: string): Promise<{ name: string; thumb: string; playing: number }> {
  if (gameCache.has(placeId)) return gameCache.get(placeId)!;
  try {
    const uRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    if (!uRes.ok) throw new Error("universe fetch failed");
    const { universeId } = await uRes.json() as any;
    const gRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
    if (!gRes.ok) throw new Error("game fetch failed");
    const { data } = await gRes.json() as any;
    let thumb = "";
    try {
      const tRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=ReturnIfEmpty&size=150x150&format=Png&isCircular=false`);
      if (tRes.ok) {
        const tData = await tRes.json() as any;
        if (tData.data && tData.data[0] && tData.data[0].imageUrl) thumb = tData.data[0].imageUrl;
      }
    } catch {}
    if (data && data[0]) {
      const info = { name: data[0].name, thumb, playing: data[0].playing || 0 };
      gameCache.set(placeId, info);
      return info;
    }
  } catch {}
  const fallback = { name: `Place #${placeId}`, thumb: "", playing: 0 };
  gameCache.set(placeId, fallback);
  return fallback;
}

export const clients = new Map<string, Client>();

// ─── File de commandes en attente (poll/result) ──────────────────
export interface PendingCommand {
  clientId: string;
  command: any;
  createdAt: number;
  resolve: (v: any) => void;
  reject: (e: any) => void;
  timer?: any;
}
export const pendingCommands = new Map<string, PendingCommand>();

// ─── Logs live (dashboard) ───────────────────────────────────────
export const logs: Array<{ time: string; level: string; source: string; message: string }> = [];
const MAX_LOGS = 300;

export function log(level: "info" | "warn" | "error" | "success", source: string, message: string) {
  const time = new Date().toLocaleTimeString("fr-FR");
  logs.push({ time, level, source, message });
  if (logs.length > MAX_LOGS) logs.shift();
  const color = { info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m", success: "\x1b[32m" }[level];
  console.log(`${color}[${time}] [${level.toUpperCase()}]\x1b[0m [${source}] ${message}`);
}

// ─── Helpers fs (chemins relatifs au projet) ─────────────────────
export function readJsonRel(relPath: string): any {
  const full = join(ROOT, relPath);
  return JSON.parse(readFileSync(full, "utf-8"));
}

export function writeFileRel(relPath: string, content: string): string {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return full;
}

export function readDirRel(relPath: string): string[] {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) return [];
  return readdirSync(full);
}

export function fileExistsRel(relPath: string): boolean {
  return existsSync(join(ROOT, relPath));
}

export function fsStat(full: string) {
  return statSync(full);
}

export { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, join, dirname };
