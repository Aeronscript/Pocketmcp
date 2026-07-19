// ════════════════════════════════════════════════════════════
// PocketMCP Server v2 · by Aeronscript (Mohamed Amine)
// Serveur MCP Roblox mobile-first — full feature set
// Port: 16384
// ════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// __dirname local (sert à localiser bridge.lua, à côté de ce fichier)
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Modules séparés (state, outils MCP, dashboard) ───────────
import {
  PORT, HOST, ADMIN_CODE, tempCodes, whitelistedClients,
  clients, commandQueues, results, logs,
  isValidCode, claimCode, generateTempCode, extractCode, getFirstClient,
  genId, jsonResponse, log, corsHeaders, CORS,
  checkServerRateLimit, getServerIP, isLocalRequest, setCurrentRequest,
  sendCommand,
} from "./src/state";
import { MCP_TOOLS, handleMCP, handleMCPStream } from "./src/tools";
import { renderDashboard } from "./src/dashboard";

async function handleRequest(req: Request): Promise<Response> {
  setCurrentRequest(req);
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // Dashboard
  if (path === "/" && method === "GET") {
    return new Response(renderDashboard(), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders(req) },
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
      headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders(req) },
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
  // Endpoints bridge (publics — le bridge Roblox ne peut pas envoyer de header Authorization) :
  //   /api/register, /api/poll, /api/result, /api/heartbeat
  // Endpoints dashboard local (publics uniquement depuis localhost) :
  //   /api/clients, /api/logs — le dashboard HTML sur / les appelle sans header Authorization
  // Le claim du code temporaire se fait via le body.code de /api/register (optionnel)
  const isPublicEndpoint =
    path === "/" || path === "/health" || path === "/script.luau" ||
    path === "/api/auth/verify" ||
    path === "/api/register" || path === "/api/poll" ||
    path === "/api/result" || path === "/api/heartbeat";

  // Le dashboard local (servi sur /) fait des fetch('/api/clients') et fetch('/api/logs')
  // sans header Authorization. On autorise ces endpoints uniquement depuis localhost
  // pour ne pas exposer le code admin dans le HTML tout en faisant marcher le dashboard.
  const isLocalDashboardEndpoint =
    (path === "/api/clients" || path === "/api/logs") && isLocalRequest(req);

  if (!isPublicEndpoint && !isLocalDashboardEndpoint) {
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
      // Le code peut venir du body (body.code — envoyé par le bridge via getgenv().PocketMCPCode)
      // ou d'un header Authorization / ?code= (pour l'admin UI)
      const code = body.code || extractCode(req, url);
      if (code && code !== ADMIN_CODE) {
        // Vérifie que le code existe dans tempCodes avant d'essayer de le claim
        // (un code bidon ou expiré est juste ignoré — le register réussit quand même)
        if (tempCodes.has(code)) {
          const claimed = claimCode(code, clientId);
          if (!claimed) {
            log("warn", "auth", `Code ${code} déjà réclamé par un autre client — refus`);
            return jsonResponse({ ok: false, error: "ce code a déjà été utilisé par un autre client" }, 403);
          }
        } else {
          log("info", "auth", `Code ${code} inconnu — ignoré (register sans claim)`);
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

  // ─── HTTP direct: analyze_game ───
  if (path === "/api/analyze" && method === "POST") {
    try {
      const body = await req.json();
      const target = body.clientId || getFirstClient();
      if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
      // analyze_game peut prendre du temps (jusqu'à 60s en mode full)
      const r = await sendCommand(target, {
        type: "analyze_game",
        mode: body.mode || "full",
        scope: body.scope || "all",
        pattern: body.pattern,
        dynamicDuration: body.dynamicDuration || 10,
        interactGui: body.interactGui === true,
      }, 120000);
      return jsonResponse(r);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── HTTP direct: find_gamepass_logic ───
  if (path === "/api/find-gamepass" && method === "POST") {
    try {
      const body = await req.json();
      const target = body.clientId || getFirstClient();
      if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
      const r = await sendCommand(target, {
        type: "find_gamepass_logic",
        gamepassId: body.gamepassId,
        mode: body.mode || "full",
        generateBypass: body.generateBypass !== false,
      }, 120000);
      return jsonResponse(r);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── HTTP direct: stealth_setup ───
  if (path === "/api/stealth" && method === "POST") {
    try {
      const body = await req.json();
      const target = body.clientId || getFirstClient();
      if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
      const r = await sendCommand(target, {
        type: "stealth_setup",
        action: body.action || "enable",
        features: body.features || ["kick", "metatable", "speed", "detect"],
      }, 15000);
      return jsonResponse(r);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── HTTP direct: player_control ───
  if (path === "/api/control" && method === "POST") {
    try {
      const body = await req.json();
      const target = body.clientId || getFirstClient();
      if (!target) return jsonResponse({ ok: false, error: "Aucun client" }, 400);
      const r = await sendCommand(target, {
        type: "player_control",
        action: body.action || "enable",
        features: body.features || [],
        value: body.value,
      }, 15000);
      return jsonResponse(r);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message }, 500);
    }
  }

  // ─── MCP endpoint ───
  if (path === "/mcp" && method === "POST") {
    return await handleMCP(req);
  }
  if (path === "/mcp" && method === "GET") {
    return handleMCPStream(req);
  }

  return new Response("Not found", { status: 404, headers: corsHeaders(req) });
}

const server = Bun.serve({
  port: PORT, hostname: HOST, fetch: handleRequest,
});

log("success", "server", `pocketmcp v0.3.1 démarré sur http://${HOST}:${PORT}`);
log("info", "server", `Dashboard: http://localhost:${PORT}/`);
log("info", "server", `Bridge Lua: http://localhost:${PORT}/script.luau (auto-detect WebSocket)`);
log("info", "server", `MCP endpoint: http://localhost:${PORT}/mcp (${MCP_TOOLS.length} tools)`);
