-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · auto-servi par le serveur sur /script.luau
-- Auteur: Aeronscript (Mohamed Amine)
-- ════════════════════════════════════════════════════════════
-- À coller dans Delta / Hydrogen / KRNL Mobile / Arceus X
-- Connexion auto au serveur PocketMCP local
-- ════════════════════════════════════════════════════════════

local BRIDGE_URL = getgenv().BridgeURL or "localhost:16384"
local USE_WEBSOCKET = not getgenv().DisableWebSocket
local POLL_INTERVAL = 0.2  -- 200ms en HTTP polling

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local LP = Players.LocalPlayer

-- ─── État ───────────────────────────────────────────────────
local state = {
    connected = false,
    clientId = "cli_" .. tostring(math.random(1000, 9999)),
    transport = USE_WEBSOCKET and "WebSocket" or "HTTP Polling",
}

-- ─── Exécution de code ──────────────────────────────────────
local function executeCode(code)
    local fn, err = loadstring(code)
    if not fn then
        return { ok = false, error = err }
    end
    -- Capture les prints
    local logs = {}
    local oldPrint = print
    local oldWarn = warn
    print = function(...)
        local args = {...}
        local parts = {}
        for _, v in ipairs(args) do
            table.insert(parts, tostring(v))
        end
        table.insert(logs, table.concat(parts, "\t"))
    end
    warn = function(...)
        local args = {...}
        local parts = {}
        for _, v in ipairs(args) do
            table.insert(parts, tostring(v))
        end
        table.insert(logs, "[WARN] " .. table.concat(parts, "\t"))
    end

    local ok, result = pcall(fn)

    print = oldPrint
    warn = oldWarn

    return {
        ok = ok,
        result = tostring(result),
        error = not ok and tostring(result) or nil,
        logs = logs,
    }
end

-- ─── Envoi HTTP ─────────────────────────────────────────────
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
    local parsed = nil
    pcall(function() parsed = HttpService:JSONDecode(res.Body) end)
    return parsed or { ok = false, rawBody = res.Body }
end

-- ─── Enregistrement ─────────────────────────────────────────
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
        print("[pocketmcp] connecté · " .. state.clientId .. " · " .. state.transport)
    else
        warn("[pocketmcp] échec connexion au serveur " .. BRIDGE_URL)
    end
end

-- ─── Polling ────────────────────────────────────────────────
local function pollCommands()
    local res = send("/api/poll", { clientId = state.clientId })
    if not res or not res.commands then return end
    for _, cmd in ipairs(res.commands) do
        local result
        if cmd.type == "execute" then
            result = executeCode(cmd.code)
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
                time = os.time(),
            })
        end
    end
end)

-- ─── WebSocket (optionnel) ──────────────────────────────────
if USE_WEBSOCKET then
    pcall(function()
        local ws = WebSocket.connect("ws://" .. BRIDGE_URL .. "/ws")
        ws.OnMessage:Connect(function(msg)
            local ok, cmd = pcall(function() return HttpService:JSONDecode(msg) end)
            if not ok or not cmd then return end
            local result
            if cmd.type == "execute" then
                result = executeCode(cmd.code)
            elseif cmd.type == "ping" then
                result = { ok = true, pong = os.clock() }
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

print("[pocketmcp] bridge ready · " .. state.clientId)
print("[pocketmcp] serveur: " .. BRIDGE_URL)
print("[pocketmcp] transport: " .. state.transport)
