// ════════════════════════════════════════════════════════════
// PocketMCP Server — dashboard HTML (rendu + helpers JS inline)
// ════════════════════════════════════════════════════════════
import {
  clients, logs, results, commandQueues, getFirstClient, whitelistedClients,
  jsonResponse, log, ADMIN_CODE, tempCodes,
} from "./state";
import { MCP_TOOLS } from "./tools";

export function renderDashboard(): string {
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

  /* Badges tools */
  .badge-tool {
    display: inline-block; padding: 1px 6px; border-radius: 3px;
    font-size: 9px; margin-left: 4px; vertical-align: middle;
  }
  .badge-basic { background: #1e293b; color: #38bdf8; }
  .badge-advanced { background: #3b1e3b; color: #c084fc; }
  .badge-new { background: #1a4731; color: #4ade80; animation: pulse 2s infinite; }

  /* Cards tools avancés */
  .advanced-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px; margin-top: 8px;
  }
  .advanced-card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 12px; font-size: 11px; position: relative;
    transition: border-color 0.2s;
  }
  .advanced-card:hover { border-color: #c084fc; }
  .advanced-card .tool-icon {
    position: absolute; top: 10px; right: 10px;
    font-size: 16px; opacity: 0.7;
  }
  .advanced-card .tool-title {
    color: #c084fc; font-weight: bold; font-size: 12px;
    margin-bottom: 4px; padding-right: 24px;
  }
  .advanced-card .tool-full-desc {
    color: #8b949e; margin: 6px 0; font-size: 10px; line-height: 1.5;
  }
  .advanced-card .tool-args {
    background: #0d1117; border: 1px solid #21262d; border-radius: 4px;
    padding: 6px; margin: 6px 0; font-size: 10px; color: #fbbf24;
  }
  .advanced-card .tool-args code { background: none; padding: 0; color: #fbbf24; }
  .advanced-card .tool-actions {
    display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;
  }
  .btn-test {
    background: #3b1e3b; color: #c084fc; border: 1px solid #5b2e5b;
    padding: 4px 8px; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 10px;
  }
  .btn-test:hover { background: #5b2e5b; }
  .btn-test:disabled { opacity: 0.5; cursor: wait; }

  /* Modal résultat test */
  .result-modal {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); display: none;
    z-index: 1000; align-items: center; justify-content: center;
  }
  .result-modal.active { display: flex; }
  .result-modal-content {
    background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
    padding: 16px; max-width: 90vw; max-height: 80vh; overflow: auto;
    width: 700px; font-size: 11px;
  }
  .result-modal-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #21262d;
  }
  .result-modal-title { color: #c084fc; font-weight: bold; font-size: 13px; }
  .result-modal-close {
    background: #21262d; color: #c9d1d9; border: none;
    width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
    font-family: inherit;
  }
  .result-json {
    background: #161b22; padding: 10px; border-radius: 4px;
    color: #4ade80; white-space: pre-wrap; word-break: break-all;
    font-size: 10px; line-height: 1.5;
  }
  .result-status {
    display: inline-block; padding: 2px 8px; border-radius: 3px;
    font-size: 10px; margin-left: 8px;
  }
  .result-ok { background: #1a4731; color: #4ade80; }
  .result-err { background: #471a1a; color: #f87171; }

  /* Statbar top */
  .stats-bar {
    display: flex; gap: 12px; margin-bottom: 12px;
    padding: 8px 12px; background: #161b22;
    border: 1px solid #21262d; border-radius: 6px; font-size: 11px;
  }
  .stat-item { color: #8b949e; }
  .stat-item strong { color: #c9d1d9; }
  .stat-divider { color: #30363d; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">pocket<span style="color:#c9d1d9">mcp</span> <span style="color:#8b949e">v0.3.1</span></div>
      <div class="status"><span class="dot"></span>serveur actif · :${PORT} · <span id="uptime">0s</span></div>
    </div>
    <button class="btn" onclick="location.reload()">↻ refresh</button>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('clients', this)">clients</button>
    <button class="tab" onclick="showTab('logs', this)">logs</button>
    <button class="tab" onclick="showTab('tools', this)">outils MCP</button>
    <button class="tab" onclick="showTab('explorer', this)">explorer <span class="badge-new">NEW</span></button>
    <button class="tab" onclick="showTab('bridge', this)">bridge script</button>
  </div>

  <div class="stats-bar">
    <span class="stat-item">clients: <strong id="stat-clients">0</strong></span>
    <span class="stat-divider">|</span>
    <span class="stat-item">tools: <strong>${MCP_TOOLS.length}</strong></span>
    <span class="stat-divider">|</span>
    <span class="stat-item">uptime: <strong id="stat-uptime">0s</strong></span>
    <span class="stat-divider">|</span>
    <span class="stat-item">port: <strong>${PORT}</strong></span>
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
      <div style="margin-bottom: 8px; font-size: 11px; color: #8b949e;">
        <span class="badge-tool badge-basic">basic</span> outils standards ·
        <span class="badge-tool badge-advanced">advanced</span> outils avancés v0.3
      </div>
      <div class="tools-grid" id="tools-list"></div>
    </div>
  </div>

  <div id="panel-explorer" class="panel">
    <div class="section">
      <h2>explorer — outils avancés v0.3</h2>
      <p style="font-size: 11px; color: #8b949e; margin-bottom: 12px;">
        4 nouveaux outils pour analyser un jeu en profondeur, trouver des checks gamepass,
        activer des protections stealth et contrôler le joueur. clique sur "tester" pour
        lancer l'outil via son endpoint HTTP (nécessite un client connecté).
      </p>
      <div class="advanced-grid" id="advanced-tools"></div>
    </div>
  </div>

  <!-- Modal résultat test -->
  <div class="result-modal" id="result-modal" onclick="if(event.target===this)closeModal()">
    <div class="result-modal-content">
      <div class="result-modal-header">
        <div>
          <span class="result-modal-title" id="modal-title">résultat</span>
          <span class="result-status" id="modal-status"></span>
        </div>
        <button class="result-modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="result-json" id="modal-json"></div>
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

// Outils avancés (v0.3) avec infos complètes pour la tab explorer
const ADVANCED_TOOLS = [
  {
    name: "analyze_game",
    icon: "🔍",
    title: "analyze_game",
    desc: "analyseur profond d'un jeu. combine scan statique (décompile tous les scripts), spy dynamique (hook __namecall pendant N secondes) et liste des boutons GUI cliquables. plus puissant que spy_remotes.",
    args: '{ mode: "static|dynamic|full", scope: "all", pattern?: string, dynamicDuration: 10, interactGui: false }',
    endpoint: "/api/analyze",
    tests: [
      { label: "static", body: { mode: "static", scope: "all" } },
      { label: "full", body: { mode: "full", scope: "all", dynamicDuration: 5 } },
      { label: "pattern gamepass", body: { mode: "static", scope: "all", pattern: "gamepass" } },
    ],
  },
  {
    name: "find_gamepass_logic",
    icon: "🎟",
    title: "find_gamepass_logic",
    desc: "cherche les checks gamepass (UserOwnsGamePassAsync, PromptGamePassPurchase, IDs numériques) et génère automatiquement un snippet lua de bypass (hookfunction + newcclosure si supporté).",
    args: '{ gamepassId?: number, mode: "static|dynamic|full", generateBypass: true }',
    endpoint: "/api/find-gamepass",
    tests: [
      { label: "scan all", body: { mode: "static", generateBypass: true } },
      { label: "full + bypass", body: { mode: "full", generateBypass: true } },
    ],
  },
  {
    name: "stealth_setup",
    icon: "🛡",
    title: "stealth_setup",
    desc: "active des protections anti-anti-cheat (best-effort). bloque Player:Kick côté client, cache les hooks metatable, masque les changements WalkSpeed, hook getfenv/getrenv. à appeler une fois en début de session.",
    args: '{ action: "enable|disable|status", features: ["kick","metatable","speed","detect"] }',
    endpoint: "/api/stealth",
    tests: [
      { label: "enable all", body: { action: "enable", features: ["kick", "metatable", "speed", "detect"] } },
      { label: "status", body: { action: "status" } },
      { label: "disable", body: { action: "disable" } },
    ],
  },
  {
    name: "player_control",
    icon: "🎮",
    title: "player_control",
    desc: "active/désactive des features de contrôle du joueur. chaque feature est toggleable. l'utilisateur est admin de sa session.",
    args: '{ action: "enable|disable|status|set", features: ["walkspeed","noclip","teleport","autoclick","infjump"], value?: number }',
    endpoint: "/api/control",
    tests: [
      { label: "walkspeed=50", body: { action: "enable", features: ["walkspeed"], value: 50 } },
      { label: "noclip", body: { action: "enable", features: ["noclip"] } },
      { label: "status", body: { action: "status" } },
      { label: "disable all", body: { action: "disable", features: [] } },
    ],
  },
];

// Liste des outils basiques (les 10 originaux)
const BASIC_TOOLS = new Set(["execute_code","decompile_script","get_instances","spy_remotes","list_remotes","click_gui","screenshot","get_player_info","list_clients","get_logs"]);

function renderTools() {
  const el = document.getElementById('tools-list');
  el.innerHTML = TOOLS.map(t => {
    const isAdvanced = !BASIC_TOOLS.has(t.name);
    const badge = isAdvanced
      ? '<span class="badge-tool badge-advanced">advanced</span>'
      : '<span class="badge-tool badge-basic">basic</span>';
    return \`
    <div class="tool-card">
      <div class="tool-name">\${t.name}()\${badge}</div>
      <div class="tool-desc">\${t.desc}</div>
    </div>
  \`;
  }).join('');
}
renderTools();

function renderAdvancedTools() {
  const el = document.getElementById('advanced-tools');
  if (!el) return;
  el.innerHTML = ADVANCED_TOOLS.map((t, ti) => \`
    <div class="advanced-card">
      <div class="tool-icon">\${t.icon}</div>
      <div class="tool-title">\${t.title}</div>
      <div class="tool-full-desc">\${t.desc}</div>
      <div class="tool-args">args: <code>\${t.args}</code></div>
      <div class="tool-actions">
        \${t.tests.map((test, tsti) => \`<button class="btn-test" onclick="testAdvanced(\${ti}, \${tsti})">▶ \${test.label}</button>\`).join('')}
      </div>
    </div>
  \`).join('');
}
renderAdvancedTools();

async function testAdvanced(toolIdx, testIdx) {
  const t = ADVANCED_TOOLS[toolIdx];
  const test = t.tests[testIdx];
  const modal = document.getElementById('result-modal');
  const titleEl = document.getElementById('modal-title');
  const statusEl = document.getElementById('modal-status');
  const jsonEl = document.getElementById('modal-json');

  titleEl.textContent = t.name + ' — ' + test.label;
  statusEl.innerHTML = '<span class="result-status" style="background:#3b3220;color:#fbbf24;">⏳ loading...</span>';
  jsonEl.textContent = 'envoi de la requête...\\nendpoint: ' + t.endpoint + '\\nbody: ' + JSON.stringify(test.body, null, 2);
  modal.classList.add('active');

  try {
    const res = await fetch(t.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test.body),
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    const isOk = parsed.ok === true || (res.ok && !parsed.error);
    statusEl.innerHTML = isOk
      ? '<span class="result-status result-ok">✓ ok</span>'
      : '<span class="result-status result-err">✗ ' + (parsed.error || 'erreur') + '</span>';
    jsonEl.textContent = JSON.stringify(parsed, null, 2);
  } catch (e) {
    statusEl.innerHTML = '<span class="result-status result-err">✗ network error</span>';
    jsonEl.textContent = String(e);
  }
}

function closeModal() {
  document.getElementById('result-modal').classList.remove('active');
}

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

    // Stats bar
    const statClients = document.getElementById('stat-clients');
    const statUptime = document.getElementById('stat-uptime');
    if (statClients) statClients.textContent = online.length;
    if (statUptime) statUptime.textContent = Math.floor(performance.now() / 1000) + 's';
  } catch (e) { console.error(e); }
}
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
}
