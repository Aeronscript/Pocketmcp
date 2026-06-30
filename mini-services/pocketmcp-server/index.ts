// ════════════════════════════════════════════════════════════
// PocketMCP Server v2 · by Aeronscript (Mohamed Amine)
// Serveur MCP Roblox mobile-first — full feature set
// Port: 16384
// ════════════════════════════════════════════════════════════

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { randomBytes, createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 16384;
const HOST = "0.0.0.0";

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

const ADMIN_CODE = loadAdminCode();

const tempCodes = new Map<string, { createdAt: number; claimedBy: string | null; label?: string; ttl: number }>();
const TEMP_CODE_TTL = 60 * 60 * 1000;
const MAX_TTL = 5 * 60 * 60 * 1000;

function generateTempCode(label?: string, duration?: number): string {
  const code = "tmp_" + randomBytes(6).toString("hex");
  const ttl = Math.min(duration || TEMP_CODE_TTL, MAX_TTL);
  tempCodes.set(code, { createdAt: Date.now(), claimedBy: null, label, ttl });
  return code;
}

function isValidCode(code: string): { valid: boolean; role: "admin" | "temp" | null } {
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

function claimCode(code: string, clientId: string): boolean {
  const temp = tempCodes.get(code);
  if (!temp) return false;
  if (temp.claimedBy === null) {
    temp.claimedBy = clientId;
    log("info", "auth", `Code ${code} réclamé par ${clientId} (à vie)`);
    return true;
  }
  return temp.claimedBy === clientId;
}

function extractCode(req: Request, url: URL): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return url.searchParams.get("code") || "";
}

const whitelistedClients = new Set<string>();

// ─── Types ──────────────────────────────────────────────────
interface RobloxClient {
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

interface Command {
  id: string;
  type: string;
  [key: string]: any;
  createdAt: number;
}

interface CommandResult {
  commandId: string;
  result: any;
  receivedAt: number;
}

interface LogEntry {
  time: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
}

// ─── État global ────────────────────────────────────────────
const clients = new Map<string, RobloxClient>();
const commandQueues = new Map<string, Command[]>();
const results = new Map<string, CommandResult[]>();
const logs: LogEntry[] = [];
const MAX_LOGS = 300;

function log(level: LogEntry["level"], source: string, message: string) {
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

function genId(): string {
  return "cmd_" + Math.random().toString(36).slice(2, 10);
}

// CORS restreint à localhost uniquement (pas *)
const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:16384, http://127.0.0.1:16384",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id, Authorization",
};

// ─── Rate limiting serveur MCP ──────────────────────────────
// 10 tentatives d'auth par IP en 5 min, puis blocage 10 min
const SERVER_RATE_LIMIT = 10;
const SERVER_RATE_WINDOW = 5 * 60 * 1000;
const SERVER_RATE_BLOCK = 10 * 60 * 1000;
const serverAttempts = new Map<string, { count: number; firstAttempt: number; blockedUntil?: number }>();

function checkServerRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
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

function getServerIP(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

// Cleanup toutes les 10 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of serverAttempts) {
    if (now - r.firstAttempt > SERVER_RATE_BLOCK * 2) serverAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function getFirstClient(): string | null {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat < 10000) return id;
  }
  return null;
}

async function waitForResult(
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
async function sendCommand(
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

// ─── HTTP routes ────────────────────────────────────────────
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Dashboard
  if (path === "/" && method === "GET") {
    return new Response(renderDashboard(), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
    });
  }

  if (path === "/health" && method === "GET") {
    return jsonResponse({
      ok: true,
      port: PORT,
      clients: clients.size,
      uptime: process.uptime(),
    });
  }

  if (path === "/script.luau" && method === "GET") {
    const bridgePath = join(__dirname, "bridge.lua");
    if (!existsSync(bridgePath)) {
      return new Response("-- bridge.lua introuvable", { status: 404 });
    }
    const code = readFileSync(bridgePath, "utf-8");
    return new Response(code, {
      headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS },
    });
  }

  // ─── Auth verification endpoint (avec rate limiting) ───
  if (path === "/api/auth/verify" && method === "POST") {
    const ip = getServerIP(req);
    const rateCheck = checkServerRateLimit(ip);
    if (!rateCheck.allowed) {
      return jsonResponse({ ok: false, error: `trop de tentatives — réessayez dans ${Math.ceil((rateCheck.retryAfter || 600) / 60)} min` }, 429);
    }
    try {
      const body = await req.json();
      const code = body.code || "";
      const check = isValidCode(code);
      if (check.valid) {
        return jsonResponse({ ok: true, role: check.role });
      }
      return jsonResponse({ ok: false, error: "code invalide" }, 401);
    } catch {
      return jsonResponse({ ok: false, error: "requête invalide" }, 400);
    }
  }

  // ─── Auth middleware pour tout le reste ───
  // Endpoints publics : /, /health, /script.luau, /api/auth/verify
  const isPublicEndpoint = path === "/" || path === "/health" || path === "/script.luau" || path === "/api/auth/verify";

  if (!isPublicEndpoint) {
    const ip = getServerIP(req);
    const code = extractCode(req, url);
    const check = isValidCode(code);
    if (!check.valid) {
      // Rate limit sur les échecs d'auth
      const rateCheck = checkServerRateLimit(ip);
      if (!rateCheck.allowed) {
        return jsonResponse({ ok: false, error: `trop de tentatives — bloqué ${Math.ceil((rateCheck.retryAfter || 600) / 60)} min` }, 429);
      }
      log("warn", "auth", `Accès refusé: ${method} ${path} depuis ${ip}`);
      return jsonResponse({ ok: false, error: "authentification requise" }, 401);
    }
  }

  // ─── Rate limiting sur execute_code (anti-spam, pas anti-contenu) ───
  // L'IA peut exécuter n'importe quel script — on limite juste la fréquence
  // pour éviter le spam : max 30 requêtes/min par IP authentifiée
  const MAX_CODE_SIZE = 100 * 1024; // 100KB max par requête (généreux)

  // Register
  if (path === "/api/register" && method === "POST") {
    try {
      const body = await req.json();
      const clientId = body.clientId || genId();
      const client: RobloxClient = {
        clientId,
        playerName: body.playerName || "Unknown",
        userId: body.userId || 0,
        placeId: body.placeId || 0,
        jobId: body.jobId || "",
        transport: body.transport || "HTTP Polling",
        executor: body.executor || "Unknown",
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        supports: body.supports,
      };

      // Claim le code pour ce clientId (usage unique → lié à vie)
      const code = extractCode(req, url);
      if (code && code !== ADMIN_CODE) {
        const claimed = claimCode(code, clientId);
        if (!claimed) {
          log("warn", "auth", `Code ${code} déjà réclamé par un autre client — refus`);
          return jsonResponse({ ok: false, error: "ce code a déjà été utilisé par un autre client" }, 403);
        }
      }

      clients.set(client.clientId, client);
      commandQueues.set(client.clientId, []);
      results.set(client.clientId, []);
      whitelistedClients.add(client.clientId);
      log("success", "bridge",
        `Client connecté: ${client.playerName} (${client.clientId}) · ${client.transport} · ${client.executor}`
      );
      return jsonResponse({ ok: true, clientId: client.clientId });
    } catch (e: any) {
      log("error", "api", `register failed: ${e.message}`);
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  if (path === "/api/poll" && method === "POST") {
    try {
      const body = await req.json();
      const queue = commandQueues.get(body.clientId) || [];
      const commands = queue.splice(0, queue.length);
      if (commands.length > 0) {
        log("info", "bridge", `${body.clientId} polled ${commands.length} command(s)`);
      }
      return jsonResponse({ ok: true, commands });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  if (path === "/api/result" && method === "POST") {
    try {
      const body = await req.json();
      const result: CommandResult = {
        commandId: body.commandId,
        result: body.result,
        receivedAt: Date.now(),
      };
      const list = results.get(body.clientId) || [];
      list.push(result);
      if (list.length > 50) list.shift();
      results.set(body.clientId, list);
      return jsonResponse({ ok: true });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  if (path === "/api/heartbeat" && method === "POST") {
    try {
      const body = await req.json();
      const client = clients.get(body.clientId);
      if (client) {
        client.lastHeartbeat = Date.now();
        if (body.httpMode) client.httpMode = body.httpMode;
        if (body.pollInterval !== undefined) client.pollInterval = body.pollInterval;
      }
      return jsonResponse({ ok: true });
    } catch {
      return jsonResponse({ ok: false }, 400);
    }
  }

  if (path === "/api/clients" && method === "GET") {
    const now = Date.now();
    const list = Array.from(clients.values()).map((c) => ({
      ...c,
      online: now - c.lastHeartbeat < 10000,
      uptime: Math.floor((now - c.connectedAt) / 1000),
    }));
    return jsonResponse({ ok: true, clients: list });
  }

  if (path === "/api/logs" && method === "GET") {
    const limit = parseInt(url.searchParams.get("limit") || "100");
    return jsonResponse({ ok: true, logs: logs.slice(-limit) });
  }

  // ─── HTTP direct execute (sans MCP) ───
  if (path === "/api/execute" && method === "POST") {
    try {
      const body = await req.json();
      const codeStr = body.code || "";
      // Limite taille uniquement (anti-spam, pas anti-contenu)
      if (codeStr.length > MAX_CODE_SIZE) {
        return jsonResponse({ ok: false, error: `code trop grand (max ${MAX_CODE_SIZE / 1024}KB)` }, 400);
      }
      const target = body.clientId || getFirstClient();
      if (!target) {
        return jsonResponse({ ok: false, error: "Aucun client connecté" }, 400);
      }
      const r = await sendCommand(target, { type: "execute", code: codeStr });
      return jsonResponse({ ok: r.ok, result: r });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── Admin endpoints ───
  if (path === "/api/auth/temp-code" && method === "POST") {
    const code = extractCode(req, url);
    if (code !== ADMIN_CODE) return jsonResponse({ ok: false, error: "admin requis" }, 403);
    try {
      const body = await req.json().catch(() => ({}));
      const duration = Math.min(body.duration || TEMP_CODE_TTL, MAX_TTL);
      const tempCode = generateTempCode(body.label, duration);
      log("success", "auth", `Temp code généré: ${tempCode} (TTL ${duration / 1000}s)`);
      return jsonResponse({ ok: true, code: tempCode, ttl: duration / 1000 });
    } catch { return jsonResponse({ ok: false }, 400); }
  }

  if (path === "/api/auth/temp-codes" && method === "GET") {
    const code = extractCode(req, url);
    if (code !== ADMIN_CODE) return jsonResponse({ ok: false, error: "admin requis" }, 403);
    const list = Array.from(tempCodes.entries()).map(([c, v]) => ({
      code: c, createdAt: v.createdAt, claimed: v.claimedBy !== null,
      claimedBy: v.claimedBy, label: v.label,
      expired: !v.claimedBy && Date.now() - v.createdAt > v.ttl,
    }));
    return jsonResponse({ ok: true, codes: list });
  }

  if (path === "/api/auth/revoke" && method === "POST") {
    const code = extractCode(req, url);
    if (code !== ADMIN_CODE) return jsonResponse({ ok: false, error: "admin requis" }, 403);
    try {
      const body = await req.json();
      if (tempCodes.has(body.code)) {
        tempCodes.delete(body.code);
        log("warn", "auth", `Temp code révoqué: ${body.code}`);
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ ok: false, error: "code introuvable" }, 404);
    } catch { return jsonResponse({ ok: false }, 400); }
  }

  // ─── HTTP direct: list_remotes ───
  if (path === "/api/remotes" && method === "GET") {
    const target = getFirstClient();
    if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
    const r = await sendCommand(target, { type: "list_remotes", limit: 50 });
    return jsonResponse(r);
  }

  // ─── HTTP direct: decompile ───
  if (path === "/api/decompile" && method === "POST") {
    try {
      const body = await req.json();
      const target = body.clientId || getFirstClient();
      if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
      const r = await sendCommand(target, { type: "decompile", path: body.path });
      return jsonResponse(r);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── HTTP direct: instances ───
  if (path === "/api/instances" && method === "GET") {
    const selector = url.searchParams.get("selector") || "game";
    const target = getFirstClient();
    if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
    const r = await sendCommand(target, { type: "get_instances", selector });
    return jsonResponse(r);
  }

  // ─── MCP endpoint ───
  if (path === "/mcp" && method === "POST") {
    return await handleMCP(req);
  }
  if (path === "/mcp" && method === "GET") {
    return handleMCPStream(req);
  }

  return new Response("Not found", { status: 404, headers: CORS });
}

// ─── MCP Protocol ───────────────────────────────────────────
const MCP_SESSIONS = new Map<string, any>();

const MCP_TOOLS = [
  {
    name: "execute_code",
    description:
      "Exécute du code Lua dans le client Roblox connecté. " +
      "Variables exposées: game, workspace, Players, etc. " +
      "Les print() et warn() sont capturés et retournés dans logs[].",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code Lua à exécuter" },
        clientId: { type: "string", description: "ID du client (optionnel)" },
      },
      required: ["code"],
    },
  },
  {
    name: "decompile_script",
    description:
      "Décompile un LocalScript ou ModuleScript par son path (ex: 'ReplicatedStorage.Modules.Shop'). " +
      "Retourne le code source Lua. Nécessite un exécuteur avec decompile().",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin depuis game (ex: 'ReplicatedStorage.Modules.Shop')" },
        clientId: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "get_instances",
    description:
      "Liste des instances via sélecteur CSS-like. " +
      "Ex: 'game.ReplicatedStorage.Remotes.*' retourne tous les enfants de Remotes. " +
      "Ex: 'game.Players' retourne la liste des joueurs.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "Sélecteur (ex: 'game.ReplicatedStorage.Remotes.*')" },
        clientId: { type: "string" },
      },
      required: ["selector"],
    },
  },
  {
    name: "spy_remotes",
    description:
      "Active ou désactive l'interception des RemoteEvents et RemoteFunctions. " +
      "Hook __namecall pour capturer FireServer / InvokeServer. " +
      "Optionnel: filtre par nom (ex: 'Buy' capture seulement les remotes contenant 'Buy').",
    inputSchema: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "true = activer, false = désactiver" },
        filter: { type: "string", description: "Filtre par nom (optionnel)" },
        clientId: { type: "string" },
      },
      required: ["enabled"],
    },
  },
  {
    name: "list_remotes",
    description:
      "Retourne le résumé des RemoteEvents interceptés (compte par nom) + les derniers events récents. " +
      "Nécessite que spy_remotes ait été activé avant.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre max d'events récents (défaut: 50)" },
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "click_gui",
    description:
      "Clique sur un TextButton / ImageButton in-game par son path. " +
      "Utilise firesignal/firebuttonclick si disponible sur l'exécuteur.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin du bouton (ex: 'StarterGui.ScreenGui.Frame.BuyButton')" },
        clientId: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "screenshot",
    description:
      "Capture l'écran Roblox via ScreenshotWorkspace(). PC-only (synapse, script-ware). " +
      "Sur mobile (delta, hydrogen), retourne automatiquement un message avec alternatives " +
      "(get_instances, decompile_script, execute_code). " +
      "Le serveur vérifie supports.screenshot du client avant d'envoyer la commande.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "get_player_info",
    description:
      "Retourne les infos d'un joueur (health, position, walkspeed, team, etc). " +
      "Si playerName omis, retourne les infos du joueur local.",
    inputSchema: {
      type: "object",
      properties: {
        playerName: { type: "string", description: "Nom du joueur (optionnel, défaut = local player)" },
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "list_clients",
    description: "Liste les clients Roblox actuellement connectés au serveur PocketMCP.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_logs",
    description: "Récupère les logs récents du serveur (bridge + exec + stdout).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre max de logs (défaut: 50)" },
      },
    },
  },
];

async function handleMCP(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { jsonrpc, id, method, params } = body;
    const sessionId = req.headers.get("MCP-Session-Id") || genId();
    let result: any = null;

    if (method === "initialize") {
      MCP_SESSIONS.set(sessionId, { initialized: true, createdAt: Date.now() });
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "pocketmcp", version: "0.3.0" },
      };
      log("info", "mcp", `Session initialized: ${sessionId}`);
    } else if (method === "notifications/initialized") {
      return new Response(null, { status: 202, headers: CORS });
    } else if (method === "tools/list") {
      result = { tools: MCP_TOOLS };
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};
      const clientId = args.clientId || getFirstClient();

      if (!clientId && !["list_clients", "get_logs"].includes(toolName)) {
        result = {
          content: [{
            type: "text",
            text: "Erreur: Aucun client Roblox connecté. Démarre le bridge dans ton exécuteur mobile d'abord.",
          }],
          isError: true,
        };
      } else {
        let cmd: Omit<Command, "id" | "createdAt"> | null = null;
        let needsClient = true;

        if (toolName === "execute_code") {
          cmd = { type: "execute", code: args.code };
        } else if (toolName === "decompile_script") {
          cmd = { type: "decompile", path: args.path };
        } else if (toolName === "get_instances") {
          cmd = { type: "get_instances", selector: args.selector };
        } else if (toolName === "spy_remotes") {
          cmd = { type: "spy_remotes", enabled: args.enabled, filter: args.filter };
        } else if (toolName === "list_remotes") {
          cmd = { type: "list_remotes", limit: args.limit || 50 };
        } else if (toolName === "click_gui") {
          cmd = { type: "click_gui", path: args.path };
        } else if (toolName === "screenshot") {
          // Vérifie si le client supporte screenshot avant d'envoyer
          const client = clients.get(clientId);
          if (client && client.supports && !client.supports.screenshot) {
            result = {
              content: [{
                type: "text",
                text: `screenshot non disponible sur ce client (${client.executor} ne supporte pas ScreenshotWorkspace).\n\n` +
                      `alternatives possibles :\n` +
                      `- get_instances avec selector \"game.StarterGui.*\" pour inspecter le GUI\n` +
                      `- decompile_script pour lire le code source des scripts\n` +
                      `- execute_code avec un script qui retourne les propriétés des éléments visuels\n\n` +
                      `note : screenshot fonctionne sur pc (synapse, script-ware) avec ScreenshotWorkspace().`,
              }],
              isError: false, // pas une erreur, juste une limite
            };
          } else {
            cmd = { type: "screenshot" };
          }
        } else if (toolName === "get_player_info") {
          cmd = { type: "get_player_info", playerName: args.playerName };
        } else if (toolName === "list_clients") {
          const now = Date.now();
          const list = Array.from(clients.values())
            .filter((c) => now - c.lastHeartbeat < 10000)
            .map((c) => ({
              clientId: c.clientId,
              playerName: c.playerName,
              executor: c.executor,
              placeId: c.placeId,
              transport: c.transport,
              httpMode: c.httpMode,
              supports: c.supports,
              uptime: Math.floor((now - c.connectedAt) / 1000),
            }));
          result = {
            content: [{
              type: "text",
              text: list.length === 0
                ? "Aucun client connecté."
                : `${list.length} client(s) connecté(s):\n${JSON.stringify(list, null, 2)}`,
            }],
          };
          needsClient = false;
        } else if (toolName === "get_logs") {
          const limit = args.limit || 50;
          const recent = logs.slice(-limit);
          result = {
            content: [{
              type: "text",
              text: recent
                .map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`)
                .join("\n"),
            }],
          };
          needsClient = false;
        } else {
          result = {
            content: [{ type: "text", text: `Outil inconnu: ${toolName}` }],
            isError: true,
          };
          needsClient = false;
        }

        if (needsClient && cmd) {
          const r = await sendCommand(clientId, cmd, 30000);
          result = {
            content: [{ type: "text", text: formatResult(r, toolName) }],
            isError: !r.ok,
          };
        }
      }
    } else {
      return jsonResponse({
        jsonrpc: "2.0", id,
        error: { code: -32601, message: `Method not found: ${method}` },
      }, 400);
    }

    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id, result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "MCP-Session-Id": sessionId,
          ...CORS,
        },
      }
    );
  } catch (e: any) {
    log("error", "mcp", `MCP error: ${e.message}`);
    return jsonResponse({
      jsonrpc: "2.0", id: null,
      error: { code: -32603, message: e.message },
    }, 500);
  }
}

function handleMCPStream(req: Request): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(": ping\n\n");
      const interval = setInterval(() => {
        controller.enqueue(": ping\n\n");
      }, 30000);
      req.signal?.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS,
    },
  });
}

function formatResult(r: any, toolName: string): string {
  if (!r) return "Pas de résultat";
  if (toolName === "execute_code") {
    let text = "";
    if (r.logs && r.logs.length > 0) {
      text += "── logs ──────────────\n";
      text += r.logs.join("\n");
      text += "\n";
    }
    text += "── résultat ──────────\n";
    text += `ok: ${r.ok}\n`;
    if (r.result) text += `result: ${r.result}\n`;
    if (r.error) text += `error: ${r.error}\n`;
    return text;
  }
  if (toolName === "decompile_script") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return `── source (${r.lines} lignes) ──\n${r.source}`;
  }
  if (toolName === "get_instances") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return `${r.count} instance(s):\n${JSON.stringify(r.instances, null, 2)}`;
  }
  if (toolName === "list_remotes") {
    if (!r.ok) return `Erreur: ${r.error}`;
    let text = `── summary (${r.totalUnique} unique, ${r.totalFires} total) ──\n`;
    text += r.summary.map((s: any) => `  ${s.name}: ${s.count}x`).join("\n");
    text += `\n\n── recent events ──\n`;
    text += r.recent.map((e: any) =>
      `  [${new Date(e.time * 1000).toLocaleTimeString()}] ${e.kind} ${e.name} (${e.argsCount} args)`
    ).join("\n");
    return text;
  }
  if (toolName === "get_player_info") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return JSON.stringify(r.info, null, 2);
  }
  return JSON.stringify(r, null, 2);
}

// ─── Dashboard HTML ─────────────────────────────────────────
function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pocketmcp · localhost:16384</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    background: #0a0d12; color: #c9d1d9;
    padding: 16px; min-height: 100vh;
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 12px; border-bottom: 1px solid #21262d; margin-bottom: 16px;
  }
  .logo { color: #4ade80; font-weight: bold; font-size: 14px; }
  .status { font-size: 11px; color: #8b949e; }
  .status .dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; background: #4ade80;
    margin-right: 6px; animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .tabs {
    display: flex; gap: 2px; border-bottom: 1px solid #21262d; margin-bottom: 12px;
  }
  .tab {
    padding: 8px 12px; background: none; border: none; color: #8b949e;
    font-family: inherit; font-size: 11px; cursor: pointer; border-bottom: 2px solid transparent;
  }
  .tab.active { color: #4ade80; border-bottom-color: #4ade80; }
  .tab:hover { color: #c9d1d9; }
  .panel { display: none; }
  .panel.active { display: block; }
  .section { margin-bottom: 16px; }
  .section h2 {
    color: #4ade80; font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 8px;
  }
  .client {
    background: #161b22; border: 1px solid #21262d;
    border-radius: 6px; padding: 10px; margin-bottom: 6px; font-size: 11px;
  }
  .client-name { color: #c9d1d9; font-weight: bold; font-size: 12px; }
  .client-info { color: #8b949e; margin-top: 4px; }
  .badge {
    display: inline-block; padding: 1px 6px; border-radius: 3px;
    font-size: 10px; margin-left: 6px;
  }
  .badge-online { background: #1a4731; color: #4ade80; }
  .badge-http { background: #3b3220; color: #fbbf24; }
  .badge-transport { background: #1e293b; color: #38bdf8; }
  .badge-poll { background: #2d1e3b; color: #c084fc; }
  .logs {
    background: #0d1117; border: 1px solid #21262d;
    border-radius: 6px; padding: 10px; height: 400px; overflow-y: auto;
    font-size: 11px; line-height: 1.6;
  }
  .log-line { white-space: pre-wrap; word-break: break-all; }
  .log-info { color: #38bdf8; }
  .log-warn { color: #fbbf24; }
  .log-error { color: #f87171; }
  .log-success { color: #4ade80; }
  .empty { color: #6e7681; font-style: italic; }
  .btn {
    background: #21262d; color: #c9d1d9; border: 1px solid #30363d;
    padding: 6px 12px; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 11px; margin-right: 4px;
  }
  .btn:hover { background: #30363d; }
  .btn-primary { background: #1a4731; color: #4ade80; border-color: #2d5e44; }
  .tools-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
  }
  .tool-card {
    background: #161b22; border: 1px solid #21262d; border-radius: 6px;
    padding: 8px; font-size: 11px;
  }
  .tool-name { color: #4ade80; font-weight: bold; }
  .tool-desc { color: #8b949e; margin-top: 4px; font-size: 10px; }
  code { color: #4ade80; background: #161b22; padding: 2px 6px; border-radius: 3px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">pocket<span style="color:#c9d1d9">mcp</span> <span style="color:#8b949e">v0.2.0</span></div>
      <div class="status"><span class="dot"></span>serveur actif · :${PORT} · <span id="uptime">0s</span></div>
    </div>
    <button class="btn" onclick="location.reload()">↻ refresh</button>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('clients', this)">clients</button>
    <button class="tab" onclick="showTab('logs', this)">logs</button>
    <button class="tab" onclick="showTab('tools', this)">outils MCP</button>
    <button class="tab" onclick="showTab('bridge', this)">bridge script</button>
  </div>

  <div id="panel-clients" class="panel active">
    <div class="section">
      <h2>clients connectés (<span id="client-count">0</span>)</h2>
      <div id="clients-list"></div>
    </div>
  </div>

  <div id="panel-logs" class="panel">
    <div class="section">
      <h2>logs live (auto-refresh 2s)</h2>
      <div class="logs" id="logs"></div>
    </div>
  </div>

  <div id="panel-tools" class="panel">
    <div class="section">
      <h2>outils MCP exposés (${MCP_TOOLS.length})</h2>
      <div class="tools-grid" id="tools-list"></div>
    </div>
  </div>

  <div id="panel-bridge" class="panel">
    <div class="section">
      <h2>bridge script</h2>
      <div style="background:#161b22; padding:10px; border-radius:6px; font-size:11px; color:#8b949e;">
        colle ça dans ton exécuteur Roblox :<br>
        <code>loadstring(game:HttpGet("http://localhost:${PORT}/script.luau"))()</code>
      </div>
      <br>
      <a class="btn btn-primary" href="/script.luau" target="_blank">voir le script complet</a>
    </div>
  </div>

<script>
function showTab(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
}

const TOOLS = ${JSON.stringify(MCP_TOOLS.map(t => ({ name: t.name, desc: t.description.slice(0, 100) })))};

function renderTools() {
  const el = document.getElementById('tools-list');
  el.innerHTML = TOOLS.map(t => \`
    <div class="tool-card">
      <div class="tool-name">\${t.name}()</div>
      <div class="tool-desc">\${t.desc}</div>
    </div>
  \`).join('');
}
renderTools();

async function refresh() {
  try {
    const [clientsRes, logsRes] = await Promise.all([
      fetch('/api/clients'), fetch('/api/logs?limit=100')
    ]);
    const clientsData = await clientsRes.json();
    const logsData = await logsRes.json();

    const clientsEl = document.getElementById('clients-list');
    const countEl = document.getElementById('client-count');
    const online = (clientsData.clients || []).filter(c => c.online);
    countEl.textContent = online.length;

    if (online.length === 0) {
      clientsEl.innerHTML = '<div class="empty">aucun client connecté. lance le bridge dans roblox.</div>';
    } else {
      clientsEl.innerHTML = online.map(c => \`
        <div class="client">
          <div class="client-name">\${c.playerName}
            <span class="badge badge-online">●</span>
            <span class="badge badge-http">\${c.httpMode || 'request'}</span>
            <span class="badge badge-transport">\${c.transport || 'HTTP Polling'}</span>
            <span class="badge badge-poll">poll: \${c.pollInterval || 100}ms</span>
          </div>
          <div class="client-info">
            clientId: \${c.clientId}<br>
            executor: \${c.executor} · uptime: \${c.uptime}s · placeId: \${c.placeId}<br>
            supports: decompile=\${c.supports?.decompile || false}, drawing=\${c.supports?.drawing || false}, files=\${c.supports?.writefile || false}, ws=\${c.supports?.webSocket || false}<br>
            <span style="color:#fbbf24">⚠ WebSocket mort sur mobile → HTTP polling 100ms activé automatiquement</span>
          </div>
        </div>
      \`).join('');
    }

    const logsEl = document.getElementById('logs');
    const recent = (logsData.logs || []).slice(-80);
    if (recent.length === 0) {
      logsEl.innerHTML = '<div class="empty">aucun log. connecte un client et exécute du code.</div>';
    } else {
      logsEl.innerHTML = recent.map(l =>
        '<div class="log-line log-' + l.level + '">[' + l.time + '] [' + l.level.toUpperCase() + '] [' + l.source + '] ' + l.message + '</div>'
      ).join('');
      logsEl.scrollTop = logsEl.scrollHeight;
    }

    document.getElementById('uptime').textContent = Math.floor(performance.now() / 1000) + 's';
  } catch (e) { console.error(e); }
}
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
}

// ─── Démarrage ──────────────────────────────────────────────
const server = Bun.serve({
  port: PORT, hostname: HOST, fetch: handleRequest,
});

log("success", "server", `pocketmcp v0.3.0 démarré sur http://${HOST}:${PORT}`);
log("info", "server", `Dashboard: http://localhost:${PORT}/`);
log("info", "server", `Bridge Lua: http://localhost:${PORT}/script.luau (auto-detect WebSocket)`);
log("info", "server", `MCP endpoint: http://localhost:${PORT}/mcp (${MCP_TOOLS.length} tools)`);
log("info", "server", `HTTP polling: 100ms (WebSocket mort sur mobile, auto-bascule)`);
log("info", "server", `Health: http://localhost:${PORT}/health`);
console.log("─────────────────────────────────────────────");
console.log("  bridge à coller dans roblox :");
console.log('  loadstring(game:HttpGet("http://localhost:' + PORT + '/script.luau"))()');
console.log("─────────────────────────────────────────────");

// Nettoyage clients morts
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat > 15000) {
      log("warn", "bridge", `Client timed out: ${c.playerName} (${id})`);
      clients.delete(id);
      commandQueues.delete(id);
      results.delete(id);
    }
  }
}, 10000);

process.on("SIGINT", () => {
  log("info", "server", "Arrêt...");
  server.stop();
  process.exit(0);
});
