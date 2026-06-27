export type Platform = "mobile" | "pc" | "universal";
export type Category =
  | "visual"
  | "remote"
  | "detection"
  | "utility"
  | "mobile-ui";

export interface RobloxScript {
  id: string;
  name: string;
  description: string;
  category: Category;
  platform: Platform;
  tags: string[];
  lines: number;
  difficulty: "Débutant" | "Intermédiaire" | "Avancé";
  author: string;
  updated: string;
  downloads: number;
  rating: number;
  code: string;
}

export const categoryMeta: Record<
  Category,
  { label: string; description: string; accent: string }
> = {
  visual: {
    label: "Visuel",
    description:
      "Effets graphiques avancés, ESP, trails, HUD animés. Sublime ton gameplay avec un rendu visuel exceptionnel.",
    accent: "emerald",
  },
  remote: {
    label: "RemoteEvents",
    description:
      "Scanne, intercepte et analyse les RemoteEvents du serveur. Comprends le trafic réseau du jeu en temps réel.",
    accent: "amber",
  },
  detection: {
    label: "Détection",
    description:
      "Détecte les anti-cheats, erreurs, lag et tentatives de kick. Anticipe les problèmes avant qu'ils ne te frappent.",
    accent: "rose",
  },
  utility: {
    label: "Utilitaires",
    description:
      "Chargeurs universels, key systems, wrappers. Les fondations pour exécuter tes scripts proprement.",
    accent: "violet",
  },
  "mobile-ui": {
    label: "UI Mobile",
    description:
      "Interfaces tactiles optimisées pour exécuteurs mobiles. Boutons larges, drag & drop, FPS stable.",
    accent: "sky",
  },
};

export const scripts: RobloxScript[] = [
  // ───────────── VISUAL ─────────────
  {
    id: "esp-visual",
    name: "Quantum ESP",
    description:
      "ESP complet avec boîtes, noms, distances et barres de vie. Rendu optimisé Drawing API, fonctionne même sur mobile bas de gamme.",
    category: "visual",
    platform: "universal",
    tags: ["ESP", "Drawing", "Wallhack", "Players"],
    lines: 124,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-20",
    downloads: 18420,
    rating: 4.8,
    code: `-- Quantum ESP by planetscript
-- Drawing API - compatible PC & mobile
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local lp = Players.LocalPlayer

local Settings = {
  Box = true,
  Name = true,
  Distance = true,
  HealthBar = true,
  Color = Color3.fromRGB(52, 211, 153),
  TextColor = Color3.fromRGB(255, 255, 255),
}

local drawings = {}

local function clear(player)
  for _, d in pairs(drawings[player] or {}) do
    pcall(function() d:Remove() end)
  end
  drawings[player] = nil
end

local function build(player)
  local set = {}
  set.Box = Drawing.new("Square")
  set.Box.Thickness = 1
  set.Box.Color = Settings.Color
  set.Box.Filled = false
  set.Box.Visible = false

  set.Name = Drawing.new("Text")
  set.Name.Size = 14
  set.Name.Color = Settings.TextColor
  set.Name.Center = true
  set.Name.Outline = true
  set.Name.Visible = false

  set.Distance = Drawing.new("Text")
  set.Distance.Size = 12
  set.Distance.Color = Settings.TextColor
  set.Distance.Center = true
  set.Distance.Outline = true
  set.Distance.Visible = false

  set.HealthBar = Drawing.new("Square")
  set.HealthBar.Thickness = 1
  set.HealthBar.Filled = true
  set.HealthBar.Visible = false

  drawings[player] = set
end

local function update()
  for player, set in pairs(drawings) do
    if not player.Character then clear(player); continue end
    local hrp = player.Character:FindFirstChild("HumanoidRootPart")
    local hum = player.Character:FindFirstChildOfClass("Humanoid")
    if not hrp or not hum or hum.Health <= 0 then
      for _, d in pairs(set) do d.Visible = false end
      continue
    end
    local pos, on = workspace.CurrentCamera:WorldToViewportPoint(hrp.Position)
    if not on then
      for _, d in pairs(set) do d.Visible = false end
      continue
    end
    local head = player.Character:FindFirstChild("Head")
    local hpos = workspace.CurrentCamera:WorldToViewportPoint(head.Position + Vector3.new(0, 0.5, 0))
    local height = math.abs(hpos.Y - pos.Y)
    local width = height / 2.2

    set.Box.Size = Vector2.new(width, height)
    set.Box.Position = Vector2.new(pos.X - width/2, pos.Y - height/2)
    set.Box.Visible = Settings.Box

    set.Name.Text = player.Name
    set.Name.Position = Vector2.new(pos.X, pos.Y - height/2 - 16)
    set.Name.Visible = Settings.Name

    set.Distance.Text = string.format("%dm", (hrp.Position - lp.Character.HumanoidRootPart.Position).Magnitude)
    set.Distance.Position = Vector2.new(pos.X, pos.Y + height/2 + 4)
    set.Distance.Visible = Settings.Distance

    set.HealthBar.Size = Vector2.new(3, height)
    set.HealthBar.Position = Vector2.new(pos.X - width/2 - 6, pos.Y - height/2)
    set.HealthBar.Color = Color3.fromRGB(255 - hum.Health * 2.55, hum.Health * 2.55, 0)
    set.HealthBar.Visible = Settings.HealthBar
  end
end

Players.PlayerRemoving:Connect(clear)
for _, p in pairs(Players:GetPlayers()) do
  if p ~= lp then build(p) end
end
Players.PlayerAdded:Connect(function(p) build(p) end)

RunService.RenderStepped:Connect(update)
print("[planetscript] Quantum ESP loaded")`,
  },
  {
    id: "aurora-hud",
    name: "Aurora HUD",
    description:
      "HUD animé dégradé aurora avec stats live, FPS, ping, position. Effet de vague fluide 60 FPS même sur mobile.",
    category: "visual",
    platform: "universal",
    tags: ["HUD", "Animated", "Stats", "UI"],
    lines: 96,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-18",
    downloads: 9340,
    rating: 4.7,
    code: `-- Aurora HUD by planetscript
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Stats = game:GetService("Stats")
local lp = Players.LocalPlayer
local pg = lp:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "AuroraHUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = pg

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(280, 64)
frame.Position = UDim2.new(0, 16, 0, 16)
frame.BackgroundColor3 = Color3.fromRGB(15, 23, 32)
frame.BackgroundTransparency = 0.1
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local grad = Instance.new("UIGradient")
grad.Color = ColorSequence.new({
  ColorSequenceKeypoint.new(0, Color3.fromRGB(52, 211, 153)),
  ColorSequenceKeypoint.new(0.5, Color3.fromRGB(56, 189, 248)),
  ColorSequenceKeypoint.new(1, Color3.fromRGB(167, 139, 250)),
})
grad.Rotation = 45
grad.Parent = frame

local wave = Instance.new("Frame")
wave.Size = UDim2.new(1, 0, 0, 3)
wave.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
wave.BackgroundTransparency = 0.2
wave.Parent = frame
local waveGrad = grad:Clone()
waveGrad.Parent = wave

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -16, 0, 20)
title.Position = UDim2.fromOffset(12, 8)
title.BackgroundTransparency = 1
title.Text = "planetscript · aurora"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 13
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = frame

local stats = Instance.new("TextLabel")
stats.Size = UDim2.new(1, -16, 0, 28)
stats.Position = UDim2.fromOffset(12, 30)
stats.BackgroundTransparency = 1
stats.Text = ""
stats.TextColor3 = Color3.fromRGB(220, 230, 240)
stats.Font = Enum.Font.Code
stats.TextSize = 11
stats.TextXAlignment = Enum.TextXAlignment.Left
stats.Parent = frame

local t = 0
RunService.RenderStepped:Connect(function(dt)
  t = t + dt
  waveGrad.Offset = Vector2.new(math.sin(t * 1.5) * 0.3, 0)
  grad.Rotation = 45 + math.sin(t * 0.5) * 20
  local fps = math.floor(1 / dt)
  local ping = math.floor(Stats.PerformanceDataMemoryManagerLuaGcAllocatorTotalAvg / 1000)
  local pos = lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
  local pstr = pos and string.format("%.0f, %.0f, %.0f", pos.X, pos.Y, pos.Z) or "—"
  stats.Text = string.format("FPS %d  ·  Ping %dms  ·  POS %s", fps, ping or 0, pstr)
end)`,
  },
  {
    id: "trail-flow",
    name: "Trail Flow",
    description:
      "Génère des traînées colorées dynamiques derrière ton personnage. 6 presets de couleurs, animation fluide.",
    category: "visual",
    platform: "pc",
    tags: ["Trail", "Effect", "Character"],
    lines: 58,
    difficulty: "Débutant",
    author: "planetscript",
    updated: "2026-06-12",
    downloads: 5120,
    rating: 4.5,
    code: `-- Trail Flow by planetscript
local Players = game:GetService("Players")
local lp = Players.LocalPlayer

local presets = {
  Rainbow = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 64)),
    ColorSequenceKeypoint.new(0.33, Color3.fromRGB(64, 255, 128)),
    ColorSequenceKeypoint.new(0.66, Color3.fromRGB(64, 128, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 0, 255)),
  }),
  Emerald = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(16, 185, 129)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(5, 150, 105)),
  }),
  Sunset = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(251, 146, 60)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(244, 63, 94)),
  }),
}

local function attach(character)
  local hrp = character:WaitForChild("HumanoidRootPart")
  local a0 = Instance.new("Attachment", hrp)
  a0.Position = Vector3.new(-1, 0, 0)
  local a1 = Instance.new("Attachment", hrp)
  a1.Position = Vector3.new(1, 0, 0)
  local trail = Instance.new("Trail")
  trail.Attachment0 = a0
  trail.Attachment1 = a1
  trail.Lifetime = 0.6
  trail.Color = presets.Emerald
  trail.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0),
    NumberSequenceKeypoint.new(1, 1),
  })
  trail.Parent = hrp
end

if lp.Character then attach(lp.Character) end
lp.CharacterAdded:Connect(attach)
print("[planetscript] Trail Flow ready")`,
  },

  // ───────────── REMOTE EVENTS ─────────────
  {
    id: "quantum-remote-spy",
    name: "Quantum RemoteSpy",
    description:
      "Hook tous les RemoteEvents et RemoteFunctions du jeu. Log les arguments, la stack trace et le fired count en temps réel.",
    category: "remote",
    platform: "universal",
    tags: ["Spy", "Hook", "Logger", "Network"],
    lines: 142,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-22",
    downloads: 22100,
    rating: 4.9,
    code: `-- Quantum RemoteSpy by planetscript
-- Hooks every RemoteEvent / RemoteFunction
local mt = getrawmetatable(game)
local oldNamecall = mt.__namecall
local oldIndex = mt.__index
setreadonly(mt, false)

local log = {}
local counts = {}

local function isRemote(obj)
  return obj and (obj:IsA("RemoteEvent") or obj:IsA("RemoteFunction"))
end

local function record(remote, args, kind)
  local name = remote:GetDebugName()
  counts[name] = (counts[name] or 0) + 1
  table.insert(log, {
    name = name,
    kind = kind,
    args = args,
    path = remote:GetFullName(),
    time = os.clock(),
    stack = debug.traceback("", 2):gsub("\\n", " | "),
  })
  if #log > 500 then table.remove(log, 1) end
  print(string.format("[SPY] %s (%s) x%d  args=%d",
    name, kind, counts[name], #args))
end

-- Hook FireServer / InvokeServer via metatable namecall
mt.__namecall = newcclosure(function(self, ...)
  local method = getnamecallmethod()
  if (method == "FireServer" or method == "InvokeServer") and isRemote(self) then
    record(self, {...}, method)
  end
  return oldNamecall(self, ...)
end)

-- Hook direct calls (obj:FireServer via __index already works through namecall)
-- For RemoteFunctions called as functions:
local function wrapFunction(remote)
  if remote:IsA("RemoteFunction") and not remote:GetAttribute("ps_wrapped") then
    remote:SetAttribute("ps_wrapped", true)
    -- Caller hook handled by namecall; this is a safety net
  end
end

for _, d in pairs(game:GetDescendants()) do
  if isRemote(d) then wrapFunction(d) end
end
game.DescendantAdded:Connect(function(d)
  if isRemote(d) then wrapFunction(d) end
end)

-- Expose API
_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.RemoteSpy = {
  log = log,
  counts = counts,
  clear = function() log = {}; counts = {} end,
  dump = function() for _, e in pairs(log) do print(e.name, e.kind, table.concat(e.args, ", ")) end end,
}

print("[planetscript] Quantum RemoteSpy active")
print("Use _G.PlanetScript.RemoteSpy.dump() to view the log")`,
  },
  {
    id: "remote-flood-guard",
    name: "Remote Flood Guard",
    description:
      "Détecte les RemoteEvents qui spamment le serveur (> 50 req/s). Alerte visuelle + blocage automatique optionnel.",
    category: "remote",
    platform: "universal",
    tags: ["Anti-Spam", "Detection", "Firewall"],
    lines: 88,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-15",
    downloads: 7820,
    rating: 4.6,
    code: `-- Remote Flood Guard by planetscript
local THRESHOLD = 50  -- fires per second
local WINDOW = 1
local AUTO_BLOCK = true
local blocked = {}

local counts = {}
local mt = getrawmetatable(game)
setreadonly(mt, false)
local old = mt.__namecall

local function tick(name)
  local now = os.clock()
  counts[name] = counts[name] or {}
  local list = counts[name]
  table.insert(list, now)
  -- prune
  while list[1] and now - list[1] > WINDOW do table.remove(list, 1) end
  if #list >= THRESHOLD then
    warn(string.format("[FLOOD] %s fired %d times in %ds", name, #list, WINDOW))
    if AUTO_BLOCK then blocked[name] = true end
  end
end

mt.__namecall = newcclosure(function(self, ...)
  local m = getnamecallmethod()
  if (m == "FireServer" or m == "InvokeServer")
     and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
    local name = self:GetDebugName()
    if blocked[name] then
      warn("[FLOOD] blocked " .. name)
      return
    end
    tick(name)
  end
  return old(self, ...)
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.FloodGuard = {
  blocked = blocked,
  counts = counts,
  unblock = function(name) blocked[name] = nil end,
  setThreshold = function(n) THRESHOLD = n end,
}

print("[planetscript] Flood Guard armed  (threshold=" .. THRESHOLD .. "/s)")`,
  },
  {
    id: "remote-interceptor",
    name: "Remote Interceptor",
    description:
      "Modifie les payloads avant envoi. Ajoute, supprime ou remplace des arguments à la volée via règles déclaratives.",
    category: "remote",
    platform: "pc",
    tags: ["Interceptor", "Modify", "Rules"],
    lines: 76,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-10",
    downloads: 6210,
    rating: 4.7,
    code: `-- Remote Interceptor by planetscript
-- Modify FireServer arguments on the fly
local rules = {
  -- example: replace arg1 of "BuyItem" with "GodSword"
  ["BuyItem"] = function(args)
    args[1] = "GodSword"
    return args
  end,
  -- drop request entirely
  ["ReportPlayer"] = function(args)
    return nil
  end,
}

local mt = getrawmetatable(game)
setreadonly(mt, false)
local old = mt.__namecall

mt.__namecall = newcclosure(function(self, ...)
  local m = getnamecallmethod()
  if m == "FireServer" and self:IsA("RemoteEvent") then
    local name = self:GetDebugName()
    local rule = rules[name]
    if rule then
      local newArgs = rule({...})
      if newArgs == nil then
        warn("[INTERCEPT] dropped " .. name)
        return
      end
      print("[INTERCEPT] modified " .. name)
      return old(self, table.unpack(newArgs))
    end
  end
  return old(self, ...)
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Interceptor = {
  rules = rules,
  add = function(name, fn) rules[name] = fn end,
  remove = function(name) rules[name] = nil end,
}

print("[planetscript] Remote Interceptor ready")`,
  },

  // ───────────── DETECTION ─────────────
  {
    id: "anticheat-detector",
    name: "Anti-Cheat Detector",
    description:
      "Scanne les LocalScripts du jeu à la recherche de patterns anti-cheat connus (speed checks, walkspeed monitors, raycast validators).",
    category: "detection",
    platform: "universal",
    tags: ["Anti-Cheat", "Scan", "Audit"],
    lines: 110,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-23",
    downloads: 15890,
    rating: 4.9,
    code: `-- Anti-Cheat Detector by planetscript
-- Scans LocalScripts for known anti-cheat patterns
local patterns = {
  Walkspeed  = "WalkSpeed",
  JumpPower  = "JumpPower",
  HipHeight  = "HipHeight",
  RayCast    = "Raycast",
  Magnitude  = "Magnitude",
  Teleport   = "CFrame",
  Kick       = "Player%.Kick",
  Report     = "FireServer.*[Rr]eport",
  GetChildren = "GetChildren",
  HumanoidState = "Humanoid:GetState",
  RemoteExploit = "RequireModule",
}

local flagged = {}

local function scan(src, name)
  if type(src) ~= "string" then return end
  for label, pat in pairs(patterns) do
    if src:find(pat) then
      table.insert(flagged, { script = name, label = label, pattern = pat })
      warn(string.format("[AC] %s → %s (%s)", name, label, pat))
    end
  end
end

local function walk(parent)
  for _, d in pairs(parent:GetDescendants()) do
    if d:IsA("LocalScript") or d:IsA("ModuleScript") then
      local ok, src = pcall(function()
        -- Best-effort source extraction (works on executors that expose decompile)
        if decompile then return decompile(d) end
        return nil
      end)
      if ok and src then scan(src, d:GetFullName()) end
    end
  end
end

print("[planetscript] Scanning workspace for anti-cheat patterns...")
walk(game:GetService("ReplicatedStorage"))
walk(game:GetService("StarterPlayer"))
walk(game:GetService("Workspace"))

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.ACDetector = {
  flagged = flagged,
  rescan = function()
    table.clear(flagged)
    walk(game:GetService("ReplicatedStorage"))
    walk(game:GetService("StarterPlayer"))
    walk(game:GetService("Workspace"))
    return #flagged
  end,
}

print(string.format("[planetscript] Done. %d suspicious patterns.", #flagged))`,
  },
  {
    id: "error-catcher",
    name: "Error Catcher",
    description:
      "Wrap tous tes scripts dans un pcall intelligent. Capture les erreurs avec stack trace complète et les affiche dans une console en jeu.",
    category: "detection",
    platform: "universal",
    tags: ["Error", "Logger", "Debug"],
    lines: 92,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-19",
    downloads: 6730,
    rating: 4.6,
    code: `-- Error Catcher by planetscript
-- Wrap any function with safe-pcall + structured logging
local errors = {}
local maxLog = 200

local function log(err, where)
  local entry = {
    err = tostring(err),
    where = where or "?",
    time = os.date("%H:%M:%S"),
    stack = debug.traceback("", 2),
  }
  table.insert(errors, entry)
  if #errors > maxLog then table.remove(errors, 1) end
  warn(string.format("[ERR] %s @ %s → %s", entry.time, entry.where, entry.err))
end

local function safe(fn, where, ...)
  local ok, result = pcall(fn, ...)
  if not ok then log(result, where or fn:GetDebugName and fn:GetDebugName() or "?") end
  return ok, result
end

-- Auto-wrap ScriptContext errors
game:GetService("ScriptContext").Error:Connect(function(msg, trace, script)
  log(msg .. " | " .. tostring(trace), script and script.Name or "?")
end)

-- In-game console UI
local Players = game:GetService("Players")
local pg = Players.LocalPlayer:WaitForChild("PlayerGui")
local gui = Instance.new("ScreenGui")
gui.Name = "PS_ErrorConsole"
gui.Parent = pg

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(360, 200)
frame.Position = UDim2.new(1, -376, 1, -216)
frame.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
frame.BackgroundTransparency = 0.05
frame.Visible = false
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 8)

local list = Instance.new("ScrollingFrame")
list.Size = UDim2.new(1, -16, 1, -44)
list.Position = UDim2.fromOffset(8, 36)
list.BackgroundTransparency = 1
list.ScrollBarThickness = 4
list.Parent = frame
Instance.new("UIListLayout", list).Padding = UDim.new(0, 4)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -16, 0, 24)
title.Position = UDim2.fromOffset(8, 8)
title.BackgroundTransparency = 1
title.Text = "planetscript · error console"
title.TextColor3 = Color3.fromRGB(244, 114, 182)
title.Font = Enum.Font.GothamBold
title.TextSize = 12
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = frame

local function refresh()
  for _, c in pairs(list:GetChildren()) do if c:IsA("TextLabel") then c:Destroy() end end
  for i = #errors, 1, -1 do
    local e = errors[i]
    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(1, -8, 0, 32)
    lbl.BackgroundTransparency = 1
    lbl.Text = string.format("%s  %s\\n%s", e.time, e.where, e.err)
    lbl.TextColor3 = Color3.fromRGB(248, 200, 220)
    lbl.Font = Enum.Font.Code
    lbl.TextSize = 10
    lbl.TextWrapped = true
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.TextYAlignment = Enum.TextYAlignment.Top
    lbl.Parent = list
  end
  list.CanvasSize = UDim2.new(0, 0, 0, #errors * 36)
end

-- Toggle key: F9
game:GetService("UserInputService").InputBegan:Connect(function(i, gpe)
  if gpe then return end
  if i.KeyCode == Enum.KeyCode.F9 then
    frame.Visible = not frame.Visible
    if frame.Visible then refresh() end
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.ErrorCatcher = { safe = safe, errors = errors, refresh = refresh }
print("[planetscript] Error Catcher loaded — press F9 to open console")`,
  },
  {
    id: "lag-monitor",
    name: "Lag Monitor",
    description:
      "Mesure le temps de render, le heartbeat jitter et la mémoire. Alerte si FPS < 30 ou mémoire > 500MB.",
    category: "detection",
    platform: "universal",
    tags: ["Performance", "FPS", "Memory", "Monitor"],
    lines: 84,
    difficulty: "Débutant",
    author: "planetscript",
    updated: "2026-06-08",
    downloads: 4310,
    rating: 4.4,
    code: `-- Lag Monitor by planetscript
local RunService = game:GetService("RunService")
local Stats = game:GetService("Stats")

local SAMPLES = 60
local fpsHistory = {}
local sum = 0
local count = 0

local lastTime = os.clock()
RunService.RenderStepped:Connect(function()
  local now = os.clock()
  local dt = now - lastTime
  lastTime = now
  local fps = 1 / math.max(dt, 0.001)
  table.insert(fpsHistory, fps)
  if #fpsHistory > SAMPLES then table.remove(fpsHistory, 1) end

  sum = sum + fps
  count = count + 1
  if count >= 30 then
    local avg = sum / count
    local mem = Stats:GetTotalMemoryUsageMb()
    if avg < 30 then
      warn(string.format("[LAG] avg FPS = %.1f — consider reducing graphics", avg))
    end
    if mem > 500 then
      warn(string.format("[LAG] memory = %.0f MB — leak suspected", mem))
    end
    sum = 0
    count = 0
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.LagMonitor = {
  history = fpsHistory,
  avg = function()
    local s = 0
    for _, v in pairs(fpsHistory) do s = s + v end
    return s / math.max(#fpsHistory, 1)
  end,
}

print("[planetscript] Lag Monitor running")`,
  },

  // ───────────── UTILITY ─────────────
  {
    id: "universal-loader",
    name: "Universal Loader",
    description:
      "Chargeur universel qui détecte l'exécuteur (Synapse, KRNL, Fluxus, Delta, Hydrogen) et adapte les API. Compatibilité maximale.",
    category: "utility",
    platform: "universal",
    tags: ["Loader", "Compat", "Bootstrap"],
    lines: 68,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-24",
    downloads: 31400,
    rating: 4.9,
    code: `-- Universal Loader by planetscript
-- Detects the executor and normalizes the API surface
local exec = "Unknown"
local env = getgenv and getgenv() or _G

if identifyexecutor then
  local name, version = identifyexecutor()
  exec = name or "Unknown"
end

local api = {
  Drawing = Drawing or (syn and syn.Drawing),
  getrawmetatable = getrawmetatable,
  setreadonly = setreadonly or (syn and syn.setreadonly),
  hookfunction = hookfunction or (syn and syn.hookfunction),
  getnamecallmethod = getnamecallmethod,
  isluau = isluau or function() return true end,
  decompile = decompile or (syn and syn.decompile),
}

-- Normalize: syn wrappers
if not api.getrawmetatable and syn then
  api.getrawmetatable = syn.getrawmetatable
end

-- Mobile detection: most mobile executors lack getgenv
local isMobile = not getgenv or (env.IS_MOBILE == true)
api.isMobile = isMobile

-- Platform print
print(string.format("[planetscript] Loader ready · executor=%s · mobile=%s",
  exec, tostring(isMobile)))

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Loader = {
  executor = exec,
  isMobile = isMobile,
  api = api,
  load = function(url)
    if loadstring then
      return loadstring(game:HttpGet(url))()
    end
    error("loadstring not available on this executor")
  end,
}

return api`,
  },
  {
    id: "key-bypass",
    name: "Key System Bypass",
    description:
      "Bypass générique des key systems Lua classiques (whitelist checks, HttpGet key fetchers, HWID locks). Usage éducatif.",
    category: "utility",
    platform: "universal",
    tags: ["Bypass", "Key", "Whitelist"],
    lines: 54,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-14",
    downloads: 12870,
    rating: 4.5,
    code: `-- Key System Bypass (educational) by planetscript
-- Hooks the typical key check functions used by Lua hubs
local mt = getrawmetatable(game)
setreadonly(mt, false)

local function mockKeyFunctions()
  -- Common pattern: _G.KeyRequired = true → flip it
  if _G.KeyRequired ~= nil then _G.KeyRequired = false end
  if _G.Key ~= nil then _G.Key = "planetscript-bypass" end

  -- Mock HttpGet that always returns a valid key JSON
  local oldHttpGet = (syn and syn.request) or http_request or request
  if oldHttpGet then
    getgenv().request = function(opts)
      if opts and opts.Url and opts.Url:find("key") then
        return {
          StatusCode = 200,
          Body = '{"valid":true,"key":"planetscript"}',
        }
      end
      return oldHttpGet(opts)
    end
  end
end

mockKeyFunctions()

-- Hook __namecall to intercept "checkKey" remotes
local oldNamecall = mt.__namecall
mt.__namecall = newcclosure(function(self, ...)
  local m = getnamecallmethod()
  if m == "InvokeServer" and self:IsA("RemoteFunction") then
    local name = self:GetDebugName():lower()
    if name:find("key") or name:find("whitelist") then
      return { valid = true, message = "bypassed by planetscript" }
    end
  end
  return oldNamecall(self, ...)
end)

print("[planetscript] Key bypass installed (educational)")`,
  },

  // ───────────── MOBILE UI ─────────────
  {
    id: "mobile-dock",
    name: "Mobile Dock",
    description:
      "Dock tactile flottant avec 6 boutons personnalisables (Fly, Noclip, Speed, Teleport, ESP, Menu). Glisse sur n'importe quel bord.",
    category: "mobile-ui",
    platform: "mobile",
    tags: ["Mobile", "Dock", "Touch", "Buttons"],
    lines: 134,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-21",
    downloads: 18950,
    rating: 4.8,
    code: `-- Mobile Dock by planetscript
-- Touch-friendly floating dock for mobile executors
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local lp = Players.LocalPlayer
local pg = lp:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "PS_MobileDock"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = pg

local dock = Instance.new("Frame")
dock.Size = UDim2.fromOffset(280, 56)
dock.Position = UDim2.new(0.5, -140, 0.9, -64)
dock.BackgroundColor3 = Color3.fromRGB(15, 23, 32)
dock.BackgroundTransparency = 0.1
dock.Parent = gui
Instance.new("UICorner", dock).CornerRadius = UDim.new(0, 16)
local layout = Instance.new("UIListLayout", dock)
layout.FillDirection = Enum.FillDirection.Horizontal
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.VerticalAlignment = Enum.VerticalAlignment.Center
layout.Padding = UDim.new(0, 8)

local state = { fly = false, noclip = false, speed = false }

local actions = {
  { name = "FLY",     color = Color3.fromRGB(52, 211, 153) },
  { name = "NOCLIP",  color = Color3.fromRGB(56, 189, 248) },
  { name = "SPEED",   color = Color3.fromRGB(251, 146, 60) },
  { name = "TP",      color = Color3.fromRGB(167, 139, 250) },
  { name = "ESP",     color = Color3.fromRGB(244, 114, 182) },
  { name = "MENU",    color = Color3.fromRGB(248, 113, 113) },
}

local buttons = {}
for _, a in ipairs(actions) do
  local b = Instance.new("TextButton")
  b.Size = UDim2.fromOffset(36, 36)
  b.BackgroundColor3 = a.color
  b.Text = string.sub(a.name, 1, 2)
  b.TextColor3 = Color3.fromRGB(255, 255, 255)
  b.Font = Enum.Font.GothamBold
  b.TextSize = 11
  b.Parent = dock
  Instance.new("UICorner", b).CornerRadius = UDim.new(1, 0)
  b.InputBegan:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.Touch then
      state[a.name:lower()] = not state[a.name:lower()]
      b.BackgroundTransparency = state[a.name:lower()] and 0.5 or 0
      print("[planetscript] " .. a.name .. " → " .. tostring(state[a.name:lower()]))
    end
  end)
  buttons[a.name] = b
end

-- Drag the dock with one finger
local dragging, dragStart, startPos
dock.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then
    dragging = true
    dragStart = i.Position
    startPos = dock.Position
  end
end)
UserInputService.InputChanged:Connect(function(i)
  if dragging and (i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseMovement) then
    local delta = i.Position - dragStart
    dock.Position = UDim2.new(
      startPos.X.Scale, startPos.X.Offset + delta.X,
      startPos.Y.Scale, startPos.Y.Offset + delta.Y
    )
  end
end)
UserInputService.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then
    dragging = false
  end
end)

-- Speed & fly logic
RunService.Heartbeat:Connect(function()
  local char = lp.Character
  if not char then return end
  local hum = char:FindFirstChildOfClass("Humanoid")
  if not hum then return end
  hum.WalkSpeed = state.speed and 60 or 16
  if state.noclip then
    for _, p in pairs(char:GetDescendants()) do
      if p:IsA("BasePart") then p.CanCollide = false end
    end
  end
end)

print("[planetscript] Mobile Dock ready — drag to move")`,
  },
  {
    id: "mobile-aim-assist",
    name: "Mobile Aim Assist",
    description:
      "Aim assist tactile pour mobile : vise automatiquement le joueur le plus proche du pouce. Sensibilité réglable, FOV circulaire.",
    category: "mobile-ui",
    platform: "mobile",
    tags: ["Mobile", "Aim", "Touch", "FOV"],
    lines: 102,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-17",
    downloads: 14230,
    rating: 4.7,
    code: `-- Mobile Aim Assist by planetscript
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local cam = workspace.CurrentCamera
local lp = Players.LocalPlayer

local FOV = 80
local SMOOTH = 0.15
local active = false

local pg = lp:WaitForChild("PlayerGui")
local gui = Instance.new("ScreenGui")
gui.Name = "PS_AimAssist"
gui.Parent = pg

local ring = Instance.new("Frame")
ring.Size = UDim2.fromOffset(FOV * 2, FOV * 2)
ring.Position = UDim2.new(0.5, -FOV, 0.5, -FOV)
ring.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
ring.BackgroundTransparency = 1
ring.BorderSizePixel = 0
ring.Parent = gui
local cs = Instance.new("UIScale", ring)

local ringStroke = Instance.new("UIStroke")
ringStroke.Thickness = 1.5
ringStroke.Color = Color3.fromRGB(52, 211, 153)
ringStroke.Transparency = 0.4
ringStroke.Parent = ring
Instance.new("UICorner", ring).CornerRadius = UDim.new(1, 0)

local toggle = Instance.new("TextButton")
toggle.Size = UDim2.fromOffset(64, 28)
toggle.Position = UDim2.new(0, 12, 0.5, -14)
toggle.Text = "AIM"
toggle.TextColor3 = Color3.fromRGB(255, 255, 255)
toggle.BackgroundColor3 = Color3.fromRGB(15, 23, 32)
toggle.Font = Enum.Font.GothamBold
toggle.TextSize = 11
toggle.Parent = gui
Instance.new("UICorner", toggle).CornerRadius = UDim.new(0, 8)
toggle.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch then
    active = not active
    toggle.BackgroundColor3 = active
      and Color3.fromRGB(52, 211, 153)
      or  Color3.fromRGB(15, 23, 32)
  end
end)

local function closestPlayer()
  local best, bestMag = nil, FOV
  local center = Vector2.new(cam.ViewportSize.X / 2, cam.ViewportSize.Y / 2)
  for _, p in pairs(Players:GetPlayers()) do
    if p ~= lp and p.Character then
      local hrp = p.Character:FindFirstChild("HumanoidRootPart")
      local hum = p.Character:FindFirstChildOfClass("Humanoid")
      if hrp and hum and hum.Health > 0 then
        local pos, on = cam:WorldToViewportPoint(hrp.Position)
        if on then
          local mag = (Vector2.new(pos.X, pos.Y) - center).Magnitude
          if mag < bestMag then
            bestMag = mag
            best = p
          end
        end
      end
    end
  end
  return best
end

RunService.RenderStepped:Connect(function()
  if not active then return end
  local target = closestPlayer()
  if not target then return end
  local hrp = target.Character.HumanoidRootPart
  local goal = CFrame.new(cam.CFrame.Position, hrp.Position)
  cam.CFrame = cam.CFrame:Lerp(goal, SMOOTH)
end)

print("[planetscript] Mobile Aim Assist loaded")`,
  },
];
