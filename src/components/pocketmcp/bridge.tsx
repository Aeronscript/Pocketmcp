"use client";

import { useState } from "react";
import { toast } from "sonner";

const BRIDGE_CODE = `-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · planetscript
-- Coller dans Delta / Hydrogen / KRNL Mobile
-- Connecte ton client Roblox au serveur PocketMCP sur Android
-- ════════════════════════════════════════════════════════════

local BRIDGE_URL = getgenv().BridgeURL or "localhost:16384"
local USE_WEBSOCKET = not getgenv().DisableWebSocket
local POLL_INTERVAL = 0.2  -- 200ms en mode HTTP polling

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local LP = Players.LocalPlayer

-- ─── État du bridge ─────────────────────────────────────────
local state = {
  connected = false,
  clientId = "cli_" .. tostring(math.random(1000, 9999)),
  transport = USE_WEBSOCKET and "WebSocket" or "HTTP Polling",
  lastHeartbeat = 0,
}

-- ─── Exécution de code reçu ─────────────────────────────────
local function executeCode(code)
  local fn, err = loadstring(code)
  if not fn then
    return { ok = false, error = err }
  end
  local ok, result = pcall(fn)
  return { ok = ok, result = tostring(result), error = not ok and tostring(result) or nil }
end

-- ─── Liste des instances ────────────────────────────────────
local function getInstances(selector)
  -- Simplifié: supporte "game.X.Y.Z" et "game.X.*"
  local parts = {}
  for p in string.gmatch(selector, "[^.]+") do
    table.insert(parts, p)
  end
  local current = game
  for i, p in ipairs(parts) do
    if i == 1 and p == "game" then continue end
    if p == "*" then
      local results = {}
      for _, child in ipairs(current:GetChildren()) do
        table.insert(results, {
          name = child.Name,
          class = child.ClassName,
          path = child:GetFullName(),
        })
      end
      return results
    end
    current = current:FindFirstChild(p)
    if not current then return { error = "not found: " .. p } end
  end
  return {
    name = current.Name,
    class = current.ClassName,
    path = current:GetFullName(),
  }
end

-- ─── Envoi HTTP au serveur ──────────────────────────────────
local function send(path, data)
  local body = HttpService:JSONEncode(data)
  local ok, res = pcall(function()
    return request({
      Url = "http://" .. BRIDGE_URL .. path,
      Method = "POST",
      Headers = { ["Content-Type"] = "application/json" },
      Body = body,
    })
  end)
  if not ok or not res then return nil end
  return HttpService:JSONDecode(res.Body)
end

-- ─── Enregistrement initial ─────────────────────────────────
local function register()
  local data = {
    clientId = state.clientId,
    playerName = LP.Name,
    userId = LP.UserId,
    placeId = game.PlaceId,
    jobId = game.JobId,
    transport = state.transport,
  }
  local res = send("/api/register", data)
  if res and res.ok then
    state.connected = true
    state.lastHeartbeat = os.clock()
    print("[pocketmcp] connecté · " .. state.clientId .. " · " .. state.transport)
  else
    warn("[pocketmcp] échec connexion au serveur " .. BRIDGE_URL)
  end
end

-- ─── Polling des commandes ──────────────────────────────────
local function pollCommands()
  local res = send("/api/poll", { clientId = state.clientId })
  if not res or not res.commands then return end
  for _, cmd in ipairs(res.commands) do
    local result
    if cmd.type == "execute" then
      result = executeCode(cmd.code)
    elseif cmd.type == "get_instances" then
      result = getInstances(cmd.selector)
    elseif cmd.type == "ping" then
      result = { ok = true, pong = os.clock() }
    end
    if result then
      send("/api/result", {
        clientId = state.clientId,
        commandId = cmd.id,
        result = result,
      })
    end
  end
end

-- ─── Heartbeat ──────────────────────────────────────────────
task.spawn(function()
  while task.wait(1) do
    if state.connected then
      send("/api/heartbeat", {
        clientId = state.clientId,
        fps = 1 / (RunService.RenderStepped:Wait() or 0.016),
        time = os.time(),
      })
    end
  end
end)

-- ─── Mode WebSocket ─────────────────────────────────────────
if USE_WEBSOCKET then
  pcall(function()
    local ws = WebSocket.connect("ws://" .. BRIDGE_URL .. "/ws")
    ws.OnMessage:Connect(function(msg)
      local cmd = HttpService:JSONDecode(msg)
      -- Même dispatch que pollCommands
      local result
      if cmd.type == "execute" then
        result = executeCode(cmd.code)
      elseif cmd.type == "get_instances" then
        result = getInstances(cmd.selector)
      end
      if result then
        ws:Send(HttpService:JSONEncode({
          commandId = cmd.id,
          result = result,
        }))
      end
    end)
    ws:Connect()
  end)
end

-- ─── Démarrage ──────────────────────────────────────────────
register()
if not USE_WEBSOCKET then
  task.spawn(function()
    while task.wait(POLL_INTERVAL) do
      if state.connected then pollCommands() end
    end
  end)
end

-- ─── Spy des RemoteEvents (optionnel) ───────────────────────
if getgenv().EnableRemoteSpy then
  local mt = getrawmetatable(game)
  setreadonly(mt, false)
  local old = mt.__namecall
  mt.__namecall = newcclosure(function(self, ...)
    local m = getnamecallmethod()
    if (m == "FireServer" or m == "InvokeServer")
       and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
      send("/api/remote", {
        name = self:GetDebugName(),
        kind = m,
        path = self:GetFullName(),
        args = {...},
      })
    end
    return old(self, ...)
  end)
end

print("[pocketmcp] bridge ready · " .. state.clientId)`;

const BRIDGE_MINIMAL = `-- version courte (juste exec)
local url = "localhost:16384"
loadstring(game:HttpGet("http://" .. url .. "/script.luau"))()`;

export function Bridge() {
  const [view, setView] = useState<"full" | "minimal">("minimal");
  const [copied, setCopied] = useState(false);

  const code = view === "full" ? BRIDGE_CODE : BRIDGE_MINIMAL;

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("bridge.luau copié", {
      description: view === "full" ? "code complet · 100 lignes" : "version courte · 3 lignes",
    });
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <section id="bridge" className="py-16 sm:py-24 scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            BRIDGE · LUA SCRIPT
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> cat bridge.luau
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            {"// à coller dans delta / hydrogen / krnl mobile"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-primary/5">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="ml-3 text-[11px] text-muted-foreground font-mono">~/bridge.luau</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Toggle full/minimal */}
              <div className="flex items-center gap-1 rounded-md bg-background/60 p-0.5 border border-border/40">
                <button
                  onClick={() => setView("minimal")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all ${
                    view === "minimal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  minimal
                </button>
                <button
                  onClick={() => setView("full")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all ${
                    view === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  full source
                </button>
              </div>

              <button
                onClick={copy}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all ${
                  copied
                    ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                }`}
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    copié !
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    copier
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="relative bg-[#0d1117]">
            <pre className="max-h-[480px] overflow-auto p-4 text-[12px] leading-[1.6] font-mono">
              <code className="text-[#c9d1d9] whitespace-pre">{code}</code>
            </pre>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-secondary/30 text-[10px] font-mono text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="text-primary">● lua</span>
              <span>utf-8</span>
              <span>lf</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{code.split("\n").length} lignes</span>
              <span>{code.length.toLocaleString("fr-FR")} caractères</span>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm shrink-0">⚠</span>
              <div>
                <div className="text-[12px] font-mono font-semibold text-amber-300 mb-1">websocket cassé ?</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  ajoute <code className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-300">getgenv().DisableWebSocket = true</code> avant le loadstring. le serveur bascule en http polling (200ms).
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-primary text-sm shrink-0">✓</span>
              <div>
                <div className="text-[12px] font-mono font-semibold text-primary mb-1">remote spy optionnel</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  active <code className="px-1 py-0.5 rounded bg-primary/10 text-primary">getgenv().EnableRemoteSpy = true</code> pour hook les FireServer et les logger sur le serveur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
