-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge v4 · bootstrap modulaire (bridge.lua)
-- Auto-servi par le serveur sur /script.luau
--
-- Version "dev" modulaire. En prod, build_bridge.ps1 concatène
-- config + utils + handlers + transports en bridge.built.lua.
--

-- Variable injectée par le serveur au moment du service (/script.luau).
-- Contient le pairCode courant pour l'appairage auto (placeholder __PAIR_CODE__).
-- Le serveur remplace __PAIR_CODE__ par le code à la volée. En dev (non injecté),
-- vaut nil et le fallback getgenv().PairCode est utilisé.
local __PAIR_CODE__ = __PAIR_CODE__

-- Charge les modules via require() (résolu par loader ci-dessous
-- qui mappe "nom" → chunk du bundle au runtime).
-- ════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- Mini require() maison : mappe un nom de module au chunk chargé.
-- En dev (Roblox a un vrai require filesystem via l'outil de build),
-- on s'appuie sur le require natif. En bundle (bridge.built.lua),
-- le loader est remplacé par un registryinjecté. On supporte les
-- deux en tentant require natif puis fallback sur registry global.
-- ════════════════════════════════════════════════════════════

local _loaded = {}
local function myRequire(name)
    if _loaded[name] then return _loaded[name] end
    -- En bundle, les modules sont déjà exposés via _G.__POCKETMCP_MODULES
    if _G.__POCKETMCP_MODULES and _G.__POCKETMCP_MODULES[name] then
        _loaded[name] = _G.__POCKETMCP_MODULES[name]
        return _loaded[name]
    end
    -- state est injecté par le bootstrap (non-chargé via fichier)
    if name == "state" and _G.__POCKETMCP_STATE then
        _loaded[name] = _G.__POCKETMCP_STATE
        return _loaded[name]
    end
    -- Fallback : require natif (fonctionne si les fichiers sont sur le FS)
    local ok, mod = pcall(function() return require(name) end)
    if ok then
        _loaded[name] = mod
        return mod
    end
    error("module introuvable: " .. name)
end

-- Expose myRequire pour les modules
_G.require = myRequire

-- ─── State partagé ───────────────────────────────────────────
local state = _G.__POCKETMCP_STATE or {
    connected = false,
    clientId = "cli_" .. tostring(math.random(1000, 9999)),
    transport = "HTTP Polling",
    httpMode = "request",
    requestFailures = 0,
    currentPoll = 0.1,
    spyEnabled = false,
    spyFilter = nil,
    remotesLog = {},
    remotesCount = {},
    maxRemotesLog = 200,
    -- P0 #1 fix : clé de session AES-XOR dérivée du pairCode (chiffrée en RAM).
    -- Si nil : le bridge n'a pas pu dériver la clé (crypto désactivé).
    sessionKey = nil,
    -- P0 #1 fix : dernier nonce envoyé (anti-replay).
    lastNonce = 0,
}

-- Expose state pour les modules (http/websocket) qui font myRequire("state")
_G.__POCKETMCP_STATE = state

-- ─── Modules ─────────────────────────────────────────────────
local config = myRequire("config")
local ENV = myRequire("utils.fenv")
local logger = myRequire("utils.logger")
local json = myRequire("utils.json")
local retry = myRequire("utils.retry")
local crypto = myRequire("utils.crypto")

local hExecute = myRequire("handlers.execute")
local hDecompile = myRequire("handlers.decompile")
local hRemotes = myRequire("handlers.remotes")
local hGui = myRequire("handlers.gui")
local hPlayer = myRequire("handlers.player")
local hScan = myRequire("handlers.scan_exploit")
local hRace = myRequire("handlers.scan_race")
local hTrust = myRequire("handlers.scan_trust")

local http = myRequire("http")
local websocket = myRequire("websocket")

-- ─── Handlers table ──────────────────────────────────────────
local handlers = {
    execute = hExecute,
    decompile = hDecompile,
    get_instances = hGui.get_instances,
    click_gui = hGui.click_gui,
    spy_remotes = hRemotes.spy_remotes,
    list_remotes = hRemotes.list_remotes,
    get_player_info = hPlayer.get_player_info,
    player_control = hPlayer.player_control,
    scan_exploit = hScan.scan_exploit,
    scan_race = hRace.scan_race,
    scan_trust = hTrust.scan_trust,
    -- screenshot (inline car dépend d'ENV seulement)
    screenshot = function(cmd)
        if ENV.isSupported("screenshot") then
            local ok, path = pcall(ScreenshotWorkspace)
            if ok then return { ok = true, path = path, method = "ScreenshotWorkspace" } end
        end
        return {
            ok = false,
            error = "Screenshot non supporté sur cet exécuteur",
            hint = "Utilise decompile_script + execute_code pour inspecter le GUI à la place.",
        }
    end,
    -- ping (inline)
    ping = function(cmd)
        return { ok = true, pong = os.clock(), httpMode = state.httpMode, transport = state.transport }
    end,
}

-- ─── processCommand (pcall robuste) ──────────────────────────
function state.processCommand(cmd)
    local handler = handlers[cmd.type]
    if not handler then
        return { ok = false, error = "Unknown command type: " .. tostring(cmd.type) }
    end
    local ok, result = pcall(handler, cmd)
    if not ok then
        logger.error("handler crash [" .. tostring(cmd.type) .. "]: " .. tostring(result))
        return { ok = false, error = "Handler crashed: " .. tostring(result) }
    end
    return result
end

-- ─── Enregistrement (avec appairage) ───────────────────────
-- Le pairCode est injecté automatiquement par le serveur dans le script
-- (variable __POCKETMCP_PAIRCODE__). Fallback: getgenv().PairCode si l'utilisateur
-- définit manuellement. Le serveur affiche aussi le code dans le dashboard.
local function getPairCode()
    -- Priorité: variable injectée par le serveur (remplacée à la volée dans /script.luau)
    if __PAIR_CODE__ and __PAIR_CODE__ ~= "" then return tostring(__PAIR_CODE__) end
    -- Fallback manuel: getgenv().PairCode
    return getgenv().PairCode or ""
end

local function register()
    local pairCode = getPairCode()
    -- P0 #1 fix : dérive la clé de session à partir du pairCode AVANT l'envoi.
    -- Si le pairCode est vide, on ne peut pas dériver → crypto désactivé.
    local sessionKey = nil
    if pairCode and pairCode ~= "" then
        local ok, derived = pcall(crypto.deriveSessionKey, pairCode)
        if ok then
            sessionKey = derived
            state.sessionKey = sessionKey
        else
            logger.warn("dérivation clé session échouée: " .. tostring(derived))
        end
    end
    -- P0 #1 fix : on signale au serveur qu'on supporte le chiffrement.
    -- Le serveur activera le chiffrement côté lui seulement si sessionKey est dispo.
    local supports = ENV.getSupports()
    supports.crypto = sessionKey ~= nil
    local res = http.post("/api/register", {
        clientId = state.clientId,
        playerName = game:GetService("Players").LocalPlayer.Name,
        userId = game:GetService("Players").LocalPlayer.UserId,
        placeId = game.PlaceId,
        jobId = game.JobId,
        transport = state.transport,
        executor = ENV.executorName,
        supports = supports,
        pairCode = pairCode,
    })
    if res and res.ok then
        state.connected = true
        logger.print("connecté · " .. state.clientId .. " · " .. state.transport)
        logger.print("http mode: " .. state.httpMode)
        if res.crypto then
            logger.print("crypto: ON (session chiffrée XOR+HMAC)")
        else
            logger.print("crypto: OFF (trafic en clair)")
        end
    elseif res and res.error == "pairing_required" then
        logger.warn("APPAIRAGE REQUIS — va dans le dashboard et copie le pairCode dans getgenv().PairCode")
        logger.warn("pairCode existe: " .. tostring(res.pairCodeExists) .. " (expire dans " .. tostring(res.pairCodeExpiresIn) .. "s)")
    else
        logger.warn("échec connexion: " .. (res and res.error or "unknown"))
    end
end

-- ─── Heartbeat ───────────────────────────────────────────────
task.spawn(function()
    while task.wait(1) do
        if state.connected then
            pcall(function()
                http.post("/api/heartbeat", {
                    clientId = state.clientId,
                    time = os.time(),
                    httpMode = state.httpMode,
                    transport = state.transport,
                    pollInterval = math.floor(state.currentPoll * 1000),
                })
            end)
        end
    end
end)

-- ─── Reset état persistant (si bridge rechargé sans redémarrer Roblox) ───
state._httpPollingStarted = false
state._pollingThread = nil

-- ─── Démarrage ───────────────────────────────────────────────
register()

if config.FORCE_WS then
    logger.print("WebSocket forcé (EnableWebSocket=true)")
    if not websocket.tryWebSocket() then
        logger.warn("WebSocket forcé mais échec → HTTP polling")
        state.transport = "HTTP Polling"
        http.startHttpPolling()
    else
        state.transport = "WebSocket"
    end
else
    task.spawn(function()
        local wsOk = websocket.tryWebSocket()
        if wsOk then
            state.transport = "WebSocket"
        else
            state.transport = "HTTP Polling"
            http.startHttpPolling()
        end
    end)
end

logger.print("bridge ready v4 (modulaire) · " .. state.clientId)
logger.print("serveur: " .. config.BRIDGE_URL)
logger.print("transport: " .. state.transport .. " (auto-détecté)")
logger.print("http mode: " .. state.httpMode .. " (auto-fallback)")
logger.print("poll: " .. (config.POLL_MIN * 1000) .. "ms → " .. (config.POLL_MAX * 1000) .. "ms (backoff progressif)")
