// ════════════════════════════════════════════════════════════
// PocketMCP Server · by Aeronscript (Mohamed Amine)
// Serveur MCP Roblox pour mobile (Termux + Bun)
// Port: 16384
// ════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 16384;
const HOST = "0.0.0.0"; // 0.0.0.0 pour partager sur LAN

// ─── État global ────────────────────────────────────────────
interface RobloxClient {
  clientId: string;
  playerName: string;
  userId: number;
  placeId: number;
  jobId: string;
  transport: string;
  connectedAt: number;
  lastHeartbeat: number;
  fps?: number;
}

interface Command {
  id: string;
  type: "execute" | "ping";
  code?: string;
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

const clients = new Map<string, RobloxClient>();
const commandQueues = new Map<string, Command[]>();
const results = new Map<string, CommandResult[]>();
const logs: LogEntry[] = [];
const MAX_LOGS = 200;

function log(level: LogEntry["level"], source: string, message: string) {
  const entry: LogEntry = {
    time: new Date().toLocaleTimeString("fr-FR"),
    level,
    source,
    message,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  const colors: Record<string, string> = {
    info: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    success: "\x1b[32m",
  };
  console.log(
    `${colors[level]}[${entry.time}] [${level.toUpperCase()}]${"\x1b[0m"} [${source}] ${message}`
  );
}

function genId(): string {
  return "cmd_" + Math.random().toString(36).slice(2, 10);
}

// ─── CORS helper ────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id",
};

// ─── HTTP routes ────────────────────────────────────────────
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ─── GET / ─── Dashboard minimal
  if (path === "/" && method === "GET") {
    return new Response(renderDashboard(), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
    });
  }

  // ─── GET /health ─── Health check
  if (path === "/health" && method === "GET") {
    return jsonResponse({
      ok: true,
      port: PORT,
      clients: clients.size,
      uptime: process.uptime(),
    });
  }

  // ─── GET /script.luau ─── Auto-serve le bridge
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

  // ─── POST /api/register ─── Enregistrement client Roblox
  if (path === "/api/register" && method === "POST") {
    try {
      const body = await req.json();
      const client: RobloxClient = {
        clientId: body.clientId || genId(),
        playerName: body.playerName || "Unknown",
        userId: body.userId || 0,
        placeId: body.placeId || 0,
        jobId: body.jobId || "",
        transport: body.transport || "HTTP Polling",
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };
      clients.set(client.clientId, client);
      commandQueues.set(client.clientId, []);
      results.set(client.clientId, []);
      log("success", "bridge", `Client connecté: ${client.playerName} (${client.clientId}) · ${client.transport}`);
      return jsonResponse({ ok: true, clientId: client.clientId });
    } catch (e: any) {
      log("error", "api", `register failed: ${e.message}`);
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  // ─── POST /api/poll ─── Client récupère ses commandes
  if (path === "/api/poll" && method === "POST") {
    try {
      const body = await req.json();
      const clientId = body.clientId;
      const queue = commandQueues.get(clientId) || [];
      const commands = queue.splice(0, queue.length); // drain
      if (commands.length > 0) {
        log("info", "bridge", `${clientId} polled ${commands.length} command(s)`);
      }
      return jsonResponse({ ok: true, commands });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  // ─── POST /api/result ─── Client envoie son résultat
  if (path === "/api/result" && method === "POST") {
    try {
      const body = await req.json();
      const clientId = body.clientId;
      const result: CommandResult = {
        commandId: body.commandId,
        result: body.result,
        receivedAt: Date.now(),
      };
      const list = results.get(clientId) || [];
      list.push(result);
      if (list.length > 50) list.shift();
      results.set(clientId, list);

      // Log le résultat
      const r = body.result || {};
      if (r.ok) {
        log("success", "exec", `command ${body.commandId} OK`);
        if (r.logs && r.logs.length > 0) {
          for (const l of r.logs.slice(0, 5)) {
            log("info", "stdout", l);
          }
        }
      } else {
        log("error", "exec", `command ${body.commandId} failed: ${r.error || "?"}`);
      }
      return jsonResponse({ ok: true });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 400);
    }
  }

  // ─── POST /api/heartbeat ─── Heartbeat client
  if (path === "/api/heartbeat" && method === "POST") {
    try {
      const body = await req.json();
      const client = clients.get(body.clientId);
      if (client) {
        client.lastHeartbeat = Date.now();
        if (body.fps) client.fps = body.fps;
      }
      return jsonResponse({ ok: true });
    } catch {
      return jsonResponse({ ok: false }, 400);
    }
  }

  // ─── GET /api/clients ─── Liste clients (pour dashboard)
  if (path === "/api/clients" && method === "GET") {
    const now = Date.now();
    const list = Array.from(clients.values()).map((c) => ({
      ...c,
      online: now - c.lastHeartbeat < 5000,
    }));
    return jsonResponse({ ok: true, clients: list });
  }

  // ─── GET /api/logs ─── Logs récents (pour dashboard)
  if (path === "/api/logs" && method === "GET") {
    return jsonResponse({ ok: true, logs });
  }

  // ─── POST /api/execute ─── Execute code via HTTP direct (sans MCP)
  if (path === "/api/execute" && method === "POST") {
    try {
      const body = await req.json();
      const { code, clientId } = body;
      const target = clientId || getFirstClient();
      if (!target) {
        return jsonResponse({ ok: false, error: "Aucun client connecté" }, 400);
      }
      const cmd: Command = {
        id: genId(),
        type: "execute",
        code,
        createdAt: Date.now(),
      };
      const queue = commandQueues.get(target) || [];
      queue.push(cmd);
      commandQueues.set(target, queue);
      log("info", "mcp", `execute_code queued on ${target} (${cmd.id})`);

      // Attendre le résultat (max 10s)
      const result = await waitForResult(target, cmd.id, 10000);
      if (result) {
        return jsonResponse({ ok: true, commandId: cmd.id, result: result.result });
      }
      return jsonResponse({ ok: false, error: "timeout (10s)" });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── POST /mcp ─── Endpoint MCP (HTTP + SSE response)
  if (path === "/mcp" && method === "POST") {
    return await handleMCP(req);
  }

  // ─── GET /mcp ─── SSE stream (notifications)
  if (path === "/mcp" && method === "GET") {
    return handleMCPStream(req);
  }

  // 404
  return new Response("Not found", { status: 404, headers: CORS });
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function getFirstClient(): string | null {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat < 5000) return id;
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

// ─── MCP Protocol (JSON-RPC 2.0 over HTTP) ──────────────────
const MCP_SESSIONS = new Map<string, any>();

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
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: "pocketmcp",
          version: "0.1.0",
        },
      };
      log("info", "mcp", `Session initialized: ${sessionId}`);
    } else if (method === "notifications/initialized") {
      // Just an ack
      return new Response(null, { status: 202, headers: CORS });
    } else if (method === "tools/list") {
      result = {
        tools: [
          {
            name: "execute_code",
            description:
              "Exécute du code Lua dans le client Roblox connecté. " +
              "Variables exposées: game, workspace, Players, etc. " +
              "Les print() et warn() sont capturés et retournés dans logs[].",
            inputSchema: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "Code Lua à exécuter",
                },
                clientId: {
                  type: "string",
                  description: "ID du client (optionnel, utilise le 1er si omis)",
                },
              },
              required: ["code"],
            },
          },
          {
            name: "list_clients",
            description: "Liste les clients Roblox actuellement connectés",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_logs",
            description: "Récupère les logs récents du serveur",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Nombre max de logs (défaut: 50)",
                },
              },
            },
          },
        ],
      };
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "execute_code") {
        const target = args.clientId || getFirstClient();
        if (!target) {
          result = {
            content: [
              {
                type: "text",
                text: "Erreur: Aucun client Roblox connecté. Démarre le bridge dans ton exécuteur mobile d'abord.",
              },
            ],
            isError: true,
          };
        } else {
          const cmd: Command = {
            id: genId(),
            type: "execute",
            code: args.code,
            createdAt: Date.now(),
          };
          const queue = commandQueues.get(target) || [];
          queue.push(cmd);
          commandQueues.set(target, queue);
          log("info", "mcp", `execute_code on ${target} (${cmd.id})`);

          const resultData = await waitForResult(target, cmd.id, 30000);
          if (resultData) {
            const r = resultData.result;
            const text = formatResult(r);
            result = {
              content: [{ type: "text", text }],
              isError: !r.ok,
            };
          } else {
            result = {
              content: [
                {
                  type: "text",
                  text: "Timeout: le client n'a pas répondu en 30s. Vérifie qu'il est toujours connecté.",
                },
              ],
              isError: true,
            };
          }
        }
      } else if (toolName === "list_clients") {
        const now = Date.now();
        const list = Array.from(clients.values())
          .filter((c) => now - c.lastHeartbeat < 5000)
          .map((c) => ({
            clientId: c.clientId,
            playerName: c.playerName,
            placeId: c.placeId,
            transport: c.transport,
            connectedAt: new Date(c.connectedAt).toISOString(),
          }));
        result = {
          content: [
            {
              type: "text",
              text: list.length === 0
                ? "Aucun client connecté."
                : `${list.length} client(s) connecté(s):\n${JSON.stringify(list, null, 2)}`,
            },
          ],
        };
      } else if (toolName === "get_logs") {
        const limit = args.limit || 50;
        const recent = logs.slice(-limit);
        result = {
          content: [
            {
              type: "text",
              text: recent
                .map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`)
                .join("\n"),
            },
          ],
        };
      } else {
        result = {
          content: [{ type: "text", text: `Outil inconnu: ${toolName}` }],
          isError: true,
        };
      }
    } else {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        },
        400
      );
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
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: e.message },
      },
      500
    );
  }
}

function handleMCPStream(req: Request): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(": ping\n\n");
      const interval = setInterval(() => {
        controller.enqueue(": ping\n\n");
      }, 30000);
      // Keep open
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

function formatResult(r: any): string {
  if (!r) return "Pas de résultat";
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
    background: #0a0d12;
    color: #c9d1d9;
    padding: 16px;
    min-height: 100vh;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #21262d;
    margin-bottom: 16px;
  }
  .logo { color: #4ade80; font-weight: bold; font-size: 14px; }
  .status { font-size: 11px; color: #8b949e; }
  .status .dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; background: #4ade80;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .section { margin-bottom: 20px; }
  .section h2 {
    color: #4ade80; font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 10px;
  }
  .client {
    background: #161b22; border: 1px solid #21262d;
    border-radius: 6px; padding: 12px; margin-bottom: 8px;
  }
  .client-name { color: #c9d1d9; font-weight: bold; font-size: 13px; }
  .client-info { color: #8b949e; font-size: 11px; margin-top: 4px; }
  .logs {
    background: #0d1117; border: 1px solid #21262d;
    border-radius: 6px; padding: 12px;
    height: 300px; overflow-y: auto;
    font-size: 11px; line-height: 1.6;
  }
  .log-line { white-space: pre-wrap; word-break: break-all; }
  .log-info { color: #38bdf8; }
  .log-warn { color: #fbbf24; }
  .log-error { color: #f87171; }
  .log-success { color: #4ade80; }
  .empty { color: #6e7681; font-style: italic; }
  .refresh-btn {
    background: #21262d; color: #c9d1d9; border: 1px solid #30363d;
    padding: 6px 12px; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 11px;
  }
  .refresh-btn:hover { background: #30363d; }
  a { color: #4ade80; text-decoration: none; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">pocket<span style="color:#c9d1d9">mcp</span></div>
      <div class="status"><span class="dot"></span>serveur actif · :${PORT}</div>
    </div>
    <button class="refresh-btn" onclick="location.reload()">↻ refresh</button>
  </div>

  <div class="section">
    <h2>bridge script</h2>
    <div style="background:#161b22; padding:10px; border-radius:6px; font-size:11px; color:#8b949e;">
      colle ça dans ton exécuteur Roblox :<br>
      <code style="color:#4ade80">loadstring(game:HttpGet("http://localhost:${PORT}/script.luau"))()</code>
    </div>
  </div>

  <div class="section">
    <h2>clients connectés (<span id="client-count">0</span>)</h2>
    <div id="clients-list"></div>
  </div>

  <div class="section">
    <h2>logs live</h2>
    <div class="logs" id="logs"></div>
  </div>

<script>
async function refresh() {
  try {
    const [clientsRes, logsRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/logs')
    ]);
    const clientsData = await clientsRes.json();
    const logsData = await logsRes.json();

    const clientsEl = document.getElementById('clients-list');
    const countEl = document.getElementById('client-count');
    const onlineClients = (clientsData.clients || []).filter(c => c.online);
    countEl.textContent = onlineClients.length;

    if (onlineClients.length === 0) {
      clientsEl.innerHTML = '<div class="empty">aucun client connecté. lance le bridge dans roblox.</div>';
    } else {
      clientsEl.innerHTML = onlineClients.map(c => \`
        <div class="client">
          <div class="client-name">\${c.playerName} <span style="color:#4ade80">●</span></div>
          <div class="client-info">
            clientId: \${c.clientId} · placeId: \${c.placeId} · transport: \${c.transport}<br>
            connecté: \${new Date(c.connectedAt).toLocaleTimeString('fr-FR')}
          </div>
        </div>
      \`).join('');
    }

    const logsEl = document.getElementById('logs');
    const recent = (logsData.logs || []).slice(-50);
    if (recent.length === 0) {
      logsEl.innerHTML = '<div class="empty">aucun log. connecte un client et exécute du code.</div>';
    } else {
      logsEl.innerHTML = recent.map(l =>
        '<div class="log-line log-' + l.level + '">[' + l.time + '] [' + l.level.toUpperCase() + '] [' + l.source + '] ' + l.message + '</div>'
      ).join('');
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  } catch (e) {
    console.error(e);
  }
}
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
}

// ─── Démarrage du serveur ───────────────────────────────────
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: handleRequest,
});

log("success", "server", `pocketmcp démarré sur http://${HOST}:${PORT}`);
log("info", "server", `Dashboard: http://localhost:${PORT}/`);
log("info", "server", `Bridge Lua: http://localhost:${PORT}/script.luau`);
log("info", "server", `MCP endpoint: http://localhost:${PORT}/mcp`);
log("info", "server", `Health: http://localhost:${PORT}/health`);
console.log("─────────────────────────────────────────────");
console.log("  bridge à coller dans roblox :");
console.log('  loadstring(game:HttpGet("http://localhost:' + PORT + '/script.luau"))()');
console.log("─────────────────────────────────────────────");

// Nettoyage des clients morts toutes les 10s
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat > 10000) {
      log("warn", "bridge", `Client timed out: ${c.playerName} (${id})`);
      clients.delete(id);
      commandQueues.delete(id);
      results.delete(id);
    }
  }
}, 10000);

// Garde le process vivant
process.on("SIGINT", () => {
  log("info", "server", "Arrêt en cours...");
  server.stop();
  process.exit(0);
});
