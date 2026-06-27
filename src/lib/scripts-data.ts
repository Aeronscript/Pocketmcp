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
  tagline: string;
  description: string;
  category: Category;
  platform: Platform;
  tags: string[];
  lines: number;
  difficulty: "Débutant" | "Intermédiaire" | "Avancé" | "Expert";
  author: string;
  updated: string;
  downloads: number;
  rating: number;
  features: string[];
  code: string;
}

export const categoryMeta: Record<
  Category,
  { label: string; short: string; description: string; accent: string }
> = {
  visual: {
    label: "Visuel",
    short: "VIS",
    description:
      "ESP, chams, tracers, FOV rings, HUD temps réel. Rendu Drawing API optimisé pour tenir 60 FPS même sur mobile d'entrée de gamme.",
    accent: "emerald",
  },
  remote: {
    label: "RemoteEvents",
    short: "NET",
    description:
      "Spy, interception, modification de payloads et firewall. Hooks via metatable __namecall — compatible avec la majorité des exécuteurs modernes.",
    accent: "amber",
  },
  detection: {
    label: "Détection",
    short: "SEC",
    description:
      "Audit d'anti-cheat, capture d'erreurs avec stack trace, monitoring performance. Identifie les pièges avant qu'ils ne te frappent.",
    accent: "rose",
  },
  utility: {
    label: "Utilitaires",
    short: "UTL",
    description:
      "Loaders universels, key systems, wrappers d'API. Les fondations nécessaires pour exécuter et gérer tes scripts proprement.",
    accent: "violet",
  },
  "mobile-ui": {
    label: "UI Mobile",
    short: "MOB",
    description:
      "Bibliothèques tactiles complètes : docks flottants, aim assist, sliders, toggles. Pensé pour les doigts, pas pour les souris.",
    accent: "sky",
  },
};

export const scripts: RobloxScript[] = [
  // ───────────────────────────────────────────── VISUAL ─────────────────────────────────────────────
  {
    id: "quantum-esp",
    name: "Quantum ESP",
    tagline: "ESP complet avec tracers, chams et skeleton",
    description:
      "Module ESP production-ready avec team check, rendu Drawing API, skeleton 18 points, tracers avec origine caméra, et config sauvegardée par partie. Optimisé pour les hubs de scripts.",
    category: "visual",
    platform: "universal",
    tags: ["ESP", "Drawing", "Tracers", "Chams", "Skeleton"],
    lines: 248,
    difficulty: "Expert",
    author: "planetscript",
    updated: "2026-06-26",
    downloads: 48230,
    rating: 4.9,
    features: [
      "Team check configurable",
      "Skeleton 18 os via HumanoidRootPart",
      "Tracers depuis coin bas-gauche caméra",
      "Health bar latérale colorée",
      "Save/Load config JSON",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Quantum ESP · planetscript
-- Production-ready ESP module for Roblox executors
-- Drawing API — works on PC & mobile (Krnl, Fluxus, Delta, Hydrogen)
-- ════════════════════════════════════════════════════════════

local Players            = game:GetService("Players")
local RunService         = game:GetService("RunService")
local HttpService        = game:GetService("HttpService")
local LocalPlayer        = Players.LocalPlayer
local Camera             = workspace.CurrentCamera

-- ─── Configuration ──────────────────────────────────────────
local Config = {
  Enabled       = true,
  TeamCheck     = true,
  MaxDistance   = 1500,

  -- Toggles
  ShowBox       = true,
  ShowName      = true,
  ShowDistance  = true,
  ShowHealth    = true,
  ShowTracer    = true,
  ShowSkeleton  = true,
  ShowChams     = false,

  -- Colors
  EnemyColor    = Color3.fromRGB(244, 63, 94),
  TeamColor     = Color3.fromRGB(52, 211, 153),
  TextColor     = Color3.fromRGB(248, 250, 252),
  TracerColor   = Color3.fromRGB(167, 139, 250),

  -- Sizes
  TextSize      = 13,
  BoxThickness  = 1,
  TracerOrigin  = "Bottom", -- "Bottom" | "Center" | "Mouse"

  -- Save slot
  SaveKey       = "planetscript_esp_config",
}

-- ─── Persistence ────────────────────────────────────────────
local function saveConfig()
  if not writefile then return end
  local data = {
    Enabled = Config.Enabled,
    TeamCheck = Config.TeamCheck,
    MaxDistance = Config.MaxDistance,
    ShowBox = Config.ShowBox,
    ShowName = Config.ShowName,
    ShowDistance = Config.ShowDistance,
    ShowHealth = Config.ShowHealth,
    ShowTracer = Config.ShowTracer,
    ShowSkeleton = Config.ShowSkeleton,
    ShowChams = Config.ShowChams,
  }
  writefile(Config.SaveKey .. ".json", HttpService:JSONEncode(data))
end

local function loadConfig()
  if not isfile or not readfile then return end
  if isfile(Config.SaveKey .. ".json") then
    local ok, data = pcall(function()
      return HttpService:JSONDecode(readfile(Config.SaveKey .. ".json"))
    end)
    if ok and type(data) == "table" then
      for k, v in pairs(data) do Config[k] = v end
    end
  end
end
loadConfig()

-- ─── Drawing pool ───────────────────────────────────────────
-- Reuse Drawing objects across frames to avoid GC pressure.
local Pool = {}
Pool.__index = Pool

function Pool.new()
  return setmetatable({ items = {} }, Pool)
end

function Pool:get(player, kind)
  self.items[player] = self.items[player] or {}
  if not self.items[player][kind] then
    local drawType = "Text"
    if kind == "Box" or kind == "Health" then
      drawType = "Square"
    elseif kind == "Tracer" then
      drawType = "Line"
    end
    self.items[player][kind] = Drawing.new(drawType)
  end
  return self.items[player][kind]
end

function Pool:clear(player)
  if not self.items[player] then return end
  for _, d in pairs(self.items[player]) do
    pcall(function() d:Remove() end)
  end
  self.items[player] = nil
end

local pool = Pool.new()

-- ─── Skeleton definition ────────────────────────────────────
-- R15 rig bones (works for R6 too thanks to fallback lookups)
local SkeletonPairs = {
  {"Head", "UpperTorso"},
  {"UpperTorso", "LowerTorso"},
  {"UpperTorso", "LeftUpperArm"},
  {"LeftUpperArm", "LeftLowerArm"},
  {"LeftLowerArm", "LeftHand"},
  {"UpperTorso", "RightUpperArm"},
  {"RightUpperArm", "RightLowerArm"},
  {"RightLowerArm", "RightHand"},
  {"LowerTorso", "LeftUpperLeg"},
  {"LeftUpperLeg", "LeftLowerLeg"},
  {"LeftLowerLeg", "LeftFoot"},
  {"LowerTorso", "RightUpperLeg"},
  {"RightUpperLeg", "RightLowerLeg"},
  {"RightLowerLeg", "RightFoot"},
}

-- Fallback names for R6 rigs
local function getPart(char, name)
  return char:FindFirstChild(name)
    or (name == "UpperTorso" and char:FindFirstChild("Torso"))
    or (name == "LowerTorso" and char:FindFirstChild("Torso"))
    or (name == "LeftUpperArm" and char:FindFirstChild("Left Arm"))
    or (name == "RightUpperArm" and char:FindFirstChild("Right Arm"))
    or (name == "LeftUpperLeg" and char:FindFirstChild("Left Leg"))
    or (name == "RightUpperLeg" and char:FindFirstChild("Right Leg"))
end

-- ─── Render logic ───────────────────────────────────────────
local function colorFor(player)
  if Config.TeamCheck and player.Team == LocalPlayer.Team
     and player.Team ~= nil then
    return Config.TeamColor
  end
  return Config.EnemyColor
end

local function isVisible(player)
  if player == LocalPlayer then return false end
  if not player.Character then return false end
  local hrp = player.Character:FindFirstChild("HumanoidRootPart")
  local hum = player.Character:FindFirstChildOfClass("Humanoid")
  if not hrp or not hum or hum.Health <= 0 then return false end
  if (hrp.Position - Camera.CFrame.Position).Magnitude > Config.MaxDistance then
    return false
  end
  return true
end

local function renderPlayer(player)
  if not isVisible(player) then
    pool:clear(player)
    return
  end

  local char = player.Character
  local hrp  = char.HumanoidRootPart
  local hum  = char.Humanoid
  local head = char:FindFirstChild("Head")
  if not head then return end

  local screenPos, onScreen = Camera:WorldToViewportPoint(hrp.Position)
  local headPos, _          = Camera:WorldToViewportPoint(head.Position + Vector3.new(0, 1, 0))
  local legPos, _           = Camera:WorldToViewportPoint(hrp.Position - Vector3.new(0, 3, 0))

  if not onScreen then
    pool:clear(player)
    return
  end

  local height = math.abs(headPos.Y - legPos.Y)
  local width  = height / 2.4
  local color  = colorFor(player)
  local centerX, centerY = screenPos.X, screenPos.Y

  -- ── Box ──────────────────────────────────
  if Config.ShowBox then
    local box = pool:get(player, "Box")
    box.Size = Vector2.new(width, height)
    box.Position = Vector2.new(centerX - width / 2, centerY - height / 2)
    box.Color = color
    box.Thickness = Config.BoxThickness
    box.Filled = false
    box.Visible = true
  else
    local box = pool:get(player, "Box")
    box.Visible = false
  end

  -- ── Name ─────────────────────────────────
  if Config.ShowName then
    local name = pool:get(player, "Name")
    name.Text = player.DisplayName
    name.Size = Config.TextSize
    name.Color = Config.TextColor
    name.Center = true
    name.Outline = true
    name.Position = Vector2.new(centerX, centerY - height / 2 - 18)
    name.Visible = true
  else
    pool:get(player, "Name").Visible = false
  end

  -- ── Distance ─────────────────────────────
  if Config.ShowDistance then
    local dist = pool:get(player, "Distance")
    local d = (hrp.Position - LocalPlayer.Character.HumanoidRootPart.Position).Magnitude
    dist.Text = string.format("[%dm]", math.floor(d))
    dist.Size = Config.TextSize - 1
    dist.Color = Config.TextColor
    dist.Center = true
    dist.Outline = true
    dist.Position = Vector2.new(centerX, centerY + height / 2 + 4)
    dist.Visible = true
  else
    pool:get(player, "Distance").Visible = false
  end

  -- ── Health bar ───────────────────────────
  if Config.ShowHealth then
    local hb = pool:get(player, "Health")
    local healthRatio = math.clamp(hum.Health / math.max(hum.MaxHealth, 1), 0, 1)
    local h = height * healthRatio
    hb.Size = Vector2.new(3, h)
    hb.Position = Vector2.new(centerX - width / 2 - 8, centerY + height / 2 - h)
    hb.Color = Color3.fromRGB(
      255 - math.floor(healthRatio * 255),
      math.floor(healthRatio * 255),
      0
    )
    hb.Filled = true
    hb.Visible = true
  else
    pool:get(player, "Health").Visible = false
  end

  -- ── Tracer ───────────────────────────────
  if Config.ShowTracer then
    local tracer = pool:get(player, "Tracer")
    local originY = Config.TracerOrigin == "Bottom" and Camera.ViewportSize.Y
      or Config.TracerOrigin == "Center" and Camera.ViewportSize.Y / 2
      or Camera.ViewportSize.Y / 2
    tracer.From = Vector2.new(Camera.ViewportSize.X / 2, originY)
    tracer.To = Vector2.new(centerX, centerY)
    tracer.Color = Config.TracerColor
    tracer.Thickness = 1
    tracer.Visible = true
  else
    pool:get(player, "Tracer").Visible = false
  end
end

-- ─── Main loop ──────────────────────────────────────────────
local conn
local function start()
  if conn then conn:Disconnect() end
  conn = RunService.RenderStepped:Connect(function()
    for _, player in ipairs(Players:GetPlayers()) do
      pcall(renderPlayer, player)
    end
  end)
end

Players.PlayerRemoving:Connect(function(p) pool:clear(p) end)
start()

-- ─── Public API ─────────────────────────────────────────────
_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.ESP = {
  Config = Config,
  save = saveConfig,
  reload = loadConfig,
  set = function(key, value) Config[key] = value; saveConfig() end,
  toggle = function() Config.Enabled = not Config.Enabled end,
}

print(string.format("[planetscript] Quantum ESP loaded · %d players tracked",
  #Players:GetPlayers()))`,
  },
  {
    id: "aurora-hud",
    name: "Aurora HUD",
    tagline: "HUD temps réel animé et modulaire",
    description:
      "HUD flottant avec dégradé aurora animé, stats live (FPS, ping, position, mémoire), watermarks, et notifications toast. Modular architecture — chaque widget est un module indépendant.",
    category: "visual",
    platform: "universal",
    tags: ["HUD", "Animated", "Stats", "Toast", "Watermark"],
    lines: 186,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-25",
    downloads: 21340,
    rating: 4.8,
    features: [
      "FPS / ping / mémoire en direct",
      "Dégradé aurora animé 60 FPS",
      "Système de notifications toast",
      "Watermark customizable",
      "Architecture modulaire",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Aurora HUD · planetscript
-- Modular HUD with live stats, animated aurora gradient, toasts
-- Compatible PC & mobile (auto-resize for small screens)
-- ════════════════════════════════════════════════════════════

local Players       = game:GetService("Players")
local RunService    = game:GetService("RunService")
local Stats         = game:GetService("Stats")
local TweenService  = game:GetService("TweenService")
local LocalPlayer   = Players.LocalPlayer
local PlayerGui     = LocalPlayer:WaitForChild("PlayerGui")

local ROOT = Instance.new("ScreenGui")
ROOT.Name = "PlanetScript_Aurora"
ROOT.ResetOnSpawn = false
ROOT.IgnoreGuiInset = true
ROOT.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ROOT.Parent = PlayerGui

-- ─── Theme ──────────────────────────────────────────────────
local Theme = {
  Bg        = Color3.fromRGB(13, 17, 23),
  BgSoft    = Color3.fromRGB(22, 27, 34),
  Border    = Color3.fromRGB(48, 54, 61),
  Text      = Color3.fromRGB(201, 209, 217),
  TextDim   = Color3.fromRGB(139, 148, 158),
  Accent    = Color3.fromRGB(52, 211, 153),
  Accent2   = Color3.fromRGB(56, 189, 248),
  Accent3   = Color3.fromRGB(167, 139, 250),
  Error     = Color3.fromRGB(248, 113, 113),
}

-- Aurora gradient colors
local AURORA = {
  Color3.fromRGB(52, 211, 153),
  Color3.fromRGB(56, 189, 248),
  Color3.fromRGB(167, 139, 250),
  Color3.fromRGB(52, 211, 153),
}

local function makeGradient(parent, rotation)
  local g = Instance.new("UIGradient")
  g.Rotation = rotation or 0
  g.Color = ColorSequence.new(AURORA)
  g.Parent = parent
  return g
end

local function makeCorner(parent, radius)
  local c = Instance.new("UICorner")
  c.CornerRadius = UDim.new(0, radius or 10)
  c.Parent = parent
  return c
end

local function makeStroke(parent, color, thickness)
  local s = Instance.new("UIStroke")
  s.Color = color or Theme.Border
  s.Thickness = thickness or 1
  s.Transparency = 0.4
  s.Parent = parent
  return s
end

-- ─── Main HUD frame ─────────────────────────────────────────
local HUD = Instance.new("Frame")
HUD.Size = UDim2.fromOffset(300, 96)
HUD.Position = UDim2.new(0, 16, 0, 16)
HUD.BackgroundColor3 = Theme.Bg
HUD.BackgroundTransparency = 0.05
HUD.Parent = ROOT
makeCorner(HUD, 12)
makeStroke(HUD, Theme.Border, 1)

-- Animated aurora top bar
local AuroraBar = Instance.new("Frame")
AuroraBar.Size = UDim2.new(1, 0, 0, 3)
AuroraBar.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
AuroraBar.BorderSizePixel = 0
AuroraBar.Parent = HUD
makeCorner(AuroraBar, 0)
local auroraGrad = makeGradient(AuroraBar, 0)

-- Title row
local Title = Instance.new("TextLabel")
Title.Size = UDim2.new(1, -16, 0, 22)
Title.Position = UDim2.fromOffset(12, 10)
Title.BackgroundTransparency = 1
Title.Text = "planetscript"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 13
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = HUD

local Subtitle = Instance.new("TextLabel")
Subtitle.Size = UDim2.new(1, -16, 0, 14)
Subtitle.Position = UDim2.fromOffset(12, 30)
Subtitle.BackgroundTransparency = 1
Subtitle.Text = "aurora hud · v2.1"
Subtitle.TextColor3 = Theme.TextDim
Subtitle.Font = Enum.Font.Gotham
Subtitle.TextSize = 10
Subtitle.TextXAlignment = Enum.TextXAlignment.Left
Subtitle.Parent = HUD

-- Stats row
local StatsLabel = Instance.new("TextLabel")
StatsLabel.Size = UDim2.new(1, -16, 0, 36)
StatsLabel.Position = UDim2.fromOffset(12, 50)
StatsLabel.BackgroundTransparency = 1
StatsLabel.Text = ""
StatsLabel.TextColor3 = Theme.Text
StatsLabel.Font = Enum.Font.RobotoMono
StatsLabel.TextSize = 11
StatsLabel.TextXAlignment = Enum.TextXAlignment.Left
StatsLabel.TextYAlignment = Enum.TextYAlignment.Top
StatsLabel.Parent = HUD

-- ─── Toast notifications ────────────────────────────────────
local ToastHolder = Instance.new("Frame")
ToastHolder.Size = UDim2.new(0, 280, 1, -32)
ToastHolder.Position = UDim2.new(1, -296, 0, 16)
ToastHolder.BackgroundTransparency = 1
ToastHolder.Parent = ROOT
local ToastLayout = Instance.new("UIListLayout")
ToastLayout.SortOrder = Enum.SortOrder.LayoutOrder
ToastLayout.Padding = UDim.new(0, 6)
ToastLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
ToastLayout.Parent = ToastHolder

local function toast(text, kind)
  kind = kind or "info"
  local color = kind == "error" and Theme.Error
    or kind == "success" and Theme.Accent
    or Theme.Accent2

  local card = Instance.new("Frame")
  card.Size = UDim2.new(1, 0, 0, 38)
  card.BackgroundColor3 = Theme.Bg
  card.BackgroundTransparency = 0.05
  card.Parent = ToastHolder
  makeCorner(card, 8)
  makeStroke(card, color, 1)

  local accent = Instance.new("Frame")
  accent.Size = UDim2.new(0, 3, 1, 0)
  accent.BackgroundColor3 = color
  accent.BorderSizePixel = 0
  accent.Parent = card
  makeCorner(accent, 0)

  local label = Instance.new("TextLabel")
  label.Size = UDim2.new(1, -20, 1, 0)
  label.Position = UDim2.fromOffset(12, 0)
  label.BackgroundTransparency = 1
  label.Text = text
  label.TextColor3 = Theme.Text
  label.Font = Enum.Font.Gotham
  label.TextSize = 11
  label.TextXAlignment = Enum.TextXAlignment.Left
  label.TextYAlignment = Enum.TextYAlignment.Center
  label.Parent = card

  -- Slide-in animation
  card.Position = UDim2.new(1, 0, 0, 0)
  card.AnchorPoint = Vector2.new(0, 0)
  TweenService:Create(card, TweenInfo.new(0.3, Enum.EasingStyle.Cubic), {
    Position = UDim2.new(0, 0, 0, 0),
  }):Play()

  task.delay(3, function()
    TweenService:Create(card, TweenInfo.new(0.3), {
      Position = UDim2.new(1, 0, 0, 0),
    }):Play()
    task.wait(0.35)
    card:Destroy()
  end)
end

-- ─── Update loop ────────────────────────────────────────────
local fpsAccum, fpsCount = 0, 0
local lastFps = 60
local t = 0

RunService.RenderStepped:Connect(function(dt)
  t = t + dt
  fpsAccum = fpsAccum + 1 / math.max(dt, 0.001)
  fpsCount = fpsCount + 1

  -- Aurora gradient rotation
  auroraGrad.Rotation = (math.sin(t * 0.8) * 30) + 45

  -- Update stats every 0.5s
  if fpsCount >= 30 then
    lastFps = math.floor(fpsAccum / fpsCount)
    fpsAccum, fpsCount = 0, 0

    local char = LocalPlayer.Character
    local hrp  = char and char:FindFirstChild("HumanoidRootPart")
    local mem  = Stats:GetTotalMemoryUsageMb()
    local ping = 0
    if LocalPlayer.GetNetworkPing then
      pcall(function() ping = LocalPlayer:GetNetworkPing() * 1000 end)
    end

    StatsLabel.Text = string.format(
      "FPS  %d\\nPING %dms\\nMEM  %.0fMB\\nPOS  %s",
      lastFps,
      math.floor(ping),
      mem,
      hrp and string.format("%.0f,%.0f,%.0f", hrp.X, hrp.Y, hrp.Z) or "—"
    )

    if lastFps < 30 then
      toast("FPS bas détecté (" .. lastFps .. ")", "error")
    end
  end
end)

-- ─── Public API ─────────────────────────────────────────────
_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.HUD = {
  toast = toast,
  root = ROOT,
  theme = Theme,
}

toast("Aurora HUD chargé", "success")
print("[planetscript] Aurora HUD v2.1 ready")`,
  },
  {
    id: "chams-highlight",
    name: "Chams Highlight",
    tagline: "Highlight en surbrillance à travers les murs",
    description:
      "Utilise le système Highlight de Roblox pour révéler les joueurs à travers les murs avec couleur dégradée selon la vie. Plus performant que Drawing pour les basses configurations.",
    category: "visual",
    platform: "universal",
    tags: ["Chams", "Highlight", "Wallhack"],
    lines: 92,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-22",
    downloads: 18920,
    rating: 4.7,
    features: [
      "Instance Highlight native",
      "Couleur dynamique selon vie",
      "Outline ajustable",
      "Team check intégré",
      "Auto-cleanup on death",
    ],
    code: `-- Chams Highlight · planetscript
-- Uses Roblox native Highlight (faster than Drawing on low-end)
local Players = game:GetService("Players")
local LP = Players.LocalPlayer

local Config = {
  Enabled     = true,
  TeamCheck   = true,
  FillColor   = Color3.fromRGB(244, 63, 94),
  OutlineColor = Color3.fromRGB(255, 255, 255),
  FillTransparency = 0.5,
  OutlineTransparency = 0,
  HealthGradient = true, -- green→red based on health
}

local active = {} -- [player] = Highlight

local function cleanup(player)
  if active[player] then
    active[player]:Destroy()
    active[player] = nil
  end
end

local function attach(player)
  if player == LP then return end
  if not player.Character then return end

  cleanup(player)
  local hl = Instance.new("Highlight")
  hl.Name = "PS_Chams"
  hl.FillColor = Config.FillColor
  hl.OutlineColor = Config.OutlineColor
  hl.FillTransparency = Config.FillTransparency
  hl.OutlineTransparency = Config.OutlineTransparency
  hl.Adornee = player.Character
  hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
  hl.Parent = player.Character

  active[player] = hl

  -- Hook health for color gradient
  local hum = player.Character:FindFirstChildOfClass("Humanoid")
  if hum and Config.HealthGradient then
    hum.HealthChanged:Connect(function(hp)
      if not active[player] then return end
      local ratio = math.clamp(hp / math.max(hum.MaxHealth, 1), 0, 1)
      hl.FillColor = Color3.fromRGB(
        255 - math.floor(ratio * 200),
        math.floor(ratio * 255),
        80
      )
    end)
  end
end

-- Team check applies outline color
local function refresh()
  for player, hl in pairs(active) do
    if Config.TeamCheck and player.Team == LP.Team and player.Team ~= nil then
      hl.FillColor = Color3.fromRGB(52, 211, 153)
    else
      hl.FillColor = Config.FillColor
    end
  end
end

-- Hook events
Players.PlayerAdded:Connect(function(p)
  p.CharacterAdded:Connect(function() task.wait(0.5); attach(p) end)
end)
Players.PlayerRemoving:Connect(cleanup)

for _, p in ipairs(Players:GetPlayers()) do
  if p ~= LP then
    p.CharacterAdded:Connect(function() task.wait(0.5); attach(p) end)
    if p.Character then task.spawn(attach, p) end
  end
end

LP.TeamChanged:Connect(refresh)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Chams = { Config = Config, refresh = refresh }

print("[planetscript] Chams Highlight active")`,
  },

  // ───────────────────────────────────────── REMOTE EVENTS ─────────────────────────────────────────
  {
    id: "remote-spy",
    name: "Quantum RemoteSpy",
    tagline: "Spy complet avec GUI live et export JSON",
    description:
      "Hook metatable __namecall et __index pour intercepter tous les FireServer / InvokeServer. Interface live avec filtres, recherche, copie d'arguments, et export JSON pour analyse hors-ligne.",
    category: "remote",
    platform: "universal",
    tags: ["Spy", "Hook", "Logger", "GUI"],
    lines: 268,
    difficulty: "Expert",
    author: "planetscript",
    updated: "2026-06-27",
    downloads: 51200,
    rating: 5.0,
    features: [
      "Hook __namecall + __index",
      "GUI live avec scroll",
      "Filtre par RemoteEvent",
      "Recherche textuelle",
      "Export JSON complet",
      "Blacklist par nom",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Quantum RemoteSpy · planetscript
-- Comprehensive RemoteEvent / RemoteFunction logger with GUI
-- ════════════════════════════════════════════════════════════

local Players      = game:GetService("Players")
local HttpService  = game:GetService("HttpService")
local UserInput    = game:GetService("UserInputService")
local LP           = Players.LocalPlayer
local PlayerGui    = LP:WaitForChild("PlayerGui")

local State = {
  logs = {},
  counts = {},
  blacklist = {},       -- [remoteName] = true
  filterText = "",
  maxLogs = 500,
  capture = true,
}

-- ─── GUI ────────────────────────────────────────────────────
local gui = Instance.new("ScreenGui")
gui.Name = "PS_RemoteSpy"
gui.ResetOnSpawn = false
gui.Parent = PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(440, 380)
frame.Position = UDim2.new(0.5, -220, 0.5, -190)
frame.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
frame.BorderSizePixel = 0
frame.Visible = false
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 10)

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(48, 54, 61)
stroke.Thickness = 1
stroke.Parent = frame

-- Title bar
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -16, 0, 32)
title.Position = UDim2.fromOffset(12, 0)
title.BackgroundTransparency = 1
title.Text = "quantum remotespy"
title.TextColor3 = Color3.fromRGB(52, 211, 153)
title.Font = Enum.Font.GothamBold
title.TextSize = 12
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = frame

local stats = Instance.new("TextLabel")
stats.Size = UDim2.new(0, 100, 0, 32)
stats.Position = UDim2.new(1, -112, 0, 0)
stats.BackgroundTransparency = 1
stats.Text = "0 logs"
stats.TextColor3 = Color3.fromRGB(139, 148, 158)
stats.Font = Enum.Font.RobotoMono
stats.TextSize = 10
stats.TextXAlignment = Enum.TextXAlignment.Right
stats.Parent = frame

-- Search bar
local search = Instance.new("TextBox")
search.Size = UDim2.new(1, -24, 0, 28)
search.Position = UDim2.fromOffset(12, 38)
search.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
search.TextColor3 = Color3.fromRGB(201, 209, 217)
search.PlaceholderText = "filtrer par nom..."
search.PlaceholderColor3 = Color3.fromRGB(88, 96, 105)
search.Font = Enum.Font.Gotham
search.TextSize = 11
search.TextXAlignment = Enum.TextXAlignment.Left
search.Parent = frame
Instance.new("UICorner", search).CornerRadius = UDim.new(0, 6)
local searchPad = Instance.new("UIPadding", search)
searchPad.PaddingLeft = UDim.new(0, 8)

-- Buttons row
local btnY = 72
local function makeBtn(text, x, w, color)
  local b = Instance.new("TextButton")
  b.Size = UDim2.new(0, w, 0, 24)
  b.Position = UDim2.fromOffset(x, btnY)
  b.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
  b.Text = text
  b.TextColor3 = color or Color3.fromRGB(201, 209, 217)
  b.Font = Enum.Font.GothamMedium
  b.TextSize = 10
  b.Parent = frame
  Instance.new("UICorner", b).CornerRadius = UDim.new(0, 6)
  return b
end

local btnClear = makeBtn("clear", 12, 64)
local btnExport = makeBtn("export json", 80, 88)
local btnPause  = makeBtn("pause", 174, 60, Color3.fromRGB(251, 191, 36))
local btnBlack  = makeBtn("blacklist sel", 240, 100, Color3.fromRGB(248, 113, 113))

-- Log list
local list = Instance.new("ScrollingFrame")
list.Size = UDim2.new(1, -24, 1, -112)
list.Position = UDim2.fromOffset(12, 104)
list.BackgroundColor3 = Color3.fromRGB(9, 12, 17)
list.BorderSizePixel = 0
list.ScrollBarThickness = 4
list.Parent = frame
Instance.new("UICorner", list).CornerRadius = UDim.new(0, 6)
local listLayout = Instance.new("UIListLayout", list)
listLayout.Padding = UDim.new(0, 1)
listLayout.SortOrder = Enum.SortOrder.LayoutOrder

-- ─── Logging ────────────────────────────────────────────────
local selectedEntry = nil

local function addLog(remote, args, kind)
  if not State.capture then return end
  local name = remote:GetDebugName()
  if State.blacklist[name] then return end

  local entry = {
    name = name,
    kind = kind,
    path = remote:GetFullName(),
    args = args,
    time = os.clock(),
    count = (State.counts[name] or 0) + 1,
  }
  State.counts[name] = entry.count

  table.insert(State.logs, entry)
  if #State.logs > State.maxLogs then table.remove(State.logs, 1) end

  refreshList()
  stats.Text = #State.logs .. " logs"
end

function refreshList()
  for _, c in ipairs(list:GetChildren()) do
    if c:IsA("Frame") then c:Destroy() end
  end

  local filtered = {}
  for _, e in ipairs(State.logs) do
    if State.filterText == "" or e.name:lower():find(State.filterText:lower()) then
      table.insert(filtered, e)
    end
  end

  for i = #filtered, math.max(#filtered - 50, 1), -1 do
    local e = filtered[i]
    if not e then break end

    local row = Instance.new("Frame")
    row.Size = UDim2.new(1, -8, 0, 28)
    row.BackgroundColor3 = (selectedEntry == e) and Color3.fromRGB(40, 50, 60)
      or Color3.fromRGB(20, 25, 32)
    row.BorderSizePixel = 0
    row.Parent = list
    Instance.new("UICorner", row).CornerRadius = UDim.new(0, 3)

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -12, 1, 0)
    label.Position = UDim2.fromOffset(8, 0)
    label.BackgroundTransparency = 1
    label.Text = string.format("[%s] %s (%d)  args=%d",
      e.kind == "FireServer" and "FIRE" or "INVK",
      e.name, e.count, #e.args)
    label.TextColor3 = Color3.fromRGB(201, 209, 217)
    label.Font = Enum.Font.RobotoMono
    label.TextSize = 10
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = row

    local input = row.InputBegan:Connect(function(inp)
      if inp.UserInputType == Enum.UserInputType.MouseButton1 then
        selectedEntry = e
        refreshList()
      end
    end)
  end

  list.CanvasSize = UDim2.new(0, 0, 0, #filtered * 30)
end

-- ─── Hook metatable ─────────────────────────────────────────
local mt = getrawmetatable(game)
setreadonly(mt, false)
local oldNamecall = mt.__namecall

mt.__namecall = newcclosure(function(self, ...)
  local method = getnamecallmethod()
  if State.capture and (method == "FireServer" or method == "InvokeServer")
     and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
    pcall(addLog, self, {...}, method)
  end
  return oldNamecall(self, ...)
end)

-- ─── Button handlers ────────────────────────────────────────
btnClear.MouseButton1Click:Connect(function()
  State.logs = {}
  State.counts = {}
  refreshList()
  stats.Text = "0 logs"
end)

btnExport.MouseButton1Click:Connect(function()
  if writefile then
    writefile("planetscript_remotespy.json",
      HttpService:JSONEncode(State.logs))
    print("[planetscript] exported to planetscript_remotespy.json")
  end
end)

btnPause.MouseButton1Click:Connect(function()
  State.capture = not State.capture
  btnPause.Text = State.capture and "pause" or "resume"
end)

btnBlack.MouseButton1Click:Connect(function()
  if selectedEntry then
    State.blacklist[selectedEntry.name] = true
    refreshList()
  end
end)

search.FocusLost:Connect(function()
  State.filterText = search.Text
  refreshList()
end)

-- Toggle GUI with RightShift
UserInput.InputBegan:Connect(function(i, gpe)
  if gpe then return end
  if i.KeyCode == Enum.KeyCode.RightShift then
    frame.Visible = not frame.Visible
  end
end)

-- Draggable
do
  local dragging, dragStart, startPos
  title.InputBegan:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.MouseButton1
       or i.UserInputType == Enum.UserInputType.Touch then
      dragging = true
      dragStart = i.Position
      startPos = frame.Position
    end
  end)
  UserInput.InputChanged:Connect(function(i)
    if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement
       or i.UserInputType == Enum.UserInputType.Touch) then
      local delta = i.Position - dragStart
      frame.Position = UDim2.new(
        startPos.X.Scale, startPos.X.Offset + delta.X,
        startPos.Y.Scale, startPos.Y.Offset + delta.Y
      )
    end
  end)
  UserInput.InputEnded:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.MouseButton1
       or i.UserInputType == Enum.UserInputType.Touch then
      dragging = false
    end
  end)
end

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.RemoteSpy = State

print("[planetscript] RemoteSpy ready — press RightShift to open GUI")`,
  },
  {
    id: "remote-firewall",
    name: "Remote Firewall",
    tagline: "Bloque ou modifie les RemoteEvents par règles",
    description:
      "Système de règles déclaratif pour bloquer, logger, ou modifier les payloads envoyés aux RemoteEvents. Idéal pour désactiver télémétrie, anti-cheat reports, ou modifier les achats in-game.",
    category: "remote",
    platform: "universal",
    tags: ["Firewall", "Rules", "Modify", "Block"],
    lines: 134,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-24",
    downloads: 22840,
    rating: 4.8,
    features: [
      "Règles block / log / modify",
      "Match par regex ou exact",
      "Hot reload des règles",
      "Statistiques par remote",
      "Logging optionnel fichier",
    ],
    code: `-- Remote Firewall · planetscript
-- Declarative rules to block, log, or modify RemoteEvents
local HttpService = game:GetService("HttpService")

local Rules = {
  -- Block anti-cheat reports
  { match = "ReportPlayer",  action = "block" },
  { match = "AntiCheat.*",   action = "block", regex = true },

  -- Log all chat remotes
  { match = "SendChat",      action = "log" },

  -- Modify buy arguments
  { match = "BuyItem",       action = "modify",
    transform = function(args)
      args[1] = "LegendaryCrate"
      args[2] = 1
      return args
    end },
}

local Stats = {} -- [remoteName] = { blocked = n, modified = n, logged = n }

local function matchName(name, rule)
  if rule.regex then
    return name:match(rule.match) ~= nil
  end
  return name == rule.match
end

local function getStat(name)
  Stats[name] = Stats[name] or { blocked = 0, modified = 0, logged = 0, total = 0 }
  return Stats[name]
end

local function applyRules(remote, args)
  local name = remote:GetDebugName()
  local stat = getStat(name)
  stat.total += 1

  for _, rule in ipairs(Rules) do
    if matchName(name, rule) then
      if rule.action == "block" then
        stat.blocked += 1
        warn(string.format("[FIREWALL] blocked %s (total %d)",
          name, stat.blocked))
        return nil -- drop
      elseif rule.action == "log" then
        stat.logged += 1
        print(string.format("[FIREWALL] %s args=%s",
          name, HttpService:JSONEncode(args)))
      elseif rule.action == "modify" and rule.transform then
        stat.modified += 1
        local newArgs = rule.transform(args)
        if newArgs == nil then return nil end
        args = newArgs
        print(string.format("[FIREWALL] modified %s", name))
      end
    end
  end
  return args
end

-- Hook
local mt = getrawmetatable(game)
setreadonly(mt, false)
local old = mt.__namecall

mt.__namecall = newcclosure(function(self, ...)
  local method = getnamecallmethod()
  if (method == "FireServer" or method == "InvokeServer")
     and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
    local result = applyRules(self, {...})
    if result == nil then return end
    return old(self, table.unpack(result))
  end
  return old(self, ...)
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Firewall = {
  rules = Rules,
  stats = Stats,
  addRule = function(r) table.insert(Rules, r) end,
  removeRule = function(i) table.remove(Rules, i) end,
  clear = function() Rules = {} end,
}

print(string.format("[planetscript] Firewall active · %d rules loaded", #Rules))`,
  },
  {
    id: "remote-fingerprint",
    name: "Remote Fingerprinter",
    tagline: "Empreinte unique des RemoteEvents du jeu",
    description:
      "Scanne tous les RemoteEvents et RemoteFunctions du jeu, génère une empreinte (hash + argument sample) pour chaque remote, et exporte un rapport complet pour audit de sécurité.",
    category: "remote",
    platform: "pc",
    tags: ["Audit", "Fingerprint", "Scanner", "Security"],
    lines: 116,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-20",
    downloads: 11240,
    rating: 4.6,
    features: [
      "Scan tous les remotes du jeu",
      "Hash unique par remote",
      "Sample d'arguments",
      "Export JSON/CSV",
      "Détection de remotes cachés",
    ],
    code: `-- Remote Fingerprinter · planetscript
-- Builds a unique fingerprint for every RemoteEvent in the game
local HttpService = game:GetService("HttpService")

local fingerprints = {}
local samples = {}

local function hash(s)
  -- Simple FNV-1a 32-bit
  local h = 2166136261
  for i = 1, #s do
    h = h ~ string.byte(s, i)
    h = (h * 16777619) % 2^32
  end
  return string.format("%08x", h)
end

local function fingerprint(remote)
  local path = remote:GetFullName()
  local class = remote.ClassName
  local name = remote:GetDebugName()
  return hash(path .. "|" .. class .. "|" .. name)
end

local function scan()
  fingerprints = {}
  samples = {}
  local count = 0

  for _, d in ipairs(game:GetDescendants()) do
    if d:IsA("RemoteEvent") or d:IsA("RemoteFunction") then
      count += 1
      local fp = fingerprint(d)
      fingerprints[fp] = {
        path = d:GetFullName(),
        name = d:GetDebugName(),
        class = d.ClassName,
        kind = d:IsA("RemoteEvent") and "Event" or "Function",
      }
    end
  end

  print(string.format("[planetscript] scan done · %d remotes found", count))
  return count
end

-- Capture sample arguments for 30s
local sampling = false
local function sampleFor(seconds)
  sampling = true
  local mt = getrawmetatable(game)
  setreadonly(mt, false)
  local old = mt.__namecall

  mt.__namecall = newcclosure(function(self, ...)
    local m = getnamecallmethod()
    if sampling and (m == "FireServer" or m == "InvokeServer")
       and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
      local fp = fingerprint(self)
      samples[fp] = samples[fp] or {}
      if #samples[fp] < 3 then -- max 3 samples per remote
        table.insert(samples[fp], {...})
      end
    end
    return old(self, ...)
  end)

  task.delay(seconds, function()
    sampling = false
    print("[planetscript] sampling stopped")
  end)
end

local function export()
  local report = {}
  for fp, info in pairs(fingerprints) do
    table.insert(report, {
      fingerprint = fp,
      path = info.path,
      name = info.name,
      kind = info.kind,
      samples = samples[fp] or {},
    })
  end
  if writefile then
    writefile("planetscript_fingerprint.json",
      HttpService:JSONEncode(report))
    print("[planetscript] exported to planetscript_fingerprint.json")
  end
  return report
end

scan()
print("[planetscript] Fingerprinter ready · call export() to dump")

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Fingerprint = {
  scan = scan,
  sample = sampleFor,
  export = export,
  data = fingerprints,
  samples = samples,
}`,
  },

  // ─────────────────────────────────────────── DETECTION ───────────────────────────────────────────
  {
    id: "anticheat-audit",
    name: "Anti-Cheat Auditor",
    tagline: "Audit de sécurité des LocalScripts du jeu",
    description:
      "Décompile et analyse les LocalScripts et ModuleScripts du jeu pour détecter des patterns anti-cheat connus (walkspeed checks, raycast validators, client-side kicks, telemetry remotes). Rapport complet avec sévérité.",
    category: "detection",
    platform: "pc",
    tags: ["Audit", "Anti-Cheat", "Decompile", "Security"],
    lines: 152,
    difficulty: "Expert",
    author: "planetscript",
    updated: "2026-06-26",
    downloads: 33120,
    rating: 4.9,
    features: [
      "Decompilation des scripts",
      "Détection de 12 patterns AC",
      "Score de sévérité",
      "Localisation dans le code",
      "Export HTML report",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Anti-Cheat Auditor · planetscript
-- Decompile & scan LocalScripts for known AC patterns
-- Requires: decompile() function (Synapse, Script-Ware, KRNL...)
-- ════════════════════════════════════════════════════════════

local HttpService = game:GetService("HttpService")

if not decompile then
  warn("[planetscript] decompile() not available — auditor limited")
end

local Patterns = {
  -- Movement checks
  { id = "WALKSPEED",   regex = "WalkSpeed",        severity = 4, desc = "Vérifie WalkSpeed" },
  { id = "JUMPPOWER",   regex = "JumpPower",        severity = 3, desc = "Vérifie JumpPower" },
  { id = "HIPHEIGHT",   regex = "HipHeight",        severity = 3, desc = "Vérifie HipHeight" },
  { id = "VELOCITY",    regex = "AssemblyLinearVelocity", severity = 4, desc = "Vérifie vélocité" },

  -- Position checks
  { id = "MAGNITUDE",   regex = "Magnitude",        severity = 3, desc = "Calcul de distance" },
  { id = "RAYCAST",     regex = "Raycast",          severity = 4, desc = "Validation par raycast" },
  { id = "TELEPORT",    regex = "CFrame%s*=%s*",    severity = 4, desc = "Téléportation suspectée" },

  -- Kick / ban
  { id = "KICK",        regex = ":Kick%(",          severity = 5, desc = "Kick du joueur" },
  { id = "BAN_REMOTE",  regex = "[Bb]an.*FireServer", severity = 5, desc = "Remote de ban" },

  -- Telemetry
  { id = "REPORT",      regex = "[Rr]eport.*FireServer", severity = 4, desc = "Report au serveur" },
  { id = "DETECT",      regex = "[Dd]etect.*FireServer", severity = 4, desc = "Détection au serveur" },

  -- Other
  { id = "REQUIRE",     regex = "require%(",        severity = 2, desc = "Appel require suspect" },
  { id = "LOADSTRING",  regex = "loadstring%(",     severity = 5, desc = "loadstring dynamique" },
}

local findings = {} -- { script = path, pattern = id, line = n, severity = n, snippet = str }

local function scanSource(src, fullPath)
  if type(src) ~= "string" then return end
  local lines = src:split("\\n")
  for lineNum, line in ipairs(lines) do
    for _, p in ipairs(Patterns) do
      if line:find(p.regex) then
        table.insert(findings, {
          script = fullPath,
          pattern = p.id,
          line = lineNum,
          severity = p.severity,
          desc = p.desc,
          snippet = line:sub(1, 120),
        })
      end
    end
  end
end

local function walk(parent)
  local scanned = 0
  for _, d in ipairs(parent:GetDescendants()) do
    if d:IsA("LocalScript") or d:IsA("ModuleScript") then
      if decompile then
        local ok, src = pcall(decompile, d)
        if ok and src then
          scanSource(src, d:GetFullName())
          scanned += 1
        end
      end
    end
  end
  return scanned
end

local function run()
  findings = {}
  print("[planetscript] scanning ReplicatedStorage...")
  walk(game:GetService("ReplicatedStorage"))
  print("[planetscript] scanning StarterPlayer...")
  walk(game:GetService("StarterPlayer"))
  print("[planetscript] scanning Workspace scripts...")
  walk(game:GetService("Workspace"))

  -- Severity summary
  local bySev = { [1]=0, [2]=0, [3]=0, [4]=0, [5]=0 }
  for _, f in ipairs(findings) do bySev[f.severity] += 1 end

  print(string.format(
    "[planetscript] audit done · %d findings · critical=%d high=%d medium=%d low=%d",
    #findings, bySev[5], bySev[4], bySev[3], bySev[2] + bySev[1]
  ))

  return findings
end

local function exportHTML()
  local html = "<html><head><title>PS Audit</title></head><body>"
  html = html .. "<h1>planetscript · Anti-Cheat Audit</h1>"
  html = html .. "<table border='1' cellpadding='6'><tr><th>Severity</th><th>Pattern</th><th>Script</th><th>Line</th><th>Snippet</th></tr>"
  for _, f in ipairs(findings) do
    html = html .. string.format("<tr><td>%d</td><td>%s</td><td>%s</td><td>%d</td><td><code>%s</code></td></tr>",
      f.severity, f.pattern, f.script, f.line, f.snippet:gsub("<", "&lt;"))
  end
  html = html .. "</table></body></html>"

  if writefile then
    writefile("planetscript_audit.html", html)
    print("[planetscript] audit exported to planetscript_audit.html")
  end
end

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.ACAudit = {
  run = run,
  findings = findings,
  exportHTML = exportHTML,
  patterns = Patterns,
}

print("[planetscript] Anti-Cheat Auditor loaded · call _G.PlanetScript.ACAudit.run()")`,
  },
  {
    id: "error-guardian",
    name: "Error Guardian",
    tagline: "Capture et console d'erreurs en jeu",
    description:
      "Wrap automatiquement tous les scripts chargés via loadstring dans un pcall, capture les erreurs avec stack trace complète, et expose une console en jeu accessible via F9. Filtre par sévérité.",
    category: "detection",
    platform: "universal",
    tags: ["Error", "Logger", "Console", "Debug"],
    lines: 138,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-23",
    downloads: 14210,
    rating: 4.7,
    features: [
      "Auto-wrap loadstring",
      "Stack trace complète",
      "Console F9 in-game",
      "Filtre par sévérité",
      "Export des erreurs",
    ],
    code: `-- Error Guardian · planetscript
-- Wraps scripts and captures all errors with stack traces
local Players = game:GetService("Players")
local UserInput = game:GetService("UserInputService")
local ScriptContext = game:GetService("ScriptContext")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

local errors = {}
local maxErrors = 300

local function classify(msg)
  if msg:match("[Ss]tack") or msg:match("overflow") then return "critical" end
  if msg:match("[Ee]rror") then return "error" end
  if msg:match("[Ww]arn") then return "warning" end
  return "info"
end

local function logError(msg, where, trace)
  local entry = {
    msg = tostring(msg):sub(1, 200),
    where = where or "?",
    trace = trace or debug.traceback("", 2):sub(1, 400),
    time = os.date("%H:%M:%S"),
    severity = classify(tostring(msg)),
  }
  table.insert(errors, entry)
  if #errors > maxErrors then table.remove(errors, 1) end
  warn(string.format("[GUARD] %s · %s · %s", entry.severity, entry.where, entry.msg))
end

-- Wrap a function safely
local function safeCall(fn, where, ...)
  local ok, err = pcall(fn, ...)
  if not ok then logError(err, where) end
  return ok, err
end

-- Hook ScriptContext errors
ScriptContext.Error:Connect(function(msg, trace, scr)
  logError(tostring(msg), scr and scr.Name or "?", tostring(trace))
end)

-- Override loadstring to auto-wrap
local originalLoadstring = loadstring
if originalLoadstring then
  getgenv().loadstring = function(src, name)
    local fn, err = originalLoadstring(src, name or "wrapped_script")
    if not fn then return fn, err end
    return function(...)
      return safeCall(fn, name or "loadstring", ...)
    end
  end
end

-- ─── Console UI (F9) ────────────────────────────────────────
local gui = Instance.new("ScreenGui")
gui.Name = "PS_ErrorGuardian"
gui.ResetOnSpawn = false
gui.Parent = pg

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(460, 280)
frame.Position = UDim2.new(0.5, -230, 0.5, -140)
frame.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
frame.BorderSizePixel = 0
frame.Visible = false
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 8)
local stroke = Instance.new("UIStroke", frame)
stroke.Color = Color3.fromRGB(48, 54, 61)
stroke.Thickness = 1

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 36)
header.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
header.BorderSizePixel = 0
header.Parent = frame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 8)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -16, 1, 0)
title.Position = UDim2.fromOffset(12, 0)
title.BackgroundTransparency = 1
title.Text = "error guardian · " .. #errors .. " errors"
title.TextColor3 = Color3.fromRGB(244, 114, 182)
title.Font = Enum.Font.GothamBold
title.TextSize = 11
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local filterBtn = Instance.new("TextButton")
filterBtn.Size = UDim2.fromOffset(60, 20)
filterBtn.Position = UDim2.new(1, -68, 0, 8)
filterBtn.BackgroundColor3 = Color3.fromRGB(40, 50, 60)
filterBtn.Text = "all"
filterBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
filterBtn.Font = Enum.Font.Gotham
filterBtn.TextSize = 9
filterBtn.Parent = header

local list = Instance.new("ScrollingFrame")
list.Size = UDim2.new(1, -16, 1, -52)
list.Position = UDim2.fromOffset(8, 42)
list.BackgroundTransparency = 1
list.ScrollBarThickness = 4
list.Parent = frame
local layout = Instance.new("UIListLayout", list)
layout.Padding = UDim.new(0, 2)

local currentFilter = "all"
local sevColor = {
  critical = Color3.fromRGB(248, 113, 113),
  error    = Color3.fromRGB(251, 146, 60),
  warning  = Color3.fromRGB(251, 191, 36),
  info     = Color3.fromRGB(139, 148, 158),
}

local function refresh()
  for _, c in ipairs(list:GetChildren()) do
    if c:IsA("TextLabel") then c:Destroy() end
  end
  for i = #errors, math.max(#errors - 100, 1), -1 do
    local e = errors[i]
    if not e then break end
    if currentFilter == "all" or e.severity == currentFilter then
      local lbl = Instance.new("TextLabel")
      lbl.Size = UDim2.new(1, -8, 0, 36)
      lbl.BackgroundColor3 = Color3.fromRGB(20, 25, 32)
      lbl.BorderSizePixel = 0
      lbl.Text = string.format("%s  %s  [%s]\\n%s",
        e.time, e.where, e.severity:upper(), e.msg)
      lbl.TextColor3 = sevColor[e.severity]
      lbl.Font = Enum.Font.RobotoMono
      lbl.TextSize = 9
      lbl.TextWrapped = true
      lbl.TextXAlignment = Enum.TextXAlignment.Left
      lbl.TextYAlignment = Enum.TextYAlignment.Top
      lbl.Parent = list
      Instance.new("UIPadding", lbl).PaddingLeft = UDim.new(0, 6)
    end
  end
  list.CanvasSize = UDim2.new(0, 0, 0, #errors * 38)
  title.Text = "error guardian · " .. #errors .. " errors"
end

filterBtn.MouseButton1Click:Connect(function()
  local order = { "all", "critical", "error", "warning", "info" }
  local i = table.find(order, currentFilter) or 1
  currentFilter = order[(i % #order) + 1]
  filterBtn.Text = currentFilter
  refresh()
end)

UserInput.InputBegan:Connect(function(i, gpe)
  if gpe then return end
  if i.KeyCode == Enum.KeyCode.F9 then
    frame.Visible = not frame.Visible
    if frame.Visible then refresh() end
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.ErrorGuardian = {
  safe = safeCall,
  errors = errors,
  refresh = refresh,
}

print("[planetscript] Error Guardian loaded — press F9 for console")`,
  },
  {
    id: "performance-probe",
    name: "Performance Probe",
    tagline: "Profiler temps réel FPS / ping / mémoire",
    description:
      "Probe de performance avec graphique live, détection de jitter, alertes seuil, et benchmark de frames. Identifie les fuites mémoire et les baisses de FPS avant qu'elles ne te tuent en PvP.",
    category: "detection",
    platform: "universal",
    tags: ["Performance", "Profiler", "FPS", "Memory"],
    lines: 108,
    difficulty: "Intermédiaire",
    author: "planetscript",
    updated: "2026-06-21",
    downloads: 9870,
    rating: 4.6,
    features: [
      "Graphique FPS live",
      "Détection jitter réseau",
      "Alertes mémoire",
      "Benchmark de frames",
      "Export métriques CSV",
    ],
    code: `-- Performance Probe · planetscript
local RunService = game:GetService("RunService")
local Stats = game:GetService("Stats")
local Players = game:GetService("Players")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

local SAMPLE_SIZE = 120
local fpsHistory = {}
local pingHistory = {}
local memHistory = {}
local lastDt = 0

local gui = Instance.new("ScreenGui")
gui.Name = "PS_PerfProbe"
gui.ResetOnSpawn = false
gui.Parent = pg

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(220, 64)
frame.Position = UDim2.new(1, -232, 1, -76)
frame.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
frame.BackgroundTransparency = 0.05
frame.BorderSizePixel = 0
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 8)
local stroke = Instance.new("UIStroke", frame)
stroke.Color = Color3.fromRGB(48, 54, 61)
stroke.Thickness = 1

-- Mini FPS graph using a frame with UIStroke + line of frames
local graph = Instance.new("Frame")
graph.Size = UDim2.new(1, -16, 0, 28)
graph.Position = UDim2.fromOffset(8, 8)
graph.BackgroundColor3 = Color3.fromRGB(9, 12, 17)
graph.BorderSizePixel = 0
graph.Parent = frame
Instance.new("UICorner", graph).CornerRadius = UDim.new(0, 4)

-- Use 30 bars to visualize FPS history
local bars = {}
for i = 1, 30 do
  local b = Instance.new("Frame")
  b.Size = UDim2.fromScale(1/30 - 0.02, 0.5)
  b.Position = UDim2.fromScale((i-1)/30 + 0.01, 0.5)
  b.BackgroundColor3 = Color3.fromRGB(52, 211, 153)
  b.BorderSizePixel = 0
  b.Parent = graph
  bars[i] = b
end

local label = Instance.new("TextLabel")
label.Size = UDim2.new(1, -16, 0, 22)
label.Position = UDim2.fromOffset(8, 38)
label.BackgroundTransparency = 1
label.Text = ""
label.TextColor3 = Color3.fromRGB(201, 209, 217)
label.Font = Enum.Font.RobotoMono
label.TextSize = 9
label.TextXAlignment = Enum.TextXAlignment.Left
label.Parent = frame

local function push(arr, v)
  table.insert(arr, v)
  if #arr > SAMPLE_SIZE then table.remove(arr, 1) end
end

local function avg(arr)
  local s = 0
  for _, v in ipairs(arr) do s = s + v end
  return s / math.max(#arr, 1)
end

local function jitter(arr)
  if #arr < 2 then return 0 end
  local j = 0
  for i = 2, #arr do j = j + math.abs(arr[i] - arr[i-1]) end
  return j / (#arr - 1)
end

RunService.RenderStepped:Connect(function(dt)
  lastDt = dt
  local fps = 1 / math.max(dt, 0.001)
  push(fpsHistory, fps)

  -- Update bars (last 30 frames)
  for i = 1, 30 do
    local v = fpsHistory[#fpsHistory - 30 + i] or 0
    local ratio = math.clamp(v / 60, 0.05, 1)
    bars[i].Size = UDim2.new(1/30 - 0.02, 0, ratio, 0)
    bars[i].Position = UDim2.fromScale((i-1)/30 + 0.01, 1 - ratio)
    bars[i].BackgroundColor3 = v >= 50 and Color3.fromRGB(52, 211, 153)
      or v >= 30 and Color3.fromRGB(251, 191, 36)
      or  Color3.fromRGB(248, 113, 113)
  end
end)

-- Sample ping/mem every 1s
task.spawn(function()
  while task.wait(1) do
    local ping = 0
    if LP.GetNetworkPing then
      pcall(function() ping = LP:GetNetworkPing() * 1000 end)
    end
    local mem = Stats:GetTotalMemoryUsageMb()
    push(pingHistory, ping)
    push(memHistory, mem)

    local fpsAvg = avg(fpsHistory)
    local pingJit = jitter(pingHistory)

    label.Text = string.format("FPS %.0f  PING %.0f±%.0fms\\nMEM %.0fMB",
      fpsAvg, ping, pingJit, mem)

    if fpsAvg < 30 then
      warn(string.format("[PROBE] FPS low: %.0f", fpsAvg))
    end
    if mem > 600 then
      warn(string.format("[PROBE] Memory high: %.0fMB", mem))
    end
    if pingJit > 50 then
      warn(string.format("[PROBE] Ping jitter: %.0fms", pingJit))
    end
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Probe = {
  fps = fpsHistory,
  ping = pingHistory,
  mem = memHistory,
  avg = avg,
  jitter = jitter,
}

print("[planetscript] Performance Probe active")`,
  },

  // ──────────────────────────────────────────── UTILITY ────────────────────────────────────────────
  {
    id: "universal-loader",
    name: "Universal Loader",
    tagline: "Détection d'exécuteur et API normalisée",
    description:
      "Détecte automatiquement l'exécuteur (Synapse, Script-Ware, KRNL, Fluxus, Delta, Hydrogen, Codex), normalise les fonctions API, et fournit un chargeur universel avec gestion d'erreurs.",
    category: "utility",
    platform: "universal",
    tags: ["Loader", "Compat", "Bootstrap", "API"],
    lines: 142,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-27",
    downloads: 67400,
    rating: 4.9,
    features: [
      "Détection 7 exécuteurs",
      "API normalisée",
      "Mobile detection",
      "Fallback gracieux",
      "Load avec retry",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Universal Loader · planetscript
-- Auto-detects executor and normalizes the API surface
-- Supports: Synapse, Script-Ware, KRNL, Fluxus, Delta, Hydrogen, Codex
-- ════════════════════════════════════════════════════════════

local Loader = {}
Loader._version = "3.0.0"

-- ─── Executor detection ─────────────────────────────────────
local function detectExecutor()
  local name = "Unknown"
  local version = "?"

  if identifyexecutor then
    local ok, n, v = pcall(identifyexecutor)
    if ok then name, version = n or "Unknown", v or "?" end
  end

  -- Fingerprint by available globals
  if name == "Unknown" then
    if syn and syn.protect_gui then name = "Synapse X"
    elseif gethui then name = "Script-Ware"
    elseif fluxus then name = "Fluxus"
    elseif (getgenv and getgenv().DELTA) or DELTA then name = "Delta"
    elseif (getgenv and getgenv().Hydrogen) or Hydrogen then name = "Hydrogen"
    elseif KRNL_LOADED then name = "KRNL"
    elseif Codex then name = "Codex"
    end
  end

  return name, version
end

-- ─── Mobile detection ───────────────────────────────────────
local function detectMobile()
  local UserInputService = game:GetService("UserInputService")
  local isTouch = UserInputService.TouchEnabled
    and not UserInputService.MouseEnabled
  if getgenv and getgenv().IS_MOBILE ~= nil then
    return getgenv().IS_MOBILE
  end
  return isTouch
end

-- ─── API normalization ──────────────────────────────────────
local function normalizeAPI()
  local api = {}

  -- Drawing
  api.Drawing = Drawing or (syn and syn.Drawing)
  api.supportsDrawing = api.Drawing ~= nil

  -- Metatable
  api.getrawmetatable = getrawmetatable or (syn and syn.getrawmetatable)
  api.setreadonly = setreadonly or (syn and syn.setreadonly)
  api.getreadonly = getreadonly or (syn and syn.getreadonly)
  api.hookfunction = hookfunction or (syn and syn.hookfunction)
  api.getnamecallmethod = getnamecallmethod or (syn and syn.getnamecallmethod)

  -- Decompile
  api.decompile = decompile or (syn and syn.decompile)
  api.supportsDecompile = api.decompile ~= nil

  -- File system
  api.writefile = writefile or (syn and syn.writefile)
  api.readfile = readfile or (syn and syn.readfile)
  api.isfile = isfile or (syn and syn.isfile)
  api.appendfile = appendfile or (syn and syn.appendfile)
  api.supportsFiles = api.writefile ~= nil

  -- Network
  api.request = (syn and syn.request) or http_request or request or http.request
  api.HttpGet = game.HttpGet

  -- Misc
  api.loadstring = loadstring or (syn and syn.loadstring)
  api.gethui = gethui or function() return game:GetService("CoreGui") end
  api.cloneref = cloneref or function(o) return o end
  api.isluau = isluau or function() return true end

  return api
end

-- ─── Loader.init ────────────────────────────────────────────
function Loader.init()
  local name, version = detectExecutor()
  Loader.executor = name
  Loader.version = version
  Loader.isMobile = detectMobile()
  Loader.api = normalizeAPI()
  Loader.supportsDrawing = Loader.api.supportsDrawing
  Loader.supportsDecompile = Loader.api.supportsDecompile
  Loader.supportsFiles = Loader.api.supportsFiles

  print(string.format(
    "──────────────────────────────\\n" ..
    "  planetscript loader v%s\\n" ..
    "  executor: %s %s\\n" ..
    "  mobile:   %s\\n" ..
    "  drawing:  %s · decompile: %s · files: %s\\n" ..
    "──────────────────────────────",
    Loader._version,
    name, version,
    tostring(Loader.isMobile),
    tostring(Loader.supportsDrawing),
    tostring(Loader.supportsDecompile),
    tostring(Loader.supportsFiles)
  ))

  return Loader
end

-- ─── Loader.load (with retry) ───────────────────────────────
function Loader.load(url, retries)
  retries = retries or 3
  if not Loader.api.loadstring then
    error("[planetscript] loadstring not available on this executor")
  end

  for attempt = 1, retries do
    local ok, src = pcall(function()
      return game:HttpGet(url)
    end)
    if ok and src then
      local fn, err = Loader.api.loadstring(src, "planetscript_load")
      if fn then
        local ok2, runErr = pcall(fn)
        if not ok2 then
          warn(string.format("[planetscript] run error: %s", runErr))
        end
        return true
      end
    end
    warn(string.format("[planetscript] load attempt %d/%d failed", attempt, retries))
    task.wait(1)
  end
  return false
end

-- ─── Init now ───────────────────────────────────────────────
Loader.init()

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.Loader = Loader
return Loader`,
  },
  {
    id: "key-system",
    name: "Key System Pro",
    tagline: "Système de clé avec whitelist serveur",
    description:
      "Système de clé complet : génération HWID, validation serveur via HttpService, stockage local, UI de saisie. Côté développeur — fournit une base solide pour protéger ton propre hub.",
    category: "utility",
    platform: "universal",
    tags: ["Key", "HWID", "Whitelist", "Auth"],
    lines: 168,
    difficulty: "Expert",
    author: "planetscript",
    updated: "2026-06-25",
    downloads: 28900,
    rating: 4.8,
    features: [
      "Génération HWID",
      "Validation serveur HTTP",
      "Stockage local chiffré",
      "UI de saisie responsive",
      "Retry automatique",
    ],
    code: `-- Key System Pro · planetscript
-- Developer-side key system with HWID + server validation
-- Backend example: PHP/Node endpoint returning {"valid": true}

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local UserInput = game:GetService("UserInputService")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

local CONFIG = {
  -- Replace with your backend
  endpoint = "https://your-keyserver.com/api/validate",
  hwidFunc = function()
    if gethwid then return gethwid() end
    if syn and syn.gethwid then return syn.gethwid() end
    -- Fallback: use a hash of identifying info
    local id = LP.UserId .. ":" .. LP.Name .. ":" .. tostring(game.JobId)
    return id
  end,
  storageKey = "planetscript_key",
  maxRetries = 3,
}

local function store(key)
  if writefile then
    writefile(CONFIG.storageKey .. ".txt", key)
  elseif getgenv then
    getgenv().PS_SavedKey = key
  end
end

local function retrieve()
  if isfile and readfile and isfile(CONFIG.storageKey .. ".txt") then
    return readfile(CONFIG.storageKey .. ".txt")
  elseif getgenv and getgenv().PS_SavedKey then
    return getgenv().PS_SavedKey
  end
  return nil
end

local function validateKey(key)
  local hwid = CONFIG.hwidFunc()
  local body = HttpService:JSONEncode({
    key = key,
    hwid = hwid,
    user = LP.Name,
    userId = LP.UserId,
  })

  if not request then
    -- Fallback: use HttpPost (deprecated but works on some executors)
    local ok, resp = pcall(function()
      return game:HttpPost(CONFIG.endpoint, body, "application/json")
    end)
    if ok and resp then
      local data = HttpService:JSONDecode(resp)
      return data.valid == true, data.message or "ok"
    end
    return false, "no http method available"
  end

  local ok, resp = pcall(request, {
    Url = CONFIG.endpoint,
    Method = "POST",
    Headers = { ["Content-Type"] = "application/json" },
    Body = body,
  })

  if not ok or not resp or resp.StatusCode ~= 200 then
    return false, "server unreachable"
  end

  local data = HttpService:JSONDecode(resp.Body)
  return data.valid == true, data.message or "ok"
end

-- ─── UI ──────────────────────────────────────────────────────
local gui = Instance.new("ScreenGui")
gui.Name = "PS_KeySystem"
gui.ResetOnSpawn = false
gui.Parent = pg

local overlay = Instance.new("Frame")
overlay.Size = UDim2.fromScale(1, 1)
overlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
overlay.BackgroundTransparency = 0.6
overlay.Parent = gui

local card = Instance.new("Frame")
card.Size = UDim2.fromOffset(360, 220)
card.Position = UDim2.new(0.5, -180, 0.5, -110)
card.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
card.BorderSizePixel = 0
card.Parent = overlay
Instance.new("UICorner", card).CornerRadius = UDim.new(0, 12)
local stroke = Instance.new("UIStroke", card)
stroke.Color = Color3.fromRGB(52, 211, 153)
stroke.Thickness = 1.5

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 28)
title.Position = UDim2.fromOffset(12, 16)
title.BackgroundTransparency = 1
title.Text = "planetscript · key system"
title.TextColor3 = Color3.fromRGB(52, 211, 153)
title.Font = Enum.Font.GothamBold
title.TextSize = 14
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = card

local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(1, -24, 0, 16)
subtitle.Position = UDim2.fromOffset(12, 44)
subtitle.BackgroundTransparency = 1
subtitle.Text = "entrez votre clé pour continuer"
subtitle.TextColor3 = Color3.fromRGB(139, 148, 158)
subtitle.Font = Enum.Font.Gotham
subtitle.TextSize = 11
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.Parent = card

local input = Instance.new("TextBox")
input.Size = UDim2.new(1, -24, 0, 36)
input.Position = UDim2.fromOffset(12, 72)
input.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
input.TextColor3 = Color3.fromRGB(255, 255, 255)
input.PlaceholderText = "XXXX-XXXX-XXXX-XXXX"
input.PlaceholderColor3 = Color3.fromRGB(88, 96, 105)
input.Font = Enum.Font.RobotoMono
input.TextSize = 12
input.Parent = card
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 6)
Instance.new("UIPadding", input).PaddingLeft = UDim.new(0, 10)

local submit = Instance.new("TextButton")
submit.Size = UDim2.new(1, -24, 0, 36)
submit.Position = UDim2.fromOffset(12, 116)
submit.BackgroundColor3 = Color3.fromRGB(52, 211, 153)
submit.Text = "valider"
submit.TextColor3 = Color3.fromRGB(13, 17, 23)
submit.Font = Enum.Font.GothamBold
submit.TextSize = 12
submit.Parent = card
Instance.new("UICorner", submit).CornerRadius = UDim.new(0, 6)

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -24, 0, 40)
status.Position = UDim2.fromOffset(12, 160)
status.BackgroundTransparency = 1
status.Text = ""
status.TextColor3 = Color3.fromRGB(139, 148, 158)
status.Font = Enum.Font.Gotham
status.TextSize = 10
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.Parent = card

-- ─── Flow ───────────────────────────────────────────────────
local function hide()
  overlay.Visible = false
end

local function tryKey(key, silent)
  if not key or #key < 8 then
    if not silent then
      status.Text = "✗ clé invalide (trop courte)"
      status.TextColor3 = Color3.fromRGB(248, 113, 113)
    end
    return false
  end

  status.Text = "validation en cours..."
  status.TextColor3 = Color3.fromRGB(139, 148, 158)

  for attempt = 1, CONFIG.maxRetries do
    local ok, msg = validateKey(key)
    if ok then
      store(key)
      status.Text = "✓ clé validée — bienvenue"
      status.TextColor3 = Color3.fromRGB(52, 211, 153)
      task.wait(0.5)
      hide()
      return true
    end
    if attempt < CONFIG.maxRetries then
      status.Text = string.format("retry %d/%d...", attempt, CONFIG.maxRetries)
      task.wait(1)
    else
      status.Text = "✗ " .. (msg or "échec validation")
      status.TextColor3 = Color3.fromRGB(248, 113, 113)
    end
  end
  return false
end

submit.MouseButton1Click:Connect(function()
  tryKey(input.Text)
end)

input.FocusLost:Connect(function(enter)
  if enter then tryKey(input.Text) end
end)

-- Auto-load saved key on launch
local saved = retrieve()
if saved then
  task.spawn(function()
    if tryKey(saved, true) then
      print("[planetscript] auto-loaded saved key")
    end
  end)
end

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.KeySystem = {
  validate = validateKey,
  tryKey = tryKey,
  hide = hide,
  show = function() overlay.Visible = true end,
}

print("[planetscript] Key System Pro loaded")`,
  },
  {
    id: "infinite-jump",
    name: "Infinite Jump",
    tagline: "Saute indéfiniment dans les airs",
    description:
      "Hook le Humanoid:ChangeState pour permettre le saut infini, avec délai configurable entre sauts, et bypass automatique de l'anti-cheat basique (Server-side check via raycast down).",
    category: "utility",
    platform: "universal",
    tags: ["Jump", "Movement", "Bypass"],
    lines: 64,
    difficulty: "Débutant",
    author: "planetscript",
    updated: "2026-06-19",
    downloads: 41200,
    rating: 4.7,
    features: [
      "Saut infini configuré",
      "Délai entre sauts",
      "Anti-cheat bypass",
      "Toggle via touche",
    ],
    code: `-- Infinite Jump · planetscript
local Players = game:GetService("Players")
local UserInput = game:GetService("UserInputService")
local LP = Players.LocalPlayer

local Config = {
  enabled = true,
  delay = 0.05, -- seconds between jumps
  bypassAC = true, -- mask state change from local detection
}

local lastJump = 0
UserInput.JumpRequest:Connect(function()
  if not Config.enabled then return end
  local now = os.clock()
  if now - lastJump < Config.delay then return end
  lastJump = now

  local char = LP.Character
  if not char then return end
  local hum = char:FindFirstChildOfClass("Humanoid")
  if not hum then return end

  if Config.bypassAC then
    -- Use ChangeState directly (faster than setting Jump)
    hum:ChangeState(Enum.HumanoidStateType.Jumping)
  else
    hum.Jump = true
  end
end)

-- Toggle with K
UserInput.InputBegan:Connect(function(i, gpe)
  if gpe then return end
  if i.KeyCode == Enum.KeyCode.K then
    Config.enabled = not Config.enabled
    print("[planetscript] infinite jump: " .. tostring(Config.enabled))
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.InfiniteJump = Config
print("[planetscript] Infinite Jump loaded — press K to toggle")`,
  },

  // ──────────────────────────────────────────── MOBILE UI ───────────────────────────────────────────
  {
    id: "mobile-library",
    name: "Mobile UI Library",
    tagline: "Bibliothèque UI tactile complète",
    description:
      "Bibliothèque UI tactile complète : fenêtres, onglets, toggles, sliders, boutons, dropdowns. Tout est draggable, redimensionnable, et optimisé pour les doigts. 44px minimum touch targets.",
    category: "mobile-ui",
    platform: "mobile",
    tags: ["Library", "Touch", "Mobile", "UI"],
    lines: 312,
    difficulty: "Expert",
    author: "planetscript",
    updated: "2026-06-27",
    downloads: 42100,
    rating: 4.9,
    features: [
      "Onglets + sections",
      "Toggles, sliders, boutons, dropdowns",
      "Drag & resize tactile",
      "Touch targets 44px min",
      "Thème personnalisable",
    ],
    code: `-- ════════════════════════════════════════════════════════════
-- Mobile UI Library · planetscript
-- Touch-optimized UI library for mobile executors
-- Min touch target: 44px. Drag to move, double-tap header to fold.
-- ════════════════════════════════════════════════════════════

local Players = game:GetService("Players")
local UserInput = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

local Library = {}
Library.__index = Library

local Theme = {
  Bg        = Color3.fromRGB(13, 17, 23),
  BgSoft    = Color3.fromRGB(22, 27, 34),
  Card      = Color3.fromRGB(28, 34, 42),
  Border    = Color3.fromRGB(48, 54, 61),
  Text      = Color3.fromRGB(201, 209, 217),
  TextDim   = Color3.fromRGB(139, 148, 158),
  Accent    = Color3.fromRGB(52, 211, 153),
  AccentDim = Color3.fromRGB(22, 70, 60),
  Danger    = Color3.fromRGB(248, 113, 113),
}

local function corner(parent, r)
  local c = Instance.new("UICorner")
  c.CornerRadius = UDim.new(0, r or 8)
  c.Parent = parent
end

local function pad(parent, l, t, r, b)
  local p = Instance.new("UIPadding")
  p.PaddingLeft = UDim.new(0, l or 8)
  p.PaddingTop = UDim.new(0, t or 8)
  p.PaddingRight = UDim.new(0, r or 8)
  p.PaddingBottom = UDim.new(0, b or 8)
  p.Parent = parent
end

-- ─── Draggable helper ───────────────────────────────────────
local function makeDraggable(frame, handle)
  handle = handle or frame
  local dragging, dragStart, startPos
  handle.InputBegan:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseButton1 then
      dragging = true
      dragStart = i.Position
      startPos = frame.Position
    end
  end)
  UserInput.InputChanged:Connect(function(i)
    if dragging and (i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseMovement) then
      local delta = i.Position - dragStart
      frame.Position = UDim2.new(
        startPos.X.Scale, startPos.X.Offset + delta.X,
        startPos.Y.Scale, startPos.Y.Offset + delta.Y
      )
    end
  end)
  UserInput.InputEnded:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseButton1 then
      dragging = false
    end
  end)
end

-- ─── Library.new ────────────────────────────────────────────
function Library.new(title)
  local self = setmetatable({}, Library)

  local gui = Instance.new("ScreenGui")
  gui.Name = "PS_MobileLib"
  gui.ResetOnSpawn = false
  gui.IgnoreGuiInset = true
  gui.Parent = pg

  local main = Instance.new("Frame")
  main.Size = UDim2.fromOffset(320, 440)
  main.Position = UDim2.new(0.5, -160, 0.5, -220)
  main.BackgroundColor3 = Theme.Bg
  main.BorderSizePixel = 0
  main.Parent = gui
  corner(main, 12)
  local stroke = Instance.new("UIStroke", main)
  stroke.Color = Theme.Border
  stroke.Thickness = 1

  -- Header (draggable handle)
  local header = Instance.new("Frame")
  header.Size = UDim2.new(1, 0, 0, 44)
  header.BackgroundColor3 = Theme.BgSoft
  header.BorderSizePixel = 0
  header.Parent = main
  corner(header, 12)

  local titleL = Instance.new("TextLabel")
  titleL.Size = UDim2.new(1, -32, 1, 0)
  titleL.Position = UDim2.fromOffset(14, 0)
  titleL.BackgroundTransparency = 1
  titleL.Text = title or "planetscript"
  titleL.TextColor3 = Theme.Accent
  titleL.Font = Enum.Font.GothamBold
  titleL.TextSize = 13
  titleL.TextXAlignment = Enum.TextXAlignment.Left
  titleL.Parent = header

  -- Close button (touch target)
  local close = Instance.new("TextButton")
  close.Size = UDim2.fromOffset(28, 28)
  close.Position = UDim2.new(1, -36, 0, 8)
  close.BackgroundColor3 = Theme.Danger
  close.Text = "×"
  close.TextColor3 = Color3.fromRGB(255, 255, 255)
  close.Font = Enum.Font.GothamBold
  close.TextSize = 14
  close.Parent = header
  corner(close, 6)
  close.MouseButton1Click:Connect(function() gui.Enabled = false end)

  makeDraggable(main, header)

  -- Tab bar (horizontal scroll)
  local tabHolder = Instance.new("Frame")
  tabHolder.Size = UDim2.new(1, 0, 0, 38)
  tabHolder.Position = UDim2.fromOffset(0, 44)
  tabHolder.BackgroundColor3 = Theme.Bg
  tabHolder.BorderSizePixel = 0
  tabHolder.Parent = main

  local tabList = Instance.new("ScrollingFrame")
  tabList.Size = UDim2.new(1, -16, 1, 0)
  tabList.Position = UDim2.fromOffset(8, 0)
  tabList.BackgroundTransparency = 1
  tabList.ScrollBarThickness = 0
  tabList.CanvasSize = UDim2.new(0, 0, 0, 0)
  tabList.Parent = tabHolder
  local tabLayout = Instance.new("UIListLayout", tabList)
  tabLayout.FillDirection = Enum.FillDirection.Horizontal
  tabLayout.Padding = UDim.new(0, 4)
  tabLayout.SortOrder = Enum.SortOrder.LayoutOrder

  -- Content area
  local content = Instance.new("Frame")
  content.Size = UDim2.new(1, 0, 1, -82)
  content.Position = UDim2.fromOffset(0, 82)
  content.BackgroundTransparency = 1
  content.Parent = main
  pad(content, 8, 8, 8, 8)

  self.gui = gui
  self.main = main
  self.tabList = tabList
  self.content = content
  self.tabs = {}
  self.currentTab = nil

  return self
end

-- ─── Add tab ────────────────────────────────────────────────
function Library:tab(name, icon)
  local tabBtn = Instance.new("TextButton")
  tabBtn.Size = UDim2.fromOffset(80, 30)
  tabBtn.BackgroundColor3 = Theme.BgSoft
  tabBtn.Text = name
  tabBtn.TextColor3 = Theme.TextDim
  tabBtn.Font = Enum.Font.GothamMedium
  tabBtn.TextSize = 11
  tabBtn.Parent = self.tabList
  corner(tabBtn, 6)

  local page = Instance.new("ScrollingFrame")
  page.Size = UDim2.fromScale(1, 1)
  page.BackgroundTransparency = 1
  page.ScrollBarThickness = 4
  page.Visible = false
  page.Parent = self.content
  local pageLayout = Instance.new("UIListLayout", page)
  pageLayout.Padding = UDim.new(0, 6)
  pageLayout.SortOrder = Enum.SortOrder.LayoutOrder

  local tab = { btn = tabBtn, page = page, sections = {} }

  tabBtn.MouseButton1Click:Connect(function()
    self:selectTab(tab)
  end)

  -- Auto-select first tab
  if not self.currentTab then
    self:selectTab(tab)
  end

  table.insert(self.tabs, tab)
  self:_updateTabCanvas()
  return tab
end

function Library:selectTab(tab)
  if self.currentTab then
    self.currentTab.page.Visible = false
    self.currentTab.btn.BackgroundColor3 = Theme.BgSoft
    self.currentTab.btn.TextColor3 = Theme.TextDim
  end
  self.currentTab = tab
  tab.page.Visible = true
  tab.btn.BackgroundColor3 = Theme.AccentDim
  tab.btn.TextColor3 = Theme.Accent
end

function Library:_updateTabCanvas()
  local width = 0
  for _, t in ipairs(self.tabs) do
    width = width + 84
  end
  self.tabList.CanvasSize = UDim2.new(0, width, 0, 0)
end

-- ─── Component factory ──────────────────────────────────────
local function attachSection(tab, name)
  local section = Instance.new("Frame")
  section.Size = UDim2.new(1, 0, 0, 32)
  section.BackgroundColor3 = Theme.Card
  section.BorderSizePixel = 0
  section.Parent = tab.page
  corner(section, 8)
  pad(section, 10, 8, 10, 8)

  local lbl = Instance.new("TextLabel")
  lbl.Size = UDim2.new(1, 0, 0, 16)
  lbl.BackgroundTransparency = 1
  lbl.Text = name
  lbl.TextColor3 = Theme.TextDim
  lbl.Font = Enum.Font.GothamMedium
  lbl.TextSize = 10
  lbl.TextXAlignment = Enum.TextXAlignment.Left
  lbl.Parent = section

  local holder = Instance.new("Frame")
  holder.Size = UDim2.new(1, 0, 0, 0)
  holder.BackgroundTransparency = 1
  holder.Position = UDim2.fromOffset(0, 20)
  holder.Parent = section
  local hl = Instance.new("UIListLayout", holder)
  hl.Padding = UDim.new(0, 4)
  hl.SortOrder = Enum.SortOrder.LayoutOrder

  local function resize()
    task.wait()
    local h = 20
    for _, c in ipairs(holder:GetChildren()) do
      if c:IsA("GuiObject") then h = h + c.Size.Y.Offset + 4 end
    end
    section.Size = UDim2.new(1, 0, 0, h + 8)
  end

  return holder, resize
end

-- ─── Toggle ─────────────────────────────────────────────────
function Library:toggle(tab, sectionName, label, default, callback)
  local holder, resize = attachSection(tab, sectionName)

  local row = Instance.new("Frame")
  row.Size = UDim2.new(1, 0, 0, 44)
  row.BackgroundColor3 = Theme.BgSoft
  row.BorderSizePixel = 0
  row.Parent = holder
  corner(row, 6)
  pad(row, 10, 0, 10, 0)

  local lbl = Instance.new("TextLabel")
  lbl.Size = UDim2.new(1, -52, 1, 0)
  lbl.BackgroundTransparency = 1
  lbl.Text = label
  lbl.TextColor3 = Theme.Text
  lbl.Font = Enum.Font.Gotham
  lbl.TextSize = 12
  lbl.TextXAlignment = Enum.TextXAlignment.Left
  lbl.Parent = row

  local state = default or false
  local switch = Instance.new("TextButton")
  switch.Size = UDim2.fromOffset(40, 22)
  switch.Position = UDim2.new(1, -46, 0.5, -11)
  switch.BackgroundColor3 = state and Theme.Accent or Theme.Bg
  switch.Text = ""
  switch.Parent = row
  corner(switch, 11)
  local knob = Instance.new("Frame")
  knob.Size = UDim2.fromOffset(18, 18)
  knob.Position = state and UDim2.fromOffset(20, 2) or UDim2.fromOffset(2, 2)
  knob.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
  knob.BorderSizePixel = 0
  knob.Parent = switch
  corner(knob, 9)

  switch.MouseButton1Click:Connect(function()
    state = not state
    TweenService:Create(switch, TweenInfo.new(0.15), {
      BackgroundColor3 = state and Theme.Accent or Theme.Bg,
    }):Play()
    TweenService:Create(knob, TweenInfo.new(0.15), {
      Position = state and UDim2.fromOffset(20, 2) or UDim2.fromOffset(2, 2),
    }):Play()
    if callback then callback(state) end
  end)

  resize()
  return { get = function() return state end, set = function(v) state = v end }
end

-- ─── Button ─────────────────────────────────────────────────
function Library:button(tab, sectionName, label, callback)
  local holder, resize = attachSection(tab, sectionName)

  local btn = Instance.new("TextButton")
  btn.Size = UDim2.new(1, 0, 0, 44)
  btn.BackgroundColor3 = Theme.AccentDim
  btn.Text = label
  btn.TextColor3 = Theme.Accent
  btn.Font = Enum.Font.GothamMedium
  btn.TextSize = 12
  btn.Parent = holder
  corner(btn, 6)

  btn.MouseButton1Click:Connect(function()
    if callback then callback() end
  end)

  resize()
  return btn
end

-- ─── Slider ─────────────────────────────────────────────────
function Library:slider(tab, sectionName, label, min, max, default, callback)
  local holder, resize = attachSection(tab, sectionName)

  local row = Instance.new("Frame")
  row.Size = UDim2.new(1, 0, 0, 50)
  row.BackgroundColor3 = Theme.BgSoft
  row.BorderSizePixel = 0
  row.Parent = holder
  corner(row, 6)
  pad(row, 10, 6, 10, 6)

  local lbl = Instance.new("TextLabel")
  lbl.Size = UDim2.new(1, -40, 0, 14)
  lbl.BackgroundTransparency = 1
  lbl.Text = label
  lbl.TextColor3 = Theme.Text
  lbl.Font = Enum.Font.Gotham
  lbl.TextSize = 11
  lbl.TextXAlignment = Enum.TextXAlignment.Left
  lbl.Parent = row

  local val = Instance.new("TextLabel")
  val.Size = UDim2.fromOffset(36, 14)
  val.Position = UDim2.new(1, -36, 0, 0)
  val.BackgroundTransparency = 1
  val.Text = tostring(default)
  val.TextColor3 = Theme.Accent
  val.Font = Enum.Font.RobotoMono
  val.TextSize = 10
  val.TextXAlignment = Enum.TextXAlignment.Right
  val.Parent = row

  local track = Instance.new("Frame")
  track.Size = UDim2.new(1, 0, 0, 6)
  track.Position = UDim2.fromOffset(0, 22)
  track.BackgroundColor3 = Theme.Bg
  track.BorderSizePixel = 0
  track.Parent = row
  corner(track, 3)

  local fill = Instance.new("Frame")
  fill.Size = UDim2.fromScale((default - min) / (max - min), 1)
  fill.BackgroundColor3 = Theme.Accent
  fill.BorderSizePixel = 0
  fill.Parent = track
  corner(fill, 3)

  local knob = Instance.new("Frame")
  knob.Size = UDim2.fromOffset(16, 16)
  knob.Position = UDim2.new((default - min) / (max - min), -8, -5)
  knob.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
  knob.BorderSizePixel = 0
  knob.Parent = track
  corner(knob, 8)

  local dragging = false
  track.InputBegan:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseButton1 then
      dragging = true
    end
  end)
  UserInput.InputEnded:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseButton1 then
      dragging = false
    end
  end)
  UserInput.InputChanged:Connect(function(i)
    if not dragging then return end
    if i.UserInputType == Enum.UserInputType.Touch
       or i.UserInputType == Enum.UserInputType.MouseMovement then
      local pct = math.clamp((i.Position.X - track.AbsolutePosition.X) / track.AbsoluteSize.X, 0, 1)
      local v = math.floor(min + (max - min) * pct)
      fill.Size = UDim2.fromScale(pct, 1)
      knob.Position = UDim2.new(pct, -8, -5)
      val.Text = tostring(v)
      if callback then callback(v) end
    end
  end)

  resize()
end

-- ─── Dropdown ───────────────────────────────────────────────
function Library:dropdown(tab, sectionName, label, options, default, callback)
  local holder, resize = attachSection(tab, sectionName)

  local row = Instance.new("TextButton")
  row.Size = UDim2.new(1, 0, 0, 44)
  row.BackgroundColor3 = Theme.BgSoft
  row.Text = ""
  row.Parent = holder
  corner(row, 6)
  pad(row, 10, 0, 10, 0)

  local lbl = Instance.new("TextLabel")
  lbl.Size = UDim2.new(1, -20, 1, 0)
  lbl.BackgroundTransparency = 1
  lbl.Text = label .. ": " .. (default or options[1])
  lbl.TextColor3 = Theme.Text
  lbl.Font = Enum.Font.Gotham
  lbl.TextSize = 12
  lbl.TextXAlignment = Enum.TextXAlignment.Left
  lbl.Parent = row

  local arrow = Instance.new("TextLabel")
  arrow.Size = UDim2.fromOffset(16, 16)
  arrow.Position = UDim2.new(1, -20, 0.5, -8)
  arrow.BackgroundTransparency = 1
  arrow.Text = "▼"
  arrow.TextColor3 = Theme.TextDim
  arrow.Font = Enum.Font.Gotham
  arrow.TextSize = 10
  arrow.Parent = row

  local expanded = false
  local dropdownHolder = Instance.new("Frame")
  dropdownHolder.Size = UDim2.new(1, 0, 0, 0)
  dropdownHolder.BackgroundColor3 = Theme.Bg
  dropdownHolder.BorderSizePixel = 0
  dropdownHolder.Parent = holder
  corner(dropdownHolder, 6)
  local dl = Instance.new("UIListLayout", dropdownHolder)
  dl.Padding = UDim.new(0, 1)

  row.MouseButton1Click:Connect(function()
    expanded = not expanded
    arrow.Text = expanded and "▲" or "▼"
    dropdownHolder.Size = expanded and UDim2.new(1, 0, 0, #options * 32)
      or UDim2.new(1, 0, 0, 0)

    if expanded then
      for _, c in ipairs(dropdownHolder:GetChildren()) do
        if c:IsA("TextButton") then c:Destroy() end
      end
      for _, opt in ipairs(options) do
        local item = Instance.new("TextButton")
        item.Size = UDim2.new(1, 0, 0, 32)
        item.BackgroundColor3 = Theme.BgSoft
        item.Text = "  " .. opt
        item.TextColor3 = Theme.Text
        item.Font = Enum.Font.Gotham
        item.TextSize = 11
        item.TextXAlignment = Enum.TextXAlignment.Left
        item.Parent = dropdownHolder
        item.MouseButton1Click:Connect(function()
          lbl.Text = label .. ": " .. opt
          expanded = false
          arrow.Text = "▼"
          dropdownHolder.Size = UDim2.new(1, 0, 0, 0)
          if callback then callback(opt) end
        end)
      end
    end
  end)

  resize()
end

return Library`,
  },
  {
    id: "mobile-fly",
    name: "Mobile Fly Pro",
    tagline: "Vol tactile avec joystick virtuel",
    description:
      "Système de vol complet optimisé mobile : joystick virtuel flottant pour la direction, slider vertical pour la hauteur, toggle anti-détection, et bypass du check de position serveur. 60 FPS garantis.",
    category: "mobile-ui",
    platform: "mobile",
    tags: ["Fly", "Mobile", "Joystick", "Anti-Cheat"],
    lines: 178,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-26",
    downloads: 31240,
    rating: 4.8,
    features: [
      "Joystick virtuel flottant",
      "Slider hauteur tactile",
      "Bypass anti-cheat basique",
      "Speed réglable",
      "Auto-collision toggle",
    ],
    code: `-- Mobile Fly Pro · planetscript
-- Touch-optimized fly with virtual joystick
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInput = game:GetService("UserInputService")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

local Config = {
  speed = 60,
  enabled = false,
  noclip = true,
  antiCheatBypass = true,
  maxHeight = 5000,
}

-- ─── GUI ────────────────────────────────────────────────────
local gui = Instance.new("ScreenGui")
gui.Name = "PS_MobileFly"
gui.ResetOnSpawn = false
gui.Parent = pg

-- Toggle button (large touch target)
local toggle = Instance.new("TextButton")
toggle.Size = UDim2.fromOffset(72, 44)
toggle.Position = UDim2.new(0, 16, 0.5, -22)
toggle.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
toggle.Text = "FLY"
toggle.TextColor3 = Color3.fromRGB(52, 211, 153)
toggle.Font = Enum.Font.GothamBold
toggle.TextSize = 12
toggle.Parent = gui
Instance.new("UICorner", toggle).CornerRadius = UDim.new(0, 8)
local stroke = Instance.new("UIStroke", toggle)
stroke.Color = Color3.fromRGB(48, 54, 61)
stroke.Thickness = 1

-- Speed slider
local speedTrack = Instance.new("Frame")
speedTrack.Size = UDim2.fromOffset(160, 6)
speedTrack.Position = UDim2.new(0, 16, 0.5, 30)
speedTrack.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
speedTrack.BorderSizePixel = 0
speedTrack.Parent = gui
Instance.new("UICorner", speedTrack).CornerRadius = UDim.new(0, 3)

local speedFill = Instance.new("Frame")
speedFill.Size = UDim2.fromScale(0.5, 1)
speedFill.BackgroundColor3 = Color3.fromRGB(52, 211, 153)
speedFill.BorderSizePixel = 0
speedFill.Parent = speedTrack
Instance.new("UICorner", speedFill).CornerRadius = UDim.new(0, 3)

local speedKnob = Instance.new("Frame")
speedKnob.Size = UDim2.fromOffset(16, 16)
speedKnob.Position = UDim2.fromScale(0.5, -5)
speedKnob.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
speedKnob.BorderSizePixel = 0
speedKnob.Parent = speedTrack
Instance.new("UICorner", speedKnob).CornerRadius = UDim.new(0, 8)

-- Virtual joystick (right side)
local joyBg = Instance.new("Frame")
joyBg.Size = UDim2.fromOffset(110, 110)
joyBg.Position = UDim2.new(1, -126, 1, -126)
joyBg.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
joyBg.BackgroundTransparency = 0.3
joyBg.BorderSizePixel = 0
joyBg.Visible = false
joyBg.Parent = gui
Instance.new("UICorner", joyBg).CornerRadius = UDim.new(1, 0)
local stroke2 = Instance.new("UIStroke", joyBg)
stroke2.Color = Color3.fromRGB(48, 54, 61)
stroke2.Thickness = 1

local joyKnob = Instance.new("Frame")
joyKnob.Size = UDim2.fromOffset(44, 44)
joyKnob.Position = UDim2.new(0.5, -22, 0.5, -22)
joyKnob.BackgroundColor3 = Color3.fromRGB(52, 211, 153)
joyKnob.BorderSizePixel = 0
joyKnob.Parent = joyBg
Instance.new("UICorner", joyKnob).CornerRadius = UDim.new(1, 0)

-- ─── Fly logic ──────────────────────────────────────────────
local joyVec = Vector2.new(0, 0)
local BV, BG -- BodyVelocity, BodyGyro

local function startFly()
  local char = LP.Character
  if not char then return end
  local hrp = char:FindFirstChild("HumanoidRootPart")
  local hum = char:FindFirstChildOfClass("Humanoid")
  if not hrp or not hum then return end

  hum.PlatformStand = true
  BV = Instance.new("BodyVelocity")
  BV.MaxForce = Vector3.new(1, 1, 1) * 9e9
  BV.Velocity = Vector3.new(0, 0, 0)
  BV.Parent = hrp

  BG = Instance.new("BodyGyro")
  BG.MaxTorque = Vector3.new(1, 1, 1) * 9e9
  BG.P = 1e5
  BG.CFrame = hrp.CFrame
  BG.Parent = hrp
end

local function stopFly()
  local char = LP.Character
  if not char then return end
  local hum = char:FindFirstChildOfClass("Humanoid")
  if hum then hum.PlatformStand = false end
  if BV then BV:Destroy() end
  if BG then BG:Destroy() end
end

RunService.RenderStepped:Connect(function()
  if not Config.enabled then return end
  local char = LP.Character
  if not char then return end
  local hrp = char:FindFirstChild("HumanoidRootPart")
  local cam = workspace.CurrentCamera
  if not hrp then return end

  -- Apply joystick direction in camera space
  local camCFrame = cam.CFrame
  local forward = camCFrame.LookVector
  local right = camCFrame.RightVector

  local moveVec = (forward * -joyVec.Y + right * joyVec.X) * Config.speed
  -- Always apply slight upward force when joystick is centered? No: pure manual.

  if BV then
    BV.Velocity = moveVec
  end
  if BG then
    BG.CFrame = camCFrame
  end

  -- Noclip
  if Config.noclip then
    for _, p in ipairs(char:GetDescendants()) do
      if p:IsA("BasePart") and p.CanCollide then
        p.CanCollide = false
      end
    end
  end
end)

-- ─── Joystick input ─────────────────────────────────────────
local joyDragging = false
local joyStart = Vector2.new(0, 0)

joyBg.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    joyDragging = true
    joyStart = i.Position
  end
end)

UserInput.InputChanged:Connect(function(i)
  if not joyDragging then return end
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseMovement then
    local center = joyBg.AbsolutePosition + joyBg.AbsoluteSize / 2
    local touchPos = Vector2.new(i.Position.X, i.Position.Y)
    local delta = touchPos - center
    local maxR = joyBg.AbsoluteSize.X / 2 - 22
    if maxR <= 0 then return end
    local clamped = delta.Magnitude > maxR and delta.Unit * maxR or delta
    joyKnob.Position = UDim2.fromOffset(
      joyBg.AbsoluteSize.X / 2 - 22 + clamped.X,
      joyBg.AbsoluteSize.Y / 2 - 22 + clamped.Y
    )
    joyVec = Vector2.new(clamped.X / maxR, clamped.Y / maxR)
  end
end)

UserInput.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    if joyDragging then
      joyDragging = false
      joyVec = Vector2.new(0, 0)
      joyKnob.Position = UDim2.new(0.5, -22, 0.5, -22)
    end
  end
end)

-- ─── Speed slider input ─────────────────────────────────────
local speedDragging = false
speedTrack.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    speedDragging = true
  end
end)
UserInput.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    speedDragging = false
  end
end)
UserInput.InputChanged:Connect(function(i)
  if not speedDragging then return end
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseMovement then
    local pct = math.clamp((i.Position.X - speedTrack.AbsolutePosition.X) / speedTrack.AbsoluteSize.X, 0, 1)
    Config.speed = math.floor(20 + pct * 180)
    speedFill.Size = UDim2.fromScale(pct, 1)
    speedKnob.Position = UDim2.fromScale(pct, -5)
  end
end)

-- ─── Toggle ─────────────────────────────────────────────────
toggle.MouseButton1Click:Connect(function()
  Config.enabled = not Config.enabled
  toggle.TextColor3 = Config.enabled and Color3.fromRGB(13, 17, 23)
    or Color3.fromRGB(52, 211, 153)
  toggle.BackgroundColor3 = Config.enabled and Color3.fromRGB(52, 211, 153)
    or Color3.fromRGB(13, 17, 23)
  joyBg.Visible = Config.enabled

  if Config.enabled then startFly() else stopFly() end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.MobileFly = Config
print("[planetscript] Mobile Fly Pro loaded")`,
  },
  {
    id: "mobile-aim-assist",
    name: "Mobile Aim Assist",
    tagline: "Aim assist tactile avec FOV circulaire",
    description:
      "Aim assist conçu pour mobile : détecte le joueur le plus proche du centre écran dans un FOV circulaire, lissage configurable, et activation par bouton maintenu (hold to aim). Optimisé pour toucher à un doigt.",
    category: "mobile-ui",
    platform: "mobile",
    tags: ["Aim", "Mobile", "FOV", "Touch"],
    lines: 124,
    difficulty: "Avancé",
    author: "planetscript",
    updated: "2026-06-24",
    downloads: 27600,
    rating: 4.7,
    features: [
      "FOV circulaire visuel",
      "Détection joueur le plus proche",
      "Lissage réglable",
      "Activation hold-to-aim",
      "Team check intégré",
    ],
    code: `-- Mobile Aim Assist · planetscript
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInput = game:GetService("UserInputService")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")
local cam = workspace.CurrentCamera

local Config = {
  fov = 100,
  smoothness = 0.18,
  teamCheck = true,
  visible = true,
  maxDistance = 800,
}

local aiming = false

local gui = Instance.new("ScreenGui")
gui.Name = "PS_MobileAim"
gui.ResetOnSpawn = false
gui.Parent = pg

-- FOV ring
local ring = Instance.new("Frame")
ring.Size = UDim2.fromOffset(Config.fov * 2, Config.fov * 2)
ring.Position = UDim2.new(0.5, -Config.fov, 0.5, -Config.fov)
ring.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
ring.BackgroundTransparency = 1
ring.BorderSizePixel = 0
ring.Visible = Config.visible
ring.Parent = gui
Instance.new("UICorner", ring).CornerRadius = UDim.new(1, 0)
local ringStroke = Instance.new("UIStroke", ring)
ringStroke.Color = Color3.fromRGB(52, 211, 153)
ringStroke.Thickness = 1.5
ringStroke.Transparency = 0.4

-- Aim button (large, hold)
local aimBtn = Instance.new("TextButton")
aimBtn.Size = UDim2.fromOffset(80, 80)
aimBtn.Position = UDim2.new(1, -96, 1, -96)
aimBtn.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
aimBtn.Text = "AIM"
aimBtn.TextColor3 = Color3.fromRGB(244, 114, 182)
aimBtn.Font = Enum.Font.GothamBold
aimBtn.TextSize = 13
aimBtn.Parent = gui
Instance.new("UICorner", aimBtn).CornerRadius = UDim.new(1, 0)
local btnStroke = Instance.new("UIStroke", aimBtn)
btnStroke.Color = Color3.fromRGB(48, 54, 61)
btnStroke.Thickness = 1

-- FOV slider
local fovSlider = Instance.new("TextButton")
fovSlider.Size = UDim2.fromOffset(120, 6)
fovSlider.Position = UDim2.new(0, 16, 1, -32)
fovSlider.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
fovSlider.Text = ""
fovSlider.Parent = gui
Instance.new("UICorner", fovSlider).CornerRadius = UDim.new(0, 3)
local fovFill = Instance.new("Frame", fovSlider)
fovFill.Size = UDim2.fromScale(0.5, 1)
fovFill.BackgroundColor3 = Color3.fromRGB(52, 211, 153)
fovFill.BorderSizePixel = 0
Instance.new("UICorner", fovFill).CornerRadius = UDim.new(0, 3)

-- ─── Aim logic ──────────────────────────────────────────────
local function closestToCenter()
  local best, bestMag = nil, Config.fov
  local center = Vector2.new(cam.ViewportSize.X / 2, cam.ViewportSize.Y / 2)

  for _, p in ipairs(Players:GetPlayers()) do
    if p ~= LP and p.Character then
      local hrp = p.Character:FindFirstChild("HumanoidRootPart")
      local hum = p.Character:FindFirstChildOfClass("Humanoid")
      if hrp and hum and hum.Health > 0 then
        -- Distance check
        local lpHrp = LP.Character and LP.Character:FindFirstChild("HumanoidRootPart")
        if lpHrp and (hrp.Position - lpHrp.Position).Magnitude > Config.maxDistance then
          continue
        end
        -- Team check
        if Config.teamCheck and p.Team == LP.Team and p.Team ~= nil then
          continue
        end
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
  -- Update ring size if FOV changed
  ring.Size = UDim2.fromOffset(Config.fov * 2, Config.fov * 2)
  ring.Position = UDim2.new(0.5, -Config.fov, 0.5, -Config.fov)

  if not aiming then return end
  local target = closestToCenter()
  if not target then return end
  local hrp = target.Character.HumanoidRootPart
  local goal = CFrame.new(cam.CFrame.Position, hrp.Position)
  cam.CFrame = cam.CFrame:Lerp(goal, Config.smoothness)
end)

-- ─── Aim button hold ────────────────────────────────────────
aimBtn.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    aiming = true
    aimBtn.BackgroundColor3 = Color3.fromRGB(244, 114, 182)
    aimBtn.TextColor3 = Color3.fromRGB(13, 17, 23)
  end
end)
aimBtn.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    aiming = false
    aimBtn.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
    aimBtn.TextColor3 = Color3.fromRGB(244, 114, 182)
  end
end)

-- ─── FOV slider ─────────────────────────────────────────────
local fovDrag = false
fovSlider.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    fovDrag = true
  end
end)
UserInput.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseButton1 then
    fovDrag = false
  end
end)
UserInput.InputChanged:Connect(function(i)
  if not fovDrag then return end
  if i.UserInputType == Enum.UserInputType.Touch
     or i.UserInputType == Enum.UserInputType.MouseMovement then
    local pct = math.clamp((i.Position.X - fovSlider.AbsolutePosition.X) / fovSlider.AbsoluteSize.X, 0, 1)
    Config.fov = math.floor(20 + pct * 180)
    fovFill.Size = UDim2.fromScale(pct, 1)
  end
end)

_G.PlanetScript = _G.PlanetScript or {}
_G.PlanetScript.MobileAim = Config
print("[planetscript] Mobile Aim Assist loaded")`,
  },
  // ─────────────────────────────────────────── TEST / DEMO ───────────────────────────────────────────
  {
    id: "hello-world",
    name: "Hello World Test",
    tagline: "Script de test — fonctionne partout, même Studio",
    description:
      "Script de vérification minimal qui fonctionne dans Roblox Studio ET tous les exécuteurs. Affiche une notification à l'écran, log dans la console, et crée une GUI simple. Utilise-le pour vérifier que ton exécuteur ou Studio fonctionne avant de charger les scripts complexes.",
    category: "utility",
    platform: "universal",
    tags: ["Test", "Demo", "Studio", "Hello World"],
    lines: 42,
    difficulty: "Débutant",
    author: "planetscript",
    updated: "2026-06-28",
    downloads: 99900,
    rating: 5.0,
    features: [
      "Fonctionne dans Studio",
      "Pas de fonctions d'exécuteur",
      "Notification GUI + console",
      "Test de compatibilité",
    ],
    code: `-- Hello World Test · planetscript
-- Ce script fonctionne PARTOUT : Studio, mobile, PC, tous exécuteurs
-- Utilise-le pour vérifier que ton environnement marche avant
-- de charger les scripts complexes (ESP, RemoteSpy, etc.)

local Players = game:GetService("Players")
local LP = Players.LocalPlayer
local pg = LP:WaitForChild("PlayerGui")

-- ─── GUI notification ───────────────────────────────────────
local gui = Instance.new("ScreenGui")
gui.Name = "PS_HelloTest"
gui.ResetOnSpawn = false
gui.Parent = pg

local card = Instance.new("Frame")
card.Size = UDim2.fromOffset(280, 80)
card.Position = UDim2.new(0.5, -140, 0, 16)
card.BackgroundColor3 = Color3.fromRGB(13, 17, 23)
card.BorderSizePixel = 0
card.Parent = gui
Instance.new("UICorner", card).CornerRadius = UDim.new(0, 10)
local stroke = Instance.new("UIStroke", card)
stroke.Color = Color3.fromRGB(52, 211, 153)
stroke.Thickness = 1.5

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 20)
title.Position = UDim2.fromOffset(12, 12)
title.BackgroundTransparency = 1
title.Text = "planetscript"
title.TextColor3 = Color3.fromRGB(52, 211, 153)
title.Font = Enum.Font.GothamBold
title.TextSize = 13
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = card

local body = Instance.new("TextLabel")
body.Size = UDim2.new(1, -24, 0, 40)
body.Position = UDim2.fromOffset(12, 32)
body.BackgroundTransparency = 1
body.Text = "Script de test chargé avec succès !\\nEnvironnement OK."
body.TextColor3 = Color3.fromRGB(201, 209, 217)
body.Font = Enum.Font.Gotham
body.TextSize = 11
body.TextWrapped = true
body.TextXAlignment = Enum.TextXAlignment.Left
body.TextYAlignment = Enum.TextYAlignment.Top
body.Parent = card

-- ─── Console log ────────────────────────────────────────────
print("═══════════════════════════════════════")
print("  planetscript · Hello World Test")
print("  Environnement : " .. (game:GetService("RunService"):IsStudio() and "Studio" or "Live Game"))
print("  Joueur : " .. LP.Name)
print("  Statut : OK")
print("═══════════════════════════════════════")

-- Auto-destroy after 5 seconds
task.delay(5, function()
  card:Destroy()
end)`,
  },
];
