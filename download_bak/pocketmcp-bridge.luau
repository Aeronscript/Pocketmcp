-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · by Aeronscript (Mohamed Amine)
-- Coller dans Delta / Hydrogen / KRNL Mobile / Arceus X
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

print("[pocketmcp] bridge ready · " .. state.clientId)
print("[pocketmcp] serveur: " .. BRIDGE_URL)
print("[pocketmcp] transport: " .. state.transport)
