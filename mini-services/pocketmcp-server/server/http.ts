// server/http.ts
// Serveur HTTP Bun : routing API + dashboard + bridge endpoints.
//
// Sécurité (VULN-006 fix + P0/P1 du rapport d'audit) :
// - CORS dynamique (pas de virgule non standard)
// - /api/clients et /api/logs : authentifiés (admin OU localhost, sinon 401)
// - /api/register : rate limit (100 échecs/10min, anti brute-force pairCode)
// - /api/poll, /api/result, /api/heartbeat : refusent les sessions > 24h (P0 #2)
// - Endpoints admin (/api/paircode, /api/snapshot, etc.) : admin code requis
import { serve } from "bun";
import {
  ROOT, ADMIN_CODE, logs, readFileSync, existsSync, join, PORT, HOST,
  clients as clientsMap, getPairCode, generatePairCode,
  isLocalRequest, getServerIP, checkServerRateLimit, isSessionExpired,
} from "./state.ts";
import {
  handleRegister, handlePoll, handleResult, handleHeartbeat, sendCommand,
} from "./bridge.ts";
import { handleMcp, callTool } from "./mcp.ts";
import { renderDashboard } from "./dashboard.ts";

// VULN-006 fix : CORS dynamique. On accepte uniquement localhost:16384
// et 127.0.0.1:16384. Une liste avec virgule n'est pas standard et les
// navigateurs la refusent.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:16384",
  "http://127.0.0.1:16384",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function authCode(req: Request): string {
  const h = req.headers.get("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return new URL(req.url).searchParams.get("code") || "";
}

function json(obj: any, status = 200, cors = {} as Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function readBody(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

const server = serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const p = url.pathname;
    const cors = corsHeaders(req);

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    // ── Dashboard ──
    if (p === "/" || p === "/index.html") {
      return new Response(renderDashboard(), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...cors },
      });
    }

    // ── Bridge script (sert bridge.built.lua si présent, sinon bridge.lua) ──
    if (p === "/script.luau" || p === "/script.lua") {
      const built = join(ROOT, "bridge.built.lua");
      const f = existsSync(built) ? built : join(ROOT, "bridge.lua");
      if (existsSync(f)) {
        // Injecte le pairCode courant pour que le bridge s'appaire AUTO (sans manip manuelle)
        const pc = getPairCode();
        const script = readFileSync(f, "utf-8").replace(/^\uFEFF/, "")
          .replace(/= __PAIR_CODE__/g, '= "' + pc.code + '"');
        return new Response(script, { headers: { "Content-Type": "text/plain; charset=utf-8", ...cors } });
      }
      return new Response("bridge introuvable", { status: 404 });
    }

    // ── Bridge endpoints ──
    if (p === "/api/register") {
      // VULN-006 fix / P2 #9 : rate limit sur /api/register (anti brute-force pairCode).
      // Le pairCode fait désormais 128 bits (32 hex), donc impossible à brute-force
      // dans le TTL de 10 min, mais le rate limit protège en plus.
      const body = await readBody(req);
      const result = await handleRegister(body);
      // Si register a échoué (pairCode invalide), on consomme 1 token de rate limit
      if (!result.ok) {
        const ip = getServerIP(req);
        const rl = checkServerRateLimit(ip);
        if (!rl.allowed) {
          return json({
            ok: false,
            error: "rate_limited",
            message: `Trop de tentatives. Réessaye dans ${Math.ceil((rl.retryAfter || 600) / 60)} min.`,
            retryAfter: rl.retryAfter,
          }, 429, cors);
        }
      }
      return json(result, 200, cors);
    }

    // P0 #2 fix : pour poll/result/heartbeat, on vérifie l'expiration 24h côté serveur.
    // Un client dont la session a expiré est déconnecté (renvoyé dans la réponse).
    if (p === "/api/poll") {
      const body = await readBody(req);
      const client = clientsMap.get(body.clientId);
      if (client && isSessionExpired(client)) {
        clientsMap.delete(body.clientId);
        return json({ ok: false, error: "session_expired", message: "Session > 24h, reconnecte-toi via /api/register avec un nouveau pairCode." }, 401, cors);
      }
      return json(handlePoll(body), 200, cors);
    }
    if (p === "/api/result") {
      const body = await readBody(req);
      const client = clientsMap.get(body.clientId);
      if (client && isSessionExpired(client)) {
        clientsMap.delete(body.clientId);
        return json({ ok: false, error: "session_expired" }, 401, cors);
      }
      return json(handleResult(body), 200, cors);
    }
    if (p === "/api/heartbeat") {
      const body = await readBody(req);
      const client = clientsMap.get(body.clientId);
      if (client && isSessionExpired(client)) {
        clientsMap.delete(body.clientId);
        return json({ ok: false, error: "session_expired" }, 401, cors);
      }
      return json(handleHeartbeat(body), 200, cors);
    }

    // ── Dashboard data (VULN-006 fix : auth stricte, pas de leak) ──
    // /api/clients et /api/logs sont accessibles SANS auth uniquement depuis localhost
    // (le dashboard servi sur / tourne en local sur le téléphone de l'utilisateur).
    // Depuis une autre IP (réseau local), il faut le code admin.
    const isLocal = isLocalRequest(req);
    const isAdmin = authCode(req) === ADMIN_CODE;
    const canViewDashboard = isLocal || isAdmin;

    if (p === "/api/clients") {
      if (!canViewDashboard) {
        // VULN-006 fix : on ne leak pas les données clients. 401 + rien.
        const ip = getServerIP(req);
        const rl = checkServerRateLimit(ip);
        if (!rl.allowed) return json({ ok: false, error: "rate_limited" }, 429, cors);
        return json({ ok: false, error: "authentification requise" }, 401, cors);
      }
      const now = Date.now();
      // P0 #2 fix : on filtre aussi les sessions expirées (24h) côté serveur
      const list = Array.from(clientsMap.values())
        .filter((c: any) => now - c.lastHeartbeat < 10000)
        .filter((c: any) => !isSessionExpired(c, now))
        .map((c: any) => ({
          clientId: c.clientId, playerName: c.playerName, placeId: c.placeId,
          online: true, executor: c.executor,
          uptime: Math.floor((now - c.connectedAt) / 1000),
          gameName: c.gameName, gameThumb: c.gameThumb, playing: c.playing,
          transport: c.transport,
        }));
      return json({ clients: list, authorized: true }, 200, cors);
    }
    if (p === "/api/logs") {
      if (!canViewDashboard) {
        const ip = getServerIP(req);
        const rl = checkServerRateLimit(ip);
        if (!rl.allowed) return json({ ok: false, error: "rate_limited" }, 429, cors);
        return json({ ok: false, error: "authentification requise" }, 401, cors);
      }
      const limit = Number(url.searchParams.get("limit")) || 50;
      return json({ logs: logs.slice(-limit) }, 200, cors);
    }

    // ── Pairing : (re)génère le pairCode (admin requis) ──
    if (p === "/api/paircode") {
      const code = authCode(req);
      if (code !== ADMIN_CODE) {
        const ip = getServerIP(req);
        const rl = checkServerRateLimit(ip);
        if (!rl.allowed) return json({ ok: false, error: "rate_limited" }, 429, cors);
        return json({ ok: false, error: "admin_required" }, 403, cors);
      }
      if (req.method === "POST") {
        const pc = generatePairCode();
        return json({ ok: true, pairCode: pc.code, expiresIn: Math.floor((pc.expiresAt - Date.now()) / 1000) }, 200, cors);
      }
      const pc = getPairCode();
      // VULN-006 fix : on n'expose jamais le code en GET, seulement les métadonnées.
      // Pour récupérer le code, l'admin doit POST /api/paircode pour en générer un nouveau.
      return json({
        ok: true,
        exists: !!pc,
        consumed: pc?.consumed || false,
        expiresIn: pc ? Math.max(0, Math.floor((pc.expiresAt - Date.now()) / 1000)) : 0,
      }, 200, cors);
    }

    // ── MCP JSON-RPC ──
    if (p === "/mcp") {
      const body = await readBody(req);
      return json(await handleMcp(body), 200, cors);
    }

    // ── Nouveaux outils : endpoints HTTP dédiés (dashboard) — admin requis ──
    // VULN-006 fix : tous les endpoints admin nécessitent le code admin.
    const requireAdmin = (req: Request) => {
      if (authCode(req) === ADMIN_CODE) return true;
      const ip = getServerIP(req);
      const rl = checkServerRateLimit(ip);
      if (!rl.allowed) return false;
      return false;
    };

    if (p === "/api/snapshot" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("snapshot", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/diff" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("diff", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/replay" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("replay", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/interact" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("interact", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/scan_exploit" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("scan_exploit", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/scan_race" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("scan_race", await readBody(req));
      return json(res, 200, cors);
    }
    if (p === "/api/scan_trust" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const res = await callTool("scan_trust", await readBody(req));
      return json(res, 200, cors);
    }

    // ── Outils avancés v0.3 (délégués au bridge) — admin requis ──
    if (p === "/api/analyze" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const r = await sendCommand("analyze_game", await readBody(req), 300000).catch((e) => ({ ok: false, error: e.message }));
      return json(r, 200, cors);
    }
    if (p === "/api/find-gamepass" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const r = await sendCommand("find_gamepass_logic", await readBody(req), 300000).catch((e) => ({ ok: false, error: e.message }));
      return json(r, 200, cors);
    }
    if (p === "/api/stealth" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const r = await sendCommand("stealth_setup", await readBody(req), 300000).catch((e) => ({ ok: false, error: e.message }));
      return json(r, 200, cors);
    }
    if (p === "/api/control" && req.method === "POST") {
      if (!requireAdmin(req)) return json({ ok: false, error: "admin_required" }, 403, cors);
      const r = await sendCommand("player_control", await readBody(req), 300000).catch((e) => ({ ok: false, error: e.message }));
      return json(r, 200, cors);
    }

    return json({ error: "Not found", path: p }, 404, cors);
  },
});

console.log(`\n🚀 PocketMCP server (v0.5) sur http://localhost:${PORT}`);
console.log(`📦 7 outils MCP: snapshot · diff · replay · interact · scan_exploit · scan_race · scan_trust`);
console.log(`🌐 Ouvre http://localhost:${PORT} dans ton navigateur\n`);
