-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · http.lua
-- Transport HTTP polling avec backoff progressif + auto-fallback
-- request → HttpGet/HttpPost. Auto-fallback géré dans le state.
-- ════════════════════════════════════════════════════════════

local HttpService = game:GetService("HttpService")
local config = require("config")
local state = require("state")
local json = require("utils.json")
local logger = require("utils.logger")
local crypto = require("utils.crypto")

-- Envoi HTTP générique avec auto-fallback request → HttpGet/HttpPost.
local function httpSend(method, path, data)
    local url = "http://" .. config.BRIDGE_URL .. path
    local body = data and json.encodeSafe(data) or ""

    -- Mode 1: request()
    if state.httpMode == "request" and request then
        local ok, res = pcall(function()
            return request({
                Url = url,
                Method = method,
                Headers = { ["Content-Type"] = "application/json" },
                Body = body,
                Timeout = config.REQUEST_TIMEOUT,
            })
        end)
        if ok and res and res.Body then
            state.requestFailures = 0
            local parsed = json.decode(res.Body)
            return parsed or { ok = false, rawBody = res.Body }
        else
            state.requestFailures = state.requestFailures + 1
            logger.warn("request() failed (" .. state.requestFailures .. "/3): " .. tostring(res))
            if state.requestFailures >= 3 then
                state.httpMode = "httpget"
                logger.warn("bascule en mode HttpGet/HttpPost (fallback)")
            end
        end
    end

    -- Mode 2: HttpGet / HttpPost (contourne l'exécuteur)
    if state.httpMode == "httpget" or state.httpMode == "request" then
        if method == "GET" then
            local ok, res = pcall(function() return game:HttpGet(url, true) end)
            if ok then
                state.httpMode = "httpget"
                local parsed = json.decode(res)
                return parsed or { ok = false, rawBody = res }
            end
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpGet failed: " .. tostring(res) }
        elseif method == "POST" then
            local ok, res = pcall(function() return game:HttpPost(url, body, "application/json") end)
            if ok then
                state.httpMode = "httpget"
                local parsed = json.decode(res)
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

-- Polling avec backoff progressif.
-- P0 #1 fix : déchiffre les commandes reçues (si sessionKey) et chiffre les résultats.
local function pollCommands()
    local res = post("/api/poll", { clientId = state.clientId })

    if not res then
        state.currentPoll = math.min(state.currentPoll * config.POLL_ERROR_GROWTH, config.POLL_MAX)
        return
    end

    local commands = res.commands or {}

    if #commands == 0 then
        state.currentPoll = math.min(state.currentPoll * config.POLL_GROWTH, config.POLL_MAX)
        return
    end

    state.currentPoll = config.POLL_MIN

    for _, cmd in ipairs(commands) do
        -- P0 #1 fix : si la commande est chiffrée, on la déchiffre.
        local realCmd = cmd
        if cmd.encrypted and state.sessionKey then
            local encStr = cmd.encrypted
            if type(encStr) == "string" and encStr:sub(1, 4) == "enc:" then
                local encPayload = encStr:sub(5)
                local plain, nonce = crypto.decryptPayload(encPayload, state.sessionKey, state.lastNonce)
                if plain then
                    state.lastNonce = nonce
                    local decoded = json.decode(plain)
                    if decoded then
                        realCmd = decoded
                    else
                        logger.warn("déchiffrement OK mais JSON invalide")
                        realCmd = { id = cmd.id, type = "ping", error = "decrypt_json_failed" }
                    end
                else
                    logger.warn("déchiffrement commande échoué: " .. tostring(nonce))
                    -- En cas d'échec, on renvoie une erreur au serveur
                    post("/api/result", {
                        clientId = state.clientId,
                        commandId = cmd.id,
                        result = { ok = false, error = "decrypt_failed: " .. tostring(nonce) },
                    })
                    goto continue
                end
            end
        end

        local result = state.processCommand(realCmd)

        -- P0 #1 fix : chiffre le résultat si sessionKey
        local resultToSend = result
        if state.sessionKey then
            local plainResult = json.encodeSafe(result)
            local encrypted = crypto.encryptPayload(plainResult, state.sessionKey)
            resultToSend = "enc:" .. encrypted
        end

        post("/api/result", {
            clientId = state.clientId,
            commandId = realCmd.id,
            result = resultToSend,
        })
        ::continue::
    end
end

local function startHttpPolling()
    if state._httpPollingStarted then return end
    state._httpPollingStarted = true
    task.spawn(function()
        while true do
            if state.connected then
                local ok, err = pcall(pollCommands)
                if not ok then logger.warn("poll crash: " .. tostring(err)) end
            end
            task.wait(state.currentPoll)
        end
    end)
end

return {
    post = post,
    get = get,
    startHttpPolling = startHttpPolling,
}
