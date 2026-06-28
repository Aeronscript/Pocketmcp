"use client";

import { useState } from "react";

type DocTab = "archi" | "api" | "config" | "examples" | "troubleshoot";

const TABS: { id: DocTab; label: string; icon: string }[] = [
  { id: "archi", label: "architecture", icon: "▤" },
  { id: "api", label: "api reference", icon: "◈" },
  { id: "config", label: "configuration", icon: "⚙" },
  { id: "examples", label: "exemples", icon: "▶" },
  { id: "troubleshoot", label: "dépannage", icon: "?" },
];

export function Docs() {
  const [tab, setTab] = useState<DocTab>("archi");

  return (
    <section id="docs" className="py-12 sm:py-24 scroll-mt-14 sm:scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            DOCS · RÉFÉRENCE TECHNIQUE
          </div>
          <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> man pocketmcp
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-mono">
            {"// documentation complète : architecture, api, configuration, exemples, dépannage"}
          </p>
        </div>

        {/* Terminal frame */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-primary/5">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary/70" />
              </div>
              <span className="ml-1 sm:ml-3 text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate">
                ~/pocketmcp/docs
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground shrink-0">
              v0.3.0
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-2 border-b border-border/40 bg-background/50 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-mono transition-colors border-b-2 ${
                  tab === t.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                <span className="text-[9px] sm:text-[10px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 max-h-[600px] overflow-auto">
            {tab === "archi" && <ArchiDoc />}
            {tab === "api" && <ApiDoc />}
            {tab === "config" && <ConfigDoc />}
            {tab === "examples" && <ExamplesDoc />}
            {tab === "troubleshoot" && <TroubleshootDoc />}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── ARCHITECTURE ───────────── */
function ArchiDoc() {
  return (
    <div className="space-y-6">
      {/* Prérequis honnêtes */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-[12px] sm:text-[13px] font-mono font-semibold text-amber-300 mb-2">
              prérequis avant l'install
            </h4>
            <ul className="space-y-1.5 text-[11px] sm:text-[12px] text-foreground/80 leading-relaxed font-mono">
              <li>• <span className="text-foreground">termux</span> installé depuis f-droid (la version play store est obsolète et casse tout)</li>
              <li>• <span className="text-foreground">un exécuteur roblox mobile</span> : delta, hydrogen, ou krnl mobile (doit supporter loadstring + httpget)</li>
              <li>• <span className="text-foreground">un client ia compatible mcp</span> : opencode, codex cli, claude code, claude desktop, anyclaw</li>
              <li>• <span className="text-foreground">connexion internet</span> pendant l'install (récupère le repo + dépendances)</li>
              <li>• <span className="text-foreground">compte roblox secondaire</span> recommandé (risque de ban existe pour tout exploit)</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-2">vue d'ensemble</h3>
        <p className="text-[12px] sm:text-[13px] text-foreground/70 leading-relaxed mb-3 font-mono">
          pocketmcp est composé de 3 briques qui communiquent via http/json :
          un serveur local, un bridge lua côté roblox, et un client ia compatible mcp.
          tout tourne sur votre tél, aucun cloud.
        </p>
        <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 sm:p-4 overflow-x-auto">
          <pre className="text-[10px] sm:text-[11px] leading-[1.6] font-mono text-muted-foreground">{`┌──────────────────────────────────────────────────────────┐
│  votre téléphone android                                  │
│                                                          │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │  termux      │    │  pocketmcp server (bun)      │   │
│  │  - node 18+  │───→│  port 16384                  │   │
│  │  - bun 1.3+  │    │                              │   │
│  └──────────────┘    │  - http api /api/*           │   │
│                      │  - mcp endpoint /mcp         │   │
│  ┌──────────────┐    │  - dashboard /               │   │
│  │  chrome      │←──→│  - bridge auto-servi         │   │
│  │  mobile      │    └──────────┬───────────────────┘   │
│  └──────────────┘               │ http polling 100ms     │
│                                 │                        │
│  ┌──────────────┐               │                        │
│  │  delta /     │←──────────────┘                        │
│  │  hydrogen    │                                        │
│  │  (roblox)    │                                        │
│  └──────────────┘                                        │
└──────────────────────────────────────────────────────────┘
         ↑ mcp json-rpc 2.0
         ↓
┌──────────────────────────────────────────────────────────┐
│  client ia (opencode / codex / claude / anyclaw)         │
│  connecté via routeur mc                                 │
└──────────────────────────────────────────────────────────┘`}</pre>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-2">flux d'une commande</h3>
        <ol className="space-y-2 text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed font-mono">
          <li><span className="text-primary">1.</span> l'ia appelle <code className="text-primary">POST /mcp</code> avec <code className="text-primary">tools/call execute_code</code></li>
          <li><span className="text-primary">2.</span> le serveur empile la commande dans la queue du client connecté</li>
          <li><span className="text-primary">3.</span> le bridge lua dans roblox poll <code className="text-primary">POST /api/poll</code> toutes les 100ms</li>
          <li><span className="text-primary">4.</span> il reçoit la commande, exécute le code via <code className="text-primary">loadstring()</code></li>
          <li><span className="text-primary">5.</span> les prints sont capturés et renvoyés via <code className="text-primary">POST /api/result</code></li>
          <li><span className="text-primary">6.</span> le serveur répond à l'ia avec le résultat formaté</li>
        </ol>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-2">pourquoi pas websocket ?</h3>
        <p className="text-[12px] sm:text-[13px] text-foreground/70 leading-relaxed font-mono">
          testé sur delta mobile : l'api <code className="text-primary">WebSocket</code> est bien présente dans l'exécuteur
          mais ne parvient pas à se connecter. le bridge essaie ws pendant 3s au démarrage,
          et si la connexion échoue il bascule automatiquement sur http polling 100ms.
          c'est transparent, aucune config n'est nécessaire.
          sur pc (synapse, script-ware) le websocket fonctionne normalement.
        </p>
      </div>
    </div>
  );
}

/* ───────────── API REFERENCE ───────────── */
function ApiDoc() {
  const endpoints = [
    { method: "GET", path: "/", desc: "dashboard html live (clients + logs)" },
    { method: "GET", path: "/health", desc: "health check json" },
    { method: "GET", path: "/script.luau", desc: "bridge lua auto-servi (à coller dans roblox)" },
    { method: "POST", path: "/api/register", desc: "enregistrement initial du client roblox" },
    { method: "POST", path: "/api/poll", desc: "client récupère ses commandes en attente" },
    { method: "POST", path: "/api/result", desc: "client envoie le résultat d'exécution" },
    { method: "POST", path: "/api/heartbeat", desc: "heartbeat 1s (timeout 10s)" },
    { method: "GET", path: "/api/clients", desc: "liste des clients connectés" },
    { method: "GET", path: "/api/logs", desc: "logs serveur récents (?limit=100)" },
    { method: "POST", path: "/api/execute", desc: "exécute du lua directement via http (sans mcp)" },
    { method: "POST", path: "/mcp", desc: "endpoint mcp json-rpc 2.0 (initialize, tools/list, tools/call)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">endpoints http</h3>
        <div className="space-y-1.5">
          {endpoints.map((e, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary/30 transition-colors">
              <span className={`shrink-0 text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                e.method === "GET" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {e.method}
              </span>
              <div className="min-w-0 flex-1">
                <code className="text-[11px] sm:text-[12px] font-mono text-foreground break-all">{e.path}</code>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">exemple : exécuter du lua via curl</h3>
        <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 overflow-x-auto">
          <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-muted-foreground">{`curl -X POST http://localhost:16384/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "print(\\"hello from pocketmcp\\")\\nprint(\\"player: \\" .. game.Players.LocalPlayer.Name)"
  }'

# réponse :
# {
#   "ok": true,
#   "result": {
#     "ok": true,
#     "result": "executed",
#     "logs": ["hello from pocketmcp", "player: PixelWarrior_88"]
#   }
# }`}</pre>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">exemple : appel mcp tools/call</h3>
        <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 overflow-x-auto">
          <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-muted-foreground">{`curl -X POST http://localhost:16384/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "execute_code",
      "arguments": {
        "code": "print(\\"via mcp\\")"
      }
    }
  }'

# réponse json-rpc :
# {
#   "jsonrpc": "2.0",
#   "id": 1,
#   "result": {
#     "content": [{
#       "type": "text",
#       "text": "── logs ──\\nvia mcp\\n── résultat ──\\nok: true"
#     }],
#     "isError": false
#   }
# }`}</pre>
        </div>
      </div>
    </div>
  );
}

/* ───────────── CONFIGURATION ───────────── */
function ConfigDoc() {
  const configs = [
    {
      name: "BridgeURL",
      default: '"localhost:16384"',
      desc: "url du serveur pocketmcp. changez si vous lancez le serveur sur un autre port ou machine.",
      example: 'getgenv().BridgeURL = "192.168.1.42:16384"  -- partager sur lan',
    },
    {
      name: "DisableWebSocket",
      default: "false",
      desc: "force le http polling dès le départ. utile si websocket est cassé (cas sur mobile).",
      example: 'getgenv().DisableWebSocket = true',
    },
    {
      name: "EnableWebSocket",
      default: "false",
      desc: "force websocket même si l'auto-détection dit non. pour tester sur pc.",
      example: 'getgenv().EnableWebSocket = true',
    },
    {
      name: "EnableRemoteSpy",
      default: "false",
      desc: "active le hook des remoteevents dès le démarrage du bridge.",
      example: 'getgenv().EnableRemoteSpy = true',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">variables getgenv() du bridge</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-4 font-mono">
          {"// à définir avant le loadstring() dans votre exécuteur"}
        </p>
        <div className="space-y-3">
          {configs.map((c) => (
            <div key={c.name} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <code className="text-[12px] sm:text-[13px] font-mono font-semibold text-foreground">{c.name}</code>
                <span className="text-[10px] text-muted-foreground font-mono">défaut: {c.default}</span>
              </div>
              <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed mb-2">{c.desc}</p>
              <div className="rounded-md bg-[#0d1117] p-2 overflow-x-auto">
                <code className="text-[10px] sm:text-[11px] font-mono text-emerald-400 whitespace-pre">{c.example}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">configuration client ia</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 font-mono">
          {"// ajoutez ce bloc dans la config mcp de votre client"}
        </p>
        <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 overflow-x-auto">
          <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-muted-foreground">{`{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}

# clients compatibles :
# - opencode (avec routeur mc)
# - codex cli
# - claude code
# - claude desktop
# - anyclaw`}</pre>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-3">partager sur lan (wifi)</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 font-mono">
          {"// pour piloter roblox sur votre tél depuis votre pc sur le même wifi"}
        </p>
        <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 overflow-x-auto">
          <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-muted-foreground">{`# sur le tél : ip du serveur
ip addr show wlan0 | grep inet
# → inet 192.168.1.42/24

# sur le pc : config client ia
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://192.168.1.42:16384/mcp",
      "transport": "http"
    }
  }
}

# ⚠ pas d'auth sur le port 16384. réseau de confiance uniquement.`}</pre>
        </div>
      </div>
    </div>
  );
}

/* ───────────── EXEMPLES ───────────── */
function ExamplesDoc() {
  const examples = [
    {
      title: "lire le nom du joueur local",
      desc: "premier test simple pour vérifier que ça marche",
      code: `print("player: " .. game.Players.LocalPlayer.Name)
print("userId: " .. game.Players.LocalPlayer.UserId)
print("placeId: " .. game.PlaceId)`,
    },
    {
      title: "changer la vitesse de marche",
      desc: "modifie walkspeed du personnage",
      code: `local char = game.Players.LocalPlayer.Character
local hum = char and char:FindFirstChildOfClass("Humanoid")
if hum then
  hum.WalkSpeed = 60
  print("walkspeed = 60")
else
  print("character not loaded")
end`,
    },
    {
      title: "lister tous les players",
      desc: "parcourt la liste des joueurs connectés",
      code: `local Players = game:GetService("Players")
for _, p in ipairs(Players:GetPlayers()) do
  print("- " .. p.Name .. " (id: " .. p.UserId .. ")")
end`,
    },
    {
      title: "espionner les remotes en live",
      desc: "active le spy puis log les fireserver",
      code: `-- via mcp tool spy_remotes (enabled: true)
-- puis attendez que le jeu fire des remotes
-- list_remotes retourne le résumé :

-- summary :
--   BuyItem: 14x
--   SendMessage: 8x
--   ReportPlayer: 2x`,
    },
    {
      title: "décompiler un module script",
      desc: "récupère le source d'un module du jeu",
      code: `-- via mcp tool decompile_script
-- path: "ReplicatedStorage.Modules.Shop"

-- retourne le source lua complet
-- utile pour comprendre la logique serveur`,
    },
    {
      title: "cliquer sur un bouton in-game",
      desc: "automatise un achat via firesignal",
      code: `-- via mcp tool click_gui
-- path: "StarterGui.ScreenGui.Frame.BuyButton"

-- retourne :
-- { ok: true, clicked: "BuyButton" }`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-mono font-semibold text-primary mb-2">exemples de code lua</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed font-mono">
          {"// à utiliser avec execute_code ou comme inspiration pour vos propres scripts"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {examples.map((ex, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
            <h4 className="text-[12px] sm:text-[13px] font-mono font-semibold text-foreground mb-1">{ex.title}</h4>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-2 leading-relaxed">{ex.desc}</p>
            <div className="rounded-md bg-[#0d1117] p-2 overflow-x-auto">
              <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-foreground/80 whitespace-pre">{ex.code}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── TROUBLESHOOTING ───────────── */
function TroubleshootDoc() {
  const issues = [
    {
      q: "le serveur ne démarre pas dans termux",
      a: `vérifiez que node 18+ est installé : node -v
si absent : pkg install nodejs
vérifiez que le port 16384 est libre : lsof -i :16384
si occupé : kill -9 $(lsof -t -i :16384)`,
    },
    {
      q: "le bridge ne se connecte pas au serveur",
      a: `1. vérifiez que le serveur répond : curl http://localhost:16384/health
2. vérifiez que votre exécuteur supporte loadstring + httpget
3. forcez le http polling : getgenv().DisableWebSocket = true
4. regardez les logs termux — vous devriez voir "register" arriver`,
    },
    {
      q: "l'ia ne voit pas le serveur mcp",
      a: `1. vérifiez que /mcp répond : curl -X POST http://localhost:16384/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
2. vérifiez votre config client ia (url + transport)
3. redémarrez votre client ia après modification de config`,
    },
    {
      q: "websocket ne marche pas sur mobile",
      a: `c'est normal. testé sur delta mobile : websocket est cassé.
le bridge détecte automatiquement l'échec après 3s et bascule sur http polling 100ms.
pas besoin de configurer quoi que ce soit.`,
    },
    {
      q: "execute_code timeout (30s)",
      a: `ça arrive si le client roblox est idle ou lag.
vérifiez que roblox est bien en premier plan.
réduisez la complexité du code exécuté.
le serveur logge les timeouts dans /api/logs.`,
    },
    {
      q: "decompile_script échoue",
      a: `vérifiez que votre exécuteur supporte decompile() :
list_clients → regardez supports.decompile
si false : votre exécuteur n'a pas decompile().
essayez synapse, script-ware ou krnl.`,
    },
    {
      q: "je veux partager le serveur avec mon pc",
      a: `lancez le serveur avec : bun run dev -- --host 0.0.0.0
récupérez l'ip du tél : ifconfig wlan0
sur le pc : curl http://[ip-tel]:16384/health
⚠ pas d'auth. réseau de confiance uniquement.`,
    },
    {
      q: "le serveur consomme beaucoup de batterie",
      a: `node + bun sur termux = ~2-5% batterie/heure en idle.
~8-12% quand l'ia exécute du code en boucle.
astuce : tmux new -s mcp, lancez bun run dev, détachez avec Ctrl+B D.
fermez le dashboard chrome si vous ne l'utilisez pas.`,
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h3 className="text-sm font-mono font-semibold text-primary mb-2">dépannage</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed font-mono">
          {"// problèmes courants et solutions"}
        </p>
      </div>
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`rounded-lg border bg-card overflow-hidden transition-all ${
            open === i ? "border-primary/40" : "border-border/40"
          }`}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-secondary/30 transition-colors"
          >
            <span className="text-[12px] sm:text-[13px] font-mono text-foreground/90">{issue.q}</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform shrink-0 ${open === i ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open === i && (
            <div className="px-3 pb-3">
              <div className="rounded-md bg-[#0d1117] p-2.5 overflow-x-auto">
                <pre className="text-[10px] sm:text-[11px] leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap">{issue.a}</pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
