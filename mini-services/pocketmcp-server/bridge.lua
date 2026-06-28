-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge v3 · by Aeronscript (Mohamed Amine)
-- Auto-servi par le serveur sur /script.luau
--
-- Testé sur Roblox mobile (Delta) :
--   ✅ HttpGet → marche
--   ✅ request → marche (syn.request equiv)
--   ✅ writefile → marche
--   ❌ WebSocket → mort (auto-désactivé)
--
-- Features :
--   - Auto-détection WebSocket au démarrage (essaie 3s, bascule HTTP si échec)
--   - Auto-fallback request → HttpGet/HttpPost
--   - HTTP polling optimisé (100ms, retry exponentiel)
--   - execute_code (capture prints)
--   - decompile_script
--   - get_instances (CSS-like selector)
--   - spy_remotes (hook FireServer / InvokeServer)
--   - list_remotes
--   - click_gui
--   - screenshot
--   - get_player_info
-- ════════════════════════════════════════════════════════════

local BRIDGE_URL = getgenv().BridgeURL or "localhost:16384"
local POLL_MIN = 0.1        -- 100ms (réactif quand commandes en attente)
local POLL_MAX = 1.0        -- 1s cap (idle, négligeable)
local POLL_GROWTH = 1.5     -- facteur de backoff progressif
local POLL_ERROR_GROWTH = 2.0 -- backoff agressif si request échoue
local REQUEST_TIMEOUT = 10
local WS_DETECT_TIMEOUT = 3 -- 3s pour détecter si WebSocket marche

-- Force HTTP polling si l'utilisateur le demande
local FORCE_HTTP = getgenv().DisableWebSocket == true
-- Force WebSocket si l'utilisateur veut tester
local FORCE_WS = getgenv().EnableWebSocket == true

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local LP = Players.LocalPlayer

-- ─── État ───────────────────────────────────────────────────
local state = {
    connected = false,
    clientId = "cli_" .. tostring(math.random(1000, 9999)),
    -- Mode transport : "WebSocket" | "HTTP Polling"
    transport = "HTTP Polling",
    -- Auto-fallback HTTP : "request" | "httpget" | "httpfailed"
    httpMode = "request",
    requestFailures = 0,
    -- Backoff progressif : commence à POLL_MIN, augmente si idle, cap à POLL_MAX
    currentPoll = POLL_MIN,
    -- Spy state
    spyEnabled = false,
    spyFilter = nil,
    remotesLog = {},
    remotesCount = {},
    maxRemotesLog = 200,
}

-- ─── HTTP wrapper avec auto-fallback ────────────────────────
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
            end
        end
    end

    -- Mode 2: HttpGet / HttpPost (contourne l'exécuteur)
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
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpGet failed: " .. tostring(res) }
        elseif method == "POST" then
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

    return { ok = false, error = "All HTTP methods failed" }
end

local function post(path, data) return httpSend("POST", path, data) end
local function get(path) return httpSend("GET", path, nil) end

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
local function handleExecute(cmd)
    local fn, err = loadstring(cmd.code)
    if not fn then return { ok = false, error = err, logs = {} } end
    local ok, result, logs = capturePrints(fn)
    return {
        ok = ok,
        result = tostring(result),
        error = not ok and tostring(result) or nil,
        logs = logs,
    }
end

local function handleDecompile(cmd)
    if not decompile then
        return { ok = false, error = "decompile() not available on this executor" }
    end
    local target = game
    for part in string.gmatch(cmd.path, "[^.]+") do
        if part ~= "game" then
            target = target:FindFirstChild(part)
            if not target then
                return { ok = false, error = "Path not found: " .. cmd.path }
            end
        end
    end
    if not target:IsA("LocalScript") and not target:IsA("ModuleScript") then
        return { ok = false, error = "Target is not a script: " .. target.ClassName }
    end
    local ok, src = pcall(decompile, target)
    if not ok then return { ok = false, error = "Decompile failed: " .. tostring(src) } end
    return { ok = true, source = src, lines = #string.split(src, "\n") }
end

local function handleGetInstances(cmd)
    local selector = cmd.selector or "game"
    selector = selector:gsub("^game%.", ""):gsub("^game$", "")

    if selector == "" then
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

    local current = game
    local parts = {}
    for p in string.gmatch(selector, "[^.]+") do table.insert(parts, p) end

    for i, p in ipairs(parts) do
        if p == "*" then
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
    local ok = pcall(function()
        if firebuttonclick then
            firebuttonclick(target)
        elseif firesignal then
            firesignal(target.MouseButton1Click)
        end
    end)
    return { ok = ok, clicked = target.Name, path = target:GetFullName() }
end

local function handleScreenshot(cmd)
    if ScreenshotWorkspace then
        local ok, path = pcall(ScreenshotWorkspace)
        if ok then
            return { ok = true, path = path, method = "ScreenshotWorkspace" }
        end
    end
    return {
        ok = false,
        error = "Screenshot non supporté sur cet exécuteur",
        hint = "Utilise decompile_script + execute_code pour inspecter le GUI à la place.",
    }
end

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

local function handlePing(cmd)
    return { ok = true, pong = os.clock(), httpMode = state.httpMode, transport = state.transport }
end

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
            webSocket = WebSocket ~= nil,
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

-- ─── Polling HTTP avec backoff progressif ────────────────────
-- 100ms quand commandes en attente (réactif)
-- ×1.5 à chaque poll vide → 100ms → 150ms → 225ms → 337ms → 506ms → 759ms → 1s
-- ×2 si request échoue (backoff agressif)
-- Cap à 1s en idle (1 req/s, négligeable)
-- Reset immédiat à 100ms dès qu'une commande arrive
local function pollCommands()
    local res = post("/api/poll", { clientId = state.clientId })

    -- Échec de la requête → backoff agressif
    if not res then
        state.currentPoll = math.min(state.currentPoll * POLL_ERROR_GROWTH, POLL_MAX)
        return
    end

    local commands = res.commands or {}

    if #commands == 0 then
        -- Pas de commandes → backoff progressif
        state.currentPoll = math.min(state.currentPoll * POLL_GROWTH, POLL_MAX)
        return
    end

    -- Commandes reçues → reset au min (réactif)
    state.currentPoll = POLL_MIN

    for _, cmd in ipairs(commands) do
        local result = processCommand(cmd)
        post("/api/result", {
            clientId = state.clientId,
            commandId = cmd.id,
            result = result,
        })
    end
end

-- ─── Auto-détection WebSocket ───────────────────────────────
-- Essaie WebSocket pendant 3s. Si échec → HTTP polling.
local function tryWebSocket()
    if FORCE_HTTP then
        print("[pocketmcp] WebSocket désactivé manuellement (DisableWebSocket=true)")
        return false
    end
    if not WebSocket then
        print("[pocketmcp] WebSocket API non disponible → HTTP polling")
        return false
    end

    local wsOk = false
    local ws

    pcall(function()
        ws = WebSocket.connect("ws://" .. BRIDGE_URL .. "/ws")
        ws.OnMessage:Connect(function(msg)
            local ok, cmd = pcall(function() return HttpService:JSONDecode(msg) end)
            if not ok or not cmd then return end
            local result = processCommand(cmd)
            if result then
                pcall(function()
                    ws:Send(HttpService:JSONEncode({
                        commandId = cmd.id,
                        result = result,
                    }))
                end)
            end
        end)
        ws.OnClose:Connect(function()
            if state.transport == "WebSocket" then
                warn("[pocketmcp] WebSocket fermé, bascule HTTP polling")
                state.transport = "HTTP Polling"
                startHttpPolling()
            end
        end)
        ws:Connect()
    end)

    -- Attend WS_DETECT_TIMEOUT pour voir si la connexion tient
    local waited = 0
    while waited < WS_DETECT_TIMEOUT do
        task.wait(0.1)
        waited = waited + 0.1
        -- Heuristique simple : si pas d'erreur pcall, on suppose que ça marche
        if ws and pcall(function() return ws:IsConnected() end) then
            wsOk = ws:IsConnected()
            if wsOk then break end
        end
    end

    if wsOk then
        print("[pocketmcp] WebSocket connecté ✓")
        return true
    else
        print("[pocketmcp] WebSocket échec/mort → bascule HTTP polling")
        pcall(function() ws:Close() end)
        return false
    end
end

-- ─── Démarrage HTTP polling (si WebSocket échoue) ──────────
function startHttpPolling()
    if state._httpPollingStarted then return end
    state._httpPollingStarted = true
    task.spawn(function()
        while true do
            if state.connected then
                pollCommands()
            end
            -- Attend currentPoll (variable selon backoff)
            task.wait(state.currentPoll)
        end
    end)
end

-- ─── Heartbeat ──────────────────────────────────────────────
task.spawn(function()
    while task.wait(1) do
        if state.connected then
            post("/api/heartbeat", {
                clientId = state.clientId,
                time = os.time(),
                httpMode = state.httpMode,
                transport = state.transport,
                pollInterval = math.floor(state.currentPoll * 1000),  -- en ms
            })
        end
    end
end)

-- ─── Démarrage ──────────────────────────────────────────────
register()

if FORCE_WS then
    print("[pocketmcp] WebSocket forcé (EnableWebSocket=true)")
    if not tryWebSocket() then
        warn("[pocketmcp] WebSocket forcé mais échec → HTTP polling")
        startHttpPolling()
    end
else
    -- Auto-détection : essaie WebSocket, bascule HTTP si échec
    task.spawn(function()
        local wsOk = tryWebSocket()
        if wsOk then
            state.transport = "WebSocket"
        else
            state.transport = "HTTP Polling"
            startHttpPolling()
        end
    end)
end

print("[pocketmcp] bridge ready v3 · " .. state.clientId)
print("[pocketmcp] serveur: " .. BRIDGE_URL)
print("[pocketmcp] transport: " .. state.transport .. " (auto-détecté)")
print("[pocketmcp] http mode: " .. state.httpMode .. " (auto-fallback)")
print("[pocketmcp] poll: " .. (POLL_MIN * 1000) .. "ms → " .. (POLL_MAX * 1000) .. "ms (backoff progressif)")
