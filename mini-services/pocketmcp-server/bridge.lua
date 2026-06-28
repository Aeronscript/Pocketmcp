-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge v2 · by Aeronscript (Mohamed Amine)
-- Auto-servi par le serveur sur /script.luau
--
-- Features :
--   - Auto-fallback request → HttpGet/HttpPost (Delta/Hydrogen proof)
--   - execute_code (capture prints)
--   - decompile_script (require decompile() function)
--   - get_instances (CSS-like selector: game.X.Y.*)
--   - spy_remotes (hook FireServer / InvokeServer)
--   - list_remotes (retourne le cache des remotes interceptés)
--   - click_gui (clique sur un TextButton par path)
--   - screenshot (capture viewport via Roblox API)
--   - get_player_info (infos sur un joueur)
-- ════════════════════════════════════════════════════════════

local BRIDGE_URL = getgenv().BridgeURL or "localhost:16384"
local USE_WEBSOCKET = not getgenv().DisableWebSocket
local POLL_INTERVAL = 0.2
local REQUEST_TIMEOUT = 10

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local UserInput = game:GetService("UserInputService")
local LP = Players.LocalPlayer

-- ─── État ───────────────────────────────────────────────────
local state = {
    connected = false,
    clientId = "cli_" .. tostring(math.random(1000, 9999)),
    transport = USE_WEBSOCKET and "WebSocket" or "HTTP Polling",
    -- Auto-fallback: si request() échoue, on bascule sur HttpGet/HttpPost
    httpMode = "request",  -- "request" | "httpget" | "httpfailed"
    requestFailures = 0,
    -- Spy state
    spyEnabled = false,
    spyFilter = nil,
    remotesLog = {},       -- {name, kind, path, args, time}
    remotesCount = {},     -- [name] = int
    maxRemotesLog = 200,
}

-- ─── HTTP wrapper avec auto-fallback ────────────────────────
-- Essaie request() d'abord. Si ça échoue plusieurs fois, bascule sur HttpGet/HttpPost.
local function httpSend(method, path, data)
    local url = "http://" .. BRIDGE_URL .. path
    local body = data and HttpService:JSONEncode(data) or nil

    -- Mode 1: request()
    if state.httpMode == "request" and request then
        local ok, res = pcall(function()
            return request({
                Url = url,
                Method = method,
                Headers = { ["Content-Type"] = "application/json" },
                Body = body or "",
                Timeout = REQUEST_TIMEOUT,
            })
        end)
        if ok and res and res.Body then
            state.requestFailures = 0
            local parsed = nil
            pcall(function() parsed = HttpService:JSONDecode(res.Body) end)
            return parsed or { ok = false, rawBody = res.Body }
        else
            state.requestFailures = state.requestFailures + 1
            warn("[pocketmcp] request() failed (" .. state.requestFailures .. "/3): " .. tostring(res))
            if state.requestFailures >= 3 then
                state.httpMode = "httpget"
                warn("[pocketmcp] bascule en mode HttpGet/HttpPost (fallback)")
                print("[pocketmcp] request instable, utilisation de game:HttpGet à la place")
            end
        end
    end

    -- Mode 2: HttpGet / HttpPost (fallback, contourne l'exécuteur)
    if state.httpMode == "httpget" or state.httpMode == "request" then
        if method == "GET" then
            local ok, res = pcall(function()
                return game:HttpGet(url, true)
            end)
            if ok then
                state.httpMode = "httpget"
                local parsed = nil
                pcall(function() parsed = HttpService:JSONDecode(res) end)
                return parsed or { ok = false, rawBody = res }
            end
            -- HttpGet a échoué aussi
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpGet failed: " .. tostring(res) }
        elseif method == "POST" then
            -- HttpPost est deprecated mais marche sur la plupart des exécuteurs
            local ok, res = pcall(function()
                return game:HttpPost(url, body or "", "application/json")
            end)
            if ok then
                state.httpMode = "httpget"
                local parsed = nil
                pcall(function() parsed = HttpService:JSONDecode(res) end)
                return parsed or { ok = false, rawBody = res }
            end
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpPost failed: " .. tostring(res) }
        end
    end

    -- Mode 3: tout a échoué
    return { ok = false, error = "All HTTP methods failed (request + HttpGet + HttpPost)" }
end

-- Helper POST
local function post(path, data)
    return httpSend("POST", path, data)
end

-- Helper GET
local function get(path)
    return httpSend("GET", path, nil)
end

-- ─── Capture des prints ─────────────────────────────────────
local function capturePrints(fn)
    local logs = {}
    local oldPrint, oldWarn = print, warn

    print = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            table.insert(parts, tostring(select(i, ...)))
        end
        table.insert(logs, table.concat(parts, "\t"))
    end
    warn = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            table.insert(parts, tostring(select(i, ...)))
        end
        table.insert(logs, "[WARN] " .. table.concat(parts, "\t"))
    end

    local ok, result = pcall(fn)
    print, warn = oldPrint, oldWarn
    return ok, result, logs
end

-- ─── Handlers de commandes ──────────────────────────────────

-- execute_code
local function handleExecute(cmd)
    local fn, err = loadstring(cmd.code)
    if not fn then
        return { ok = false, error = err, logs = {} }
    end
    local ok, result, logs = capturePrints(fn)
    return {
        ok = ok,
        result = tostring(result),
        error = not ok and tostring(result) or nil,
        logs = logs,
    }
end

-- decompile_script (path: "ReplicatedStorage.Modules.Shop")
local function handleDecompile(cmd)
    if not decompile then
        return { ok = false, error = "decompile() not available on this executor" }
    end
    local target = game
    for part in string.gmatch(cmd.path, "[^.]+") do
        if part ~= "game" then
            target = target:FindFirstChild(part)
            if not target then
                return { ok = false, error = "Path not found: " .. cmd.path .. " (stopped at " .. part .. ")" }
            end
        end
    end
    if not target:IsA("LocalScript") and not target:IsA("ModuleScript") then
        return { ok = false, error = "Target is not a script: " .. target.ClassName }
    end
    local ok, src = pcall(decompile, target)
    if not ok then
        return { ok = false, error = "Decompile failed: " .. tostring(src) }
    end
    return { ok = true, source = src, lines = #string.split(src, "\n") }
end

-- get_instances (selector: "game.ReplicatedStorage.Remotes.*")
local function handleGetInstances(cmd)
    local selector = cmd.selector or "game"
    -- Strip "game." prefix
    selector = selector:gsub("^game%.", ""):gsub("^game$", "")

    if selector == "" then
        -- List root children
        local results = {}
        for _, child in ipairs(game:GetChildren()) do
            table.insert(results, {
                name = child.Name,
                class = child.ClassName,
                path = child:GetFullName(),
                children = #child:GetChildren(),
            })
        end
        return { ok = true, instances = results, count = #results }
    end

    -- Walk path
    local current = game
    local parts = {}
    for p in string.gmatch(selector, "[^.]+") do
        table.insert(parts, p)
    end

    for i, p in ipairs(parts) do
        if p == "*" then
            -- Wildcard: list all children of current
            local results = {}
            for _, child in ipairs(current:GetChildren()) do
                table.insert(results, {
                    name = child.Name,
                    class = child.ClassName,
                    path = child:GetFullName(),
                    children = #child:GetChildren(),
                })
            end
            return { ok = true, instances = results, count = #results }
        end
        current = current:FindFirstChild(p)
        if not current then
            return { ok = false, error = "Not found at: " .. table.concat(parts, ".", 1, i) }
        end
    end

    -- Single instance
    return {
        ok = true,
        instances = {
            {
                name = current.Name,
                class = current.ClassName,
                path = current:GetFullName(),
                children = #current:GetChildren(),
            },
        },
        count = 1,
    }
end

-- spy_remotes (enabled: bool, filter: string?)
local function handleSpyRemotes(cmd)
    state.spyEnabled = cmd.enabled
    state.spyFilter = cmd.filter
    if cmd.enabled and not state._spyHooked then
        state._spyHooked = true
        local mt = getrawmetatable(game)
        setreadonly(mt, false)
        local old = mt.__namecall
        mt.__namecall = newcclosure(function(self, ...)
            local m = getnamecallmethod()
            if state.spyEnabled and (m == "FireServer" or m == "InvokeServer")
               and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
                local name = self:GetDebugName()
                if not state.spyFilter or name:lower():find(state.spyFilter:lower()) then
                    state.remotesCount[name] = (state.remotesCount[name] or 0) + 1
                    table.insert(state.remotesLog, {
                        name = name,
                        kind = m,
                        path = self:GetFullName(),
                        args = {...},
                        time = os.time(),
                    })
                    if #state.remotesLog > state.maxRemotesLog then
                        table.remove(state.remotesLog, 1)
                    end
                end
            end
            return old(self, ...)
        end)
        print("[pocketmcp] remote spy hooké")
    end
    return {
        ok = true,
        enabled = state.spyEnabled,
        filter = state.spyFilter,
        message = state.spyEnabled and "spy activé" or "spy désactivé",
    }
end

-- list_remotes (limit: int?)
local function handleListRemotes(cmd)
    local limit = cmd.limit or 50
    local summary = {}
    for name, count in pairs(state.remotesCount) do
        table.insert(summary, { name = name, count = count })
    end
    table.sort(summary, function(a, b) return a.count > b.count end)

    local recent = {}
    for i = math.max(1, #state.remotesLog - limit + 1), #state.remotesLog do
        if state.remotesLog[i] then
            local entry = state.remotesLog[i]
            table.insert(recent, {
                name = entry.name,
                kind = entry.kind,
                path = entry.path,
                argsCount = #entry.args,
                time = entry.time,
            })
        end
    end

    return {
        ok = true,
        summary = summary,
        totalUnique = #summary,
        totalFires = #state.remotesLog,
        recent = recent,
    }
end

-- click_gui (path: "StarterGui.ScreenGui.Frame.Button")
local function handleClickGui(cmd)
    local target = game
    for part in string.gmatch(cmd.path, "[^.]+") do
        if part ~= "game" then
            target = target:FindFirstChild(part)
            if not target then
                return { ok = false, error = "GUI path not found: " .. cmd.path }
            end
        end
    end
    if not target:IsA("TextButton") and not target:IsA("ImageButton") and not target:IsA("Button") then
        return { ok = false, error = "Target is not clickable: " .. target.ClassName }
    end
    -- Fire GuiButton interactions
    local ok = pcall(function()
        -- Simule un click via les signals GuiButton
        if target.Activated then
            firebuttonclick and firebuttonclick(target)
        end
        -- Fallback: fire MouseButton1Click directly
        if firesignal then
            firesignal(target.MouseButton1Click)
        else
          -- Last resort: call the handler if exposed
          target:FindFirstChild("MouseButton1Click") and firesignal(target.MouseButton1Click)
        end
    end)
    return { ok = ok, clicked = target.Name, path = target:GetFullName() }
end

-- screenshot (capture viewport)
local function handleScreenshot(cmd)
    -- Méthode 1: ScreenshotWorkspace (some executors)
    if ScreenshotWorkspace then
        local ok, path = pcall(ScreenshotWorkspace)
        if ok then
            return { ok = true, path = path, method = "ScreenshotWorkspace" }
        end
    end
    -- Méthode 2: Capture dans un ViewportFrame et encode
    -- (limité mais marche partout)
    local viewport = Instance.new("ViewportFrame")
    viewport.Size = UDim2.fromOffset(800, 450)
    local cam = workspace.CurrentCamera
    viewport.CurrentCamera = cam
    -- On peut pas vraiment capturer en base64 sans API externe
    viewport:Destroy()
    return {
        ok = false,
        error = "Screenshot non supporté sur cet exécuteur. ScreenshotWorkspace() requis.",
        hint = "Utilise decompile_script + execute_code pour inspecter le GUI à la place.",
    }
end

-- get_player_info (playerName: string?)
local function handleGetPlayerInfo(cmd)
    local target
    if cmd.playerName and cmd.playerName ~= "" then
        target = Players:FindFirstChild(cmd.playerName)
    else
        target = LP
    end
    if not target then
        return { ok = false, error = "Player not found: " .. (cmd.playerName or "?") }
    end
    local char = target.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    return {
        ok = true,
        info = {
            name = target.Name,
            displayName = target.DisplayName,
            userId = target.UserId,
            team = target.Team and target.Team.Name or "None",
            health = hum and hum.Health or 0,
            maxHealth = hum and hum.MaxHealth or 0,
            walkSpeed = hum and hum.WalkSpeed or 0,
            position = hrp and { x = hrp.X, y = hrp.Y, z = hrp.Z } or nil,
            characterLoaded = char ~= nil,
        },
    }
end

-- ping
local function handlePing(cmd)
    return { ok = true, pong = os.clock(), httpMode = state.httpMode }
end

-- ─── Dispatch ───────────────────────────────────────────────
local handlers = {
    execute = handleExecute,
    decompile = handleDecompile,
    get_instances = handleGetInstances,
    spy_remotes = handleSpyRemotes,
    list_remotes = handleListRemotes,
    click_gui = handleClickGui,
    screenshot = handleScreenshot,
    get_player_info = handleGetPlayerInfo,
    ping = handlePing,
}

local function processCommand(cmd)
    local handler = handlers[cmd.type]
    if not handler then
        return { ok = false, error = "Unknown command type: " .. cmd.type }
    end
    local ok, result = pcall(handler, cmd)
    if not ok then
        return { ok = false, error = "Handler crashed: " .. tostring(result) }
    end
    return result
end

-- ─── Enregistrement ─────────────────────────────────────────
local function register()
    local res = post("/api/register", {
        clientId = state.clientId,
        playerName = LP.Name,
        userId = LP.UserId,
        placeId = game.PlaceId,
        jobId = game.JobId,
        transport = state.transport,
        executor = identifyexecutor and select(1, identifyexecutor()) or "Unknown",
        supports = {
            decompile = decompile ~= nil,
            drawing = Drawing ~= nil,
            writefile = writefile ~= nil,
            firebuttonclick = firebuttonclick ~= nil,
            firesignal = firesignal ~= nil,
            screenshot = ScreenshotWorkspace ~= nil,
        },
    })
    if res and res.ok then
        state.connected = true
        print("[pocketmcp] connecté · " .. state.clientId .. " · " .. state.transport)
        print("[pocketmcp] http mode: " .. state.httpMode)
    else
        warn("[pocketmcp] échec connexion: " .. (res and res.error or "unknown"))
    end
end

-- ─── Polling ────────────────────────────────────────────────
local function pollCommands()
    local res = post("/api/poll", { clientId = state.clientId })
    if not res or not res.commands then return end
    for _, cmd in ipairs(res.commands) do
        local result = processCommand(cmd)
        post("/api/result", {
            clientId = state.clientId,
            commandId = cmd.id,
            result = result,
        })
    end
end

-- ─── Heartbeat ──────────────────────────────────────────────
task.spawn(function()
    while task.wait(1) do
        if state.connected then
            post("/api/heartbeat", {
                clientId = state.clientId,
                time = os.time(),
                httpMode = state.httpMode,
            })
        end
    end
end)

-- ─── WebSocket ──────────────────────────────────────────────
if USE_WEBSOCKET then
    pcall(function()
        local ws = WebSocket.connect("ws://" .. BRIDGE_URL .. "/ws")
        ws.OnMessage:Connect(function(msg)
            local ok, cmd = pcall(function() return HttpService:JSONDecode(msg) end)
            if not ok or not cmd then return end
            local result = processCommand(cmd)
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

print("[pocketmcp] bridge ready v2 · " .. state.clientId)
print("[pocketmcp] serveur: " .. BRIDGE_URL)
print("[pocketmcp] transport: " .. state.transport)
print("[pocketmcp] http mode: " .. state.httpMode .. " (auto-fallback activé)")
