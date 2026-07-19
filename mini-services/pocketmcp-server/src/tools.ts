// ════════════════════════════════════════════════════════════
// PocketMCP Server — outils MCP (définition + handlers)
// ════════════════════════════════════════════════════════════
import {
  clients, commandQueues, results, logs, getFirstClient, genId, log,
  jsonResponse, corsHeaders, extractCode, isValidCode, ADMIN_CODE, tempCodes,
  setCurrentRequest,
} from "./state";
import { formatResult } from "./tools-format";

// Sessions MCP actives (id -> contexte)
export const MCP_SESSIONS = new Map<string, any>();

export const MCP_TOOLS = [
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
  {
    name: "analyze_game",
    description:
      "Analyseur profond d'un jeu Roblox. Plus puissant que spy_remotes : combine scan statique (décompile tous les LocalScript/ModuleScript accessibles, cherche patterns remotes/gamepass/anti-cheat/modules) + spy dynamique (hook __namecall pendant N secondes) + liste des boutons GUI cliquables. " +
      "Modes : 'static' (scan seulement), 'dynamic' (spy seulement), 'full' (les deux). " +
      "Retourne un rapport consolidé : remotes trouvés, checks gamepass, hints anti-cheat, modules chargés, boutons GUI, events dynamiques observés.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["static", "dynamic", "full"],
          description: "static = scan scripts seulement, dynamic = spy remotes seulement, full = les deux (défaut)",
        },
        scope: {
          type: "string",
          enum: ["ReplicatedStorage", "StarterGui", "StarterPlayer", "Workspace", "all"],
          description: "Service(s) à scanner (défaut: all)",
        },
        pattern: {
          type: "string",
          description: "Filtre optionnel — ne garde que les scripts contenant ce pattern (ex: 'gamepass', 'admin', 'Purchase')",
        },
        dynamicDuration: {
          type: "number",
          description: "Durée du spy dynamique en secondes (défaut: 10)",
        },
        interactGui: {
          type: "boolean",
          description: "Si true, clique sur les TextButtons visibles pendant le spy dynamique pour générer du trafic",
        },
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "find_gamepass_logic",
    description:
      "Cherche spécifiquement les checks gamepass (MarketplaceService:UserOwnsGamePassAsync, PromptGamePassPurchase, IDs numériques) dans tous les scripts client-accessibles. " +
      "Génère automatiquement un snippet Lua de bypass (hookfunction + newcclosure si supporté, sinon mock de table). " +
      "L'IA peut exécuter le bypass directement via execute_code, l'expliquer à l'utilisateur, ou le modifier. " +
      "Modes : 'static' (scan scripts), 'dynamic' (spy remotes filtrés purchase/gamepass pendant 8s), 'full' (les deux).",
    inputSchema: {
      type: "object",
      properties: {
        gamepassId: {
          type: "number",
          description: "ID spécifique à chercher (optionnel — si omis, cherche tous les gamepass)",
        },
        mode: {
          type: "string",
          enum: ["static", "dynamic", "full"],
          description: "static = scan scripts, dynamic = spy remotes, full = les deux (défaut)",
        },
        generateBypass: {
          type: "boolean",
          description: "Si true (défaut), génère un snippet Lua de bypass pour chaque check trouvé",
        },
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "stealth_setup",
    description:
      "Active des protections anti-anti-cheat (best-effort, dépend de l'exécuteur). À appeler UNE FOIS au début de session avant d'exécuter du code sensible. " +
      "Features disponibles : 'kick' (bloque Player:Kick côté client), 'metatable' (cache les hooks metatable), 'speed' (masque les changements WalkSpeed), 'detect' (hook getfenv/getrenv pour masquer l'environnement). " +
      "Actions : 'enable' (active les features), 'disable' (désactive tout), 'status' (retourne l'état actuel).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["enable", "disable", "status"],
          description: "enable = active (défaut), disable = désactive tout, status = retourne l'état",
        },
        features: {
          type: "array",
          items: { type: "string", enum: ["kick", "metatable", "speed", "detect"] },
          description: "Features à activer (défaut: toutes). Ignoré si action=disable/status.",
        },
        clientId: { type: "string" },
      },
    },
  },
  {
    name: "player_control",
    description:
      "Active/désactive des features de contrôle du joueur local. Chaque feature est toggling — l'utilisateur est admin de sa session. " +
      "Features : 'walkspeed' (set WalkSpeed, value optionnel custom), 'jumppower' (set JumpPower), 'noclip' (désactive collisions), 'teleport' (teleport au clic souris), 'autoclick' (clique tous les boutons GUI visibles en boucle), 'infjump' (jump illimité). " +
      "Actions : 'enable' (active les features), 'disable' (désactive, restaure WalkSpeed/JumpPower), 'status' (retourne l'état), 'set' (comme enable mais avec valeur custom via 'value').",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["enable", "disable", "status", "set"],
          description: "enable = active, disable = désactive, status = état, set = active avec valeur custom",
        },
        features: {
          type: "array",
          items: { type: "string", enum: ["walkspeed", "jumppower", "noclip", "teleport", "autoclick", "infjump"] },
          description: "Features à activer/désactiver",
        },
        value: {
          type: "number",
          description: "Valeur custom pour walkspeed/jumppower (ex: 100). Optionnel.",
        },
        clientId: { type: "string" },
      },
    },
  },
];

export async function handleMCP(req: Request): Promise<Response> {
  setCurrentRequest(req);
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
      return new Response(null, { status: 202, headers: corsHeaders(req) });
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
        } else if (toolName === "analyze_game") {
          cmd = {
            type: "analyze_game",
            mode: args.mode || "full",
            scope: args.scope || "all",
            pattern: args.pattern,
            dynamicDuration: args.dynamicDuration || 10,
            interactGui: args.interactGui === true,
          };
        } else if (toolName === "find_gamepass_logic") {
          cmd = {
            type: "find_gamepass_logic",
            gamepassId: args.gamepassId,
            mode: args.mode || "full",
            generateBypass: args.generateBypass !== false,
          };
        } else if (toolName === "stealth_setup") {
          cmd = {
            type: "stealth_setup",
            action: args.action || "enable",
            features: args.features || ["kick", "metatable", "speed", "detect"],
          };
        } else if (toolName === "player_control") {
          cmd = {
            type: "player_control",
            action: args.action || "enable",
            features: args.features || [],
            value: args.value,
          };
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
          ...corsHeaders(req),
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

export function handleMCPStream(req: Request): Response {
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
      ...corsHeaders(req),
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

