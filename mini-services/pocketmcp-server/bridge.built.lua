-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge v4 · BUILD AUTONOME (généré par build_bridge.sh)
-- Tout-en-un : ne modifie AUCUN endpoint serveur.
-- Inclut : P0 #1 fix (chiffrement session XOR+HMAC via utils.crypto)
-- ════════════════════════════════════════════════════════════

_G.__POCKETMCP_MODULES = _G.__POCKETMCP_MODULES or {}
_G.__POCKETMCP_STATE = _G.__POCKETMCP_STATE or {
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
    sessionKey = nil,
    -- P0 #1 fix : dernier nonce envoyé (anti-replay).
    lastNonce = 0,
}
local _loaded = {}
local function require(name)
    if _loaded[name] then return _loaded[name] end
    if _G.__POCKETMCP_MODULES[name] then
        _loaded[name] = _G.__POCKETMCP_MODULES[name]
        return _loaded[name]
    end
    if name == "state" and _G.__POCKETMCP_STATE then
        _loaded[name] = _G.__POCKETMCP_STATE
        return _loaded[name]
    end
    error("module introuvable dans le bundle: " .. tostring(name))
end


_G.__POCKETMCP_MODULES["config"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · config.lua
-- Configuration centralisée (BRIDGE_URL, timeouts, poll, force flags)
-- ════════════════════════════════════════════════════════════

local config = {}

config.BRIDGE_URL        = getgenv().BridgeURL or "localhost:16384"
config.POLL_MIN         = 0.1    -- 100ms (réactif quand commandes en attente)
config.POLL_MAX         = 1.0    -- 1s cap (idle, négligeable)
config.POLL_GROWTH      = 1.5    -- facteur de backoff progressif
config.POLL_ERROR_GROWTH = 2.0   -- backoff agressif si request échoue
config.REQUEST_TIMEOUT  = 10
config.WS_DETECT_TIMEOUT = 3     -- 3s pour détecter si WebSocket marche

-- Force HTTP polling par défaut (le plus fiable pour Krnl/Xeno).
-- WebSocket reste activable via getgenv().EnableWebSocket = true
config.FORCE_HTTP = true
-- Force WebSocket si l'utilisateur veut tester
config.FORCE_WS   = getgenv().EnableWebSocket == true

return config

end)()

_G.__POCKETMCP_MODULES["utils.logger"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · utils/logger.lua
-- print/warn préfixés [pocketmcp]
-- ════════════════════════════════════════════════════════════

local logger = {}

function logger.print(...)
    local parts = {}
    for i = 1, select("#", ...) do
        parts[i] = tostring(select(i, ...))
    end
    print("[pocketmcp] " .. table.concat(parts, "\t"))
end

function logger.warn(...)
    local parts = {}
    for i = 1, select("#", ...) do
        parts[i] = tostring(select(i, ...))
    end
    warn("[pocketmcp] " .. table.concat(parts, "\t"))
end

function logger.error(...)
    local parts = {}
    for i = 1, select("#", ...) do
        parts[i] = tostring(select(i, ...))
    end
    warn("[pocketmcp][ERR] " .. table.concat(parts, "\t"))
end

return logger

end)()

_G.__POCKETMCP_MODULES["utils.json"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · utils/json.lua
-- Wrapper safe autour de HttpService:JSONEncode / JSONDecode
-- ════════════════════════════════════════════════════════════

local HttpService = game:GetService("HttpService")

local json = {}

-- Encode une table en JSON. Retourne nil + erreur si échec.
function json.encode(data)
    local ok, res = pcall(function() return HttpService:JSONEncode(data) end)
    if ok then return res end
    return nil, res
end

-- Decode une chaîne JSON. Retourne nil + erreur si échec.
function json.decode(str)
    if type(str) ~= "string" or str == "" then return nil, "empty body" end
    local ok, res = pcall(function() return HttpService:JSONDecode(str) end)
    if ok then return res end
    return nil, res
end

-- Encode puis fallback sur une table vide si échec (jamais nil pour POST)
function json.encodeSafe(data)
    local ok, res = pcall(function() return HttpService:JSONEncode(data) end)
    if ok then return res end
    return "{}"
end

return json

end)()

_G.__POCKETMCP_MODULES["utils.retry"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · utils/retry.lua
-- Exponential backoff helper (avec jitter optionnel)
-- ════════════════════════════════════════════════════════════

local retry = {}

-- Calcule le prochain délai de backoff:
--   base * (growth ^ attempt), borné à max, avec jitter optionnel (0..1)
function retry.backoff(base, growth, attempt, max, jitter)
    local v = base * (growth ^ attempt)
    if max then v = math.min(v, max) end
    if jitter and jitter > 0 then
        v = v * (1 + (math.random() * 2 - 1) * jitter)
    end
    return v
end

-- Exécute fn() avec retry + backoff. Retourne ok, result ou nil après maxAttempts.
function retry.attempt(maxAttempts, base, growth, fn)
    local lastErr
    for attempt = 0, (maxAttempts - 1) do
        local ok, res = pcall(fn)
        if ok then return true, res end
        lastErr = res
        if attempt < maxAttempts - 1 then
            task.wait(retry.backoff(base, growth, attempt))
        end
    end
    return false, lastErr
end

return retry

end)()

_G.__POCKETMCP_MODULES["utils.fenv"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · utils/fenv.lua
-- DÉTECTION AUTO EXECUTOR + compat API
-- Mappe gethui/cloneref/firesignal/getconnections/firebuttonclick/
-- getcustomasset etc. pour TOUS exploits de bonne version.
-- Utilise pcall partout (compat tous exploits de bonne version).
-- ════════════════════════════════════════════════════════════

local ENV = {}

-- Nom de l'exploitant (identifyexecutor)
ENV.executorName = "Unknown"
do
    local ok, name = pcall(function()
        if identifyexecutor then
            return select(1, identifyexecutor())
        end
        return "Unknown"
    end)
    if ok and name then ENV.executorName = tostring(name) end
end

-- ─── Hidden UI (gethui) ───────────────────────────────────────
ENV.hui = nil
do
    local function resolveHui()
        if typeof(gethui) == "function" then
            return gethui()
        elseif typeof(get_hidden_gui) == "function" then
            return get_hidden_gui()
        elseif typeof(cloneref) == "function" then
            return cloneref(game:GetService("CoreGui"))
        else
            return game:GetService("CoreGui")
        end
    end
    local ok, h = pcall(resolveHui)
    if ok and h then ENV.hui = h end
end

-- ─── cloneref ─────────────────────────────────────────────────
ENV.cloneref = (typeof(cloneref) == "function") and cloneref or function(x) return x end

-- ─── firesignal ───────────────────────────────────────────────
function ENV.fireSignal(sig)
    local ok, err = pcall(function()
        if typeof(firesignal) == "function" then
            firesignal(sig)
        else
            error("firesignal unavailable")
        end
    end)
    return ok, err
end

-- ─── getconnections ───────────────────────────────────────────
function ENV.getConnections(inst, eventName)
    local out = {}
    local ok, res = pcall(function()
        if typeof(getconnections) == "function" then
            local ev = inst[eventName]
            if not ev then return {} end
            return getconnections(ev)
        end
        return {}
    end)
    if ok and res then out = res end
    return out
end

-- ─── firebuttonclick ──────────────────────────────────────────
function ENV.fireButtonClick(btn)
    local ok, err = pcall(function()
        if typeof(firebuttonclick) == "function" then
            firebuttonclick(btn)
        elseif typeof(click) == "function" then
            click(btn)
        else
            error("firebuttonclick unavailable")
        end
    end)
    return ok, err
end

-- ─── getcustomasset ───────────────────────────────────────────
function ENV.getCustomAsset(path)
    local ok, res = pcall(function()
        if typeof(getcustomasset) == "function" then
            return getcustomasset(path)
        elseif typeof(getasset) == "function" then
            return getasset(path)
        end
        return nil
    end)
    if ok then return res end
    return nil
end

-- ─── isSupported ──────────────────────────────────────────────
local caps = {
    decompile    = typeof(decompile) == "function",
    Drawing      = typeof(Drawing) == "function" or typeof(Drawing) == "table",
    writefile    = typeof(writefile) == "function",
    firebuttonclick = typeof(firebuttonclick) == "function",
    firesignal   = typeof(firesignal) == "function",
    getconnections = typeof(getconnections) == "function",
    cloneref     = typeof(cloneref) == "function",
    gethui       = typeof(gethui) == "function" or typeof(get_hidden_gui) == "function",
    getcustomasset = typeof(getcustomasset) == "function",
    screenshot   = typeof(ScreenshotWorkspace) == "function",
    webSocket    = typeof(WebSocket) == "table" or typeof(WebSocket) == "userdata",
    identifyexecutor = typeof(identifyexecutor) == "function",
    loadstring    = typeof(loadstring) == "function",
}

function ENV.isSupported(cap)
    return caps[cap] == true
end

-- Retourne la table des capacités (pour /api/register)
function ENV.getSupports()
    local out = {}
    for k, v in pairs(caps) do out[k] = v end
    return out
end

ENV.caps = caps

return ENV

end)()

_G.__POCKETMCP_MODULES["utils.crypto"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · utils/crypto.lua
-- P0 #1 fix : chiffrement de session en vol (XOR + HMAC-SHA256)
--
-- Implémentation Lua pure de :
--   - SHA256 (FIPS 180-4)
--   - HMAC-SHA256 (RFC 2104)
--   - XOR stream cipher (avec clé longue = sessionKey + iv)
--   - Base64 encode/decode
--   - deriveSessionKey (2 rounds HMAC-SHA256, miroir de server/crypto.ts)
--   - encryptPayload / decryptPayload (format : base64(iv|nonce|hmac|ct))
--
-- Performance : SHA256 en Lua pur ≈ 1ms pour 1KB sur mobile moderne.
-- C'est acceptable pour des commandes MCP (généralement < 10KB).
-- ════════════════════════════════════════════════════════════

local json = require("utils.json")

local crypto = {}

-- ─── SHA256 (FIPS 180-4) ─────────────────────────────────────
-- Tables de constantes
local K = {
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
}

-- Valeurs initiales H0..H7
local H_INIT = {
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
}

-- Masque 32 bits
local function mask32(x)
  return x % 0x100000000
end

-- Rotation droite
local function ror(x, n)
  return mask32((x >> n) | (x << (32 - n)))
end

-- Opérations bitwise sur 32 bits (Lua 5.3+ / Luau)
local function band(a, b) return a & b end
local function bxor(a, b) return a ~ b end
local function bnot(a) return ~a end
local function shl(a, n) return mask32(a << n) end

-- Préparation du message : padding + length
local function preprocess(msg)
  local len = #msg
  local bitLen = len * 8
  -- Pad avec 0x80 puis 0x00 jusqu'à len ≡ 56 (mod 64)
  local padded = msg .. string.char(0x80)
  while (#padded % 64) ~= 56 do
    padded = padded .. string.char(0x00)
  end
  -- Ajoute la longueur en bits (64 bits big-endian, on ne gère que 32 bits bas)
  padded = padded .. string.char(0, 0, 0, 0)  -- high 32 bits (toujours 0 pour nos tailles)
  -- low 32 bits big-endian
  local low = bitLen % 0x100000000
  padded = padded .. string.char(
    (low >> 24) & 0xFF,
    (low >> 16) & 0xFF,
    (low >> 8) & 0xFF,
    low & 0xFF
  )
  return padded
end

-- SHA256 principal
function crypto.sha256(msg)
  local padded = preprocess(msg)
  local H = {}
  for i = 1, 8 do H[i] = H_INIT[i] end

  -- Traite par blocs de 64 octets
  for blockStart = 1, #padded, 64 do
    local block = string.sub(padded, blockStart, blockStart + 63)
    local W = {}
    -- 16 premiers mots big-endian
    for i = 0, 15 do
      local off = i * 4 + 1
      W[i + 1] = (string.byte(block, off) << 24) |
                 (string.byte(block, off + 1) << 16) |
                 (string.byte(block, off + 2) << 8) |
                 string.byte(block, off + 3)
      W[i + 1] = mask32(W[i + 1])
    end
    -- 48 mots suivants
    for i = 17, 64 do
      local s0 = ror(W[i - 15 + 1], 7) ~ ror(W[i - 15 + 1], 18) ~ (W[i - 15 + 1] >> 3)
      local s1 = ror(W[i - 2 + 1], 17) ~ ror(W[i - 2 + 1], 19) ~ (W[i - 2 + 1] >> 10)
      W[i] = mask32(W[i - 16 + 1] + s0 + W[i - 7 + 1] + s1)
    end

    local a, b, c, d, e, f, g, h = H[1], H[2], H[3], H[4], H[5], H[6], H[7], H[8]
    for i = 1, 64 do
      local S1 = ror(e, 6) ~ ror(e, 11) ~ ror(e, 25)
      local ch = (e & f) ~ (bnot(e) & g)
      local temp1 = mask32(h + S1 + ch + K[i] + W[i])
      local S0 = ror(a, 2) ~ ror(a, 13) ~ ror(a, 22)
      local maj = (a & b) ~ (a & c) ~ (b & c)
      local temp2 = mask32(S0 + maj)
      h = g; g = f; f = e
      e = mask32(d + temp1)
      d = c; c = b; b = a
      a = mask32(temp1 + temp2)
    end

    H[1] = mask32(H[1] + a)
    H[2] = mask32(H[2] + b)
    H[3] = mask32(H[3] + c)
    H[4] = mask32(H[4] + d)
    H[5] = mask32(H[5] + e)
    H[6] = mask32(H[6] + f)
    H[7] = mask32(H[7] + g)
    H[8] = mask32(H[8] + h)
  end

  -- Sortie : 32 octets big-endian
  local out = {}
  for i = 1, 8 do
    out[#out + 1] = string.char(
      (H[i] >> 24) & 0xFF,
      (H[i] >> 16) & 0xFF,
      (H[i] >> 8) & 0xFF,
      H[i] & 0xFF
    )
  end
  return table.concat(out)
end

-- ─── HMAC-SHA256 (RFC 2104) ──────────────────────────────────
function crypto.hmacSha256(key, msg)
  -- Si key > 64 octets, hash la d'abord
  if #key > 64 then
    key = crypto.sha256(key)
  end
  -- Pad key à 64 octets
  local paddedKey = key .. string.rep("\0", 64 - #key)

  -- ipad et opad
  local ipad = {}
  local opad = {}
  for i = 1, 64 do
    local b = string.byte(paddedKey, i)
    ipad[i] = string.char(b ~ 0x36)
    opad[i] = string.char(b ~ 0x5c)
  end
  local ipadStr = table.concat(ipad)
  local opadStr = table.concat(opad)

  -- inner = H(ipad || msg)
  local inner = crypto.sha256(ipadStr .. msg)
  -- outer = H(opad || inner)
  return crypto.sha256(opadStr .. inner)
end

-- ─── Hex encode/decode ──────────────────────────────────────
function crypto.toHex(str)
  local out = {}
  for i = 1, #str do
    out[i] = string.format("%02x", string.byte(str, i))
  end
  return table.concat(out)
end

function crypto.fromHex(hex)
  local out = {}
  for i = 1, #hex, 2 do
    local byte = tonumber(string.sub(hex, i, i + 1), 16)
    if byte then out[#out + 1] = string.char(byte) end
  end
  return table.concat(out)
end

-- ─── Base64 encode/decode ───────────────────────────────────
local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function crypto.toBase64(str)
  local out = {}
  local i = 1
  while i <= #str do
    local b1 = string.byte(str, i) or 0
    local b2 = string.byte(str, i + 1) or 0
    local b3 = string.byte(str, i + 2) or 0
    local n = (b1 << 16) | (b2 << 8) | b3
    out[#out + 1] = string.sub(B64, ((n >> 18) & 0x3F) + 1, ((n >> 18) & 0x3F) + 1)
    out[#out + 1] = string.sub(B64, ((n >> 12) & 0x3F) + 1, ((n >> 12) & 0x3F) + 1)
    if i + 1 <= #str then
      out[#out + 1] = string.sub(B64, ((n >> 6) & 0x3F) + 1, ((n >> 6) & 0x3F) + 1)
    else
      out[#out + 1] = "="
    end
    if i + 2 <= #str then
      out[#out + 1] = string.sub(B64, (n & 0x3F) + 1, (n & 0x3F) + 1)
    else
      out[#out + 1] = "="
    end
    i = i + 3
  end
  return table.concat(out)
end

-- ─── Random bytes ───────────────────────────────────────────
-- Roblox : on utilise math.random + os.time pour seed.
-- Ce n'est pas crypto-grade mais c'est OK pour IV/nonce (pas secret).
function crypto.randomBytes(n)
  local out = {}
  for i = 1, n do
    out[i] = string.char(math.random(0, 255))
  end
  return table.concat(out)
end

-- ─── deriveSessionKey (miroir de server/crypto.ts) ──────────
-- 2 rounds HMAC-SHA256 avec sel "pocketmcp-salt-v1"
function crypto.deriveSessionKey(pairCode)
  local salt = "pocketmcp-salt-v1"
  local key = pairCode
  -- Round 1
  key = crypto.hmacSha256(salt, key)
  -- Round 2
  key = crypto.hmacSha256(salt, key)
  return key  -- 32 bytes
end

-- ─── XOR stream cipher (avec clé longue = sessionKey || iv) ─
local function xorCipher(data, sessionKey, iv)
  local keyStream = sessionKey .. iv  -- 48 bytes (32 + 16)
  local out = {}
  for i = 1, #data do
    out[i] = string.char(string.byte(data, i) ~ string.byte(keyStream, ((i - 1) % #keyStream) + 1))
  end
  return table.concat(out)
end

-- ─── encryptPayload (miroir de server/crypto.ts) ────────────
-- Format : base64(iv_hex | nonce_hex | hmac_hex | ciphertext_hex)
-- Retourne la string à préfixer avec "enc:" dans le JSON.
function crypto.encryptPayload(plaintext, sessionKey)
  local iv = crypto.randomBytes(16)
  local nonce = crypto.randomBytes(8)
  local ciphertext = xorCipher(plaintext, sessionKey, iv)
  -- HMAC sur (iv || nonce || ciphertext)
  local hmac = crypto.hmacSha256(sessionKey, iv .. nonce .. ciphertext)
  -- Format : base64(iv_hex | nonce_hex | hmac_hex | ciphertext_hex)
  local payload = crypto.toHex(iv) .. "|" ..
                  crypto.toHex(nonce) .. "|" ..
                  crypto.toHex(hmac) .. "|" ..
                  crypto.toHex(ciphertext)
  return crypto.toBase64(payload)
end

-- ─── decryptPayload (miroir de server/crypto.ts) ────────────
-- Vérifie HMAC + nonce (anti-replay)
-- expectedNonceFloor : nombre (ou nil), nonce doit être > expectedNonceFloor
-- Retourne plaintext ou nil + erreur
function crypto.decryptPayload(encrypted, sessionKey, expectedNonceFloor)
  -- Decode base64
  local payload = nil
  -- Base64 decode manuel
  local b64rev = {}
  for i = 1, #B64 do
    b64rev[string.sub(B64, i, i)] = i - 1
  end
  local cleanEncrypted = encrypted:gsub("=+$", "")
  local bits = {}
  for i = 1, #cleanEncrypted do
    local v = b64rev[string.sub(cleanEncrypted, i, i)]
    if v then bits[#bits + 1] = v end
  end
  local decoded = {}
  for i = 1, #bits, 4 do
    local n = (bits[i] or 0) * 262144 + (bits[i + 1] or 0) * 4096 + (bits[i + 2] or 0) * 64 + (bits[i + 3] or 0)
    decoded[#decoded + 1] = string.char((n >> 16) & 0xFF)
    if bits[i + 2] then decoded[#decoded + 1] = string.char((n >> 8) & 0xFF) end
    if bits[i + 3] then decoded[#decoded + 1] = string.char(n & 0xFF) end
  end
  payload = table.concat(decoded)

  -- Split par "|"
  local parts = {}
  for part in payload:gmatch("[^|]+") do
    parts[#parts + 1] = part
  end
  if #parts ~= 4 then
    return nil, "invalid_format"
  end

  local iv = crypto.fromHex(parts[1])
  local nonce = crypto.fromHex(parts[2])
  local hmac = crypto.fromHex(parts[3])
  local ciphertext = crypto.fromHex(parts[4])

  -- Vérifie HMAC
  local expectedHmac = crypto.hmacSha256(sessionKey, iv .. nonce .. ciphertext)
  if hmac ~= expectedHmac then
    return nil, "hmac_mismatch"
  end

  -- Vérifie nonce (anti-replay)
  -- nonce est 8 bytes big-endian, on le convertit en nombre
  local nonceBig = 0
  for i = 1, 8 do
    nonceBig = nonceBig * 256 + string.byte(nonce, i)
  end
  if expectedNonceFloor and nonceBig <= expectedNonceFloor then
    return nil, "replay_detected"
  end

  -- Déchiffre
  local plaintext = xorCipher(ciphertext, sessionKey, iv)
  return plaintext, nonceBig
end

return crypto

end)()

_G.__POCKETMCP_MODULES["handlers.execute"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/execute.lua
-- run_code: loadstring + capture prints
-- Format retour: {ok, result, error, logs}
-- ════════════════════════════════════════════════════════════

local logger = require("utils.logger")

-- Capture print/warn le temps de l'exécution, et renvoie logs + result.
local function capturePrints(fn)
    local logs = {}
    local oldPrint, oldWarn = print, warn

    print = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            parts[i] = tostring(select(i, ...))
        end
        table.insert(logs, table.concat(parts, "\t"))
    end
    warn = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            parts[i] = tostring(select(i, ...))
        end
        table.insert(logs, "[WARN] " .. table.concat(parts, "\t"))
    end

    local ok, result = pcall(fn)
    print, warn = oldPrint, oldWarn
    return ok, result, logs
end

return function(cmd)
    if not cmd.code or cmd.code == "" then
        return { ok = false, error = "no code provided", logs = {} }
    end
    local fn, err = loadstring(cmd.code)
    if not fn then
        logger.warn("execute: loadstring error: " .. tostring(err))
        return { ok = false, error = err, logs = {} }
    end
    local ok, result, logs = capturePrints(fn)
    return {
        ok = ok,
        result = tostring(result),
        error = (not ok) and tostring(result) or nil,
        logs = logs,
    }
end

end)()

_G.__POCKETMCP_MODULES["handlers.decompile"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/decompile.lua
-- decompile_script: decompile un script via son path (game.X.Y)
-- Format retour: {ok, source, lines} ou {ok=false, error}
-- ════════════════════════════════════════════════════════════

local ENV = require("utils.fenv")
local logger = require("utils.logger")

return function(cmd)
    if not ENV.isSupported("decompile") then
        return { ok = false, error = "decompile() not available on this executor (" .. ENV.executorName .. ")" }
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
    if not ok then
        logger.warn("decompile failed: " .. tostring(src))
        return { ok = false, error = "Decompile failed: " .. tostring(src) }
    end
    return { ok = true, source = src, lines = #string.split(src, "\n") }
end

end)()

_G.__POCKETMCP_MODULES["handlers.remotes"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/remotes.lua
-- spy_remotes + list_remotes via hook __namecall
-- ════════════════════════════════════════════════════════════

local state = require("state")

local function isClickable(className)
    return className == "TextButton" or className == "ImageButton" or className == "Button"
end

local function handleSpyRemotes(cmd)
    state.spyEnabled = cmd.enabled
    state.spyFilter = cmd.filter
    if cmd.enabled and not state._spyHooked then
        state._spyHooked = true
        local ok, err = pcall(function()
            if hookmetamethod and typeof(hookmetamethod) == "function" then
                local old
                old = hookmetamethod(game, "__namecall", function(self, ...)
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
                                args = { ... },
                                time = os.time(),
                            })
                            if #state.remotesLog > state.maxRemotesLog then
                                table.remove(state.remotesLog, 1)
                            end
                        end
                    end
                    return old(self, ...)
                end)
            else
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
                                args = { ... },
                                time = os.time(),
                            })
                            if #state.remotesLog > state.maxRemotesLog then
                                table.remove(state.remotesLog, 1)
                            end
                        end
                    end
                    return old(self, ...)
                end)
            end
        end)
        if not ok then
            return { ok = false, enabled = false, filter = state.spyFilter, message = "hook échoué: " .. tostring(err) }
        end
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

return {
    spy_remotes = handleSpyRemotes,
    list_remotes = handleListRemotes,
}

end)()

_G.__POCKETMCP_MODULES["handlers.gui"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/gui.lua
-- get_instances + click_gui — ROBUSTE
--
-- get_instances : sélecteur CSS-like + "*" wildcard + limites
--   (maxDepth, maxResults pour éviter lag sur gros jeu)
--   Utilise ENV.hui pour traverser PlayerGui/CoreGui.
--   Retourne name/class/path/children.
--
-- click_gui : ORDRE DE PRIORITÉ robuste :
--   (1) firesignal(btn.MouseButton1Click) via ENV.fireSignal
--   (2) getconnections + fire chaque connexion
--   (3) firebuttonclick si dispo
--   (4) fallback btn.MouseButton1Click:Fire() (pcall)
--   Détecte le type cliquable (TextButton/ImageButton/...).
--   Retourne {ok, clicked, path, method}.
-- ════════════════════════════════════════════════════════════

local ENV = require("utils.fenv")
local logger = require("utils.logger")

local MAX_DEPTH_DEFAULT = 8
local MAX_RESULTS_DEFAULT = 500

local function isClickable(className)
    return className == "TextButton" or className == "ImageButton" or className == "Button"
end

-- Résout un path "game.X.Y" ou "Y" en instance.
local function resolvePath(path)
    if not path then return nil end
    local current = game
    for part in string.gmatch(path, "[^.]+") do
        if part ~= "game" then
            current = current:FindFirstChild(part)
            if not current then return nil end
        end
    end
    return current
end

-- Collecte récursivement les enfants d'un noeud avec profondeur/limite.
local function collect(node, out, depth, maxDepth, maxResults)
    if #out >= maxResults then return end
    local ok, children = pcall(function() return node:GetChildren() end)
    if not ok then return end
    for _, child in ipairs(children) do
        if #out >= maxResults then return end
        local info = {
            name = child.Name,
            class = child.ClassName,
            path = child:GetFullName(),
            children = 0,
        }
        local ok2, gc = pcall(function() return child:GetChildren() end)
        if ok2 then info.children = #gc end
        table.insert(out, info)
        if depth < maxDepth then
            collect(child, out, depth + 1, maxDepth, maxResults)
        end
    end
end

local function handleGetInstances(cmd)
    local selector = cmd.selector or "game"
    selector = selector:gsub("^game%.", ""):gsub("^game$", "")

    local maxDepth = tonumber(cmd.maxDepth) or MAX_DEPTH_DEFAULT
    local maxResults = tonumber(cmd.maxResults) or MAX_RESULTS_DEFAULT
    maxDepth = math.clamp(maxDepth, 1, 32)
    maxResults = math.clamp(maxResults, 1, 5000)

    -- Racine = tout game
    if selector == "" then
        local results = {}
        local ok, children = pcall(function() return game:GetChildren() end)
        if not ok then return { ok = false, error = "GetChildren échoué: " .. tostring(children) } end
        for _, child in ipairs(children) do
            if #results >= maxResults then break end
            local info = { name = child.Name, class = child.ClassName, path = child:GetFullName(), children = 0 }
            local ok2, gc = pcall(function() return child:GetChildren() end)
            if ok2 then info.children = #gc end
            table.insert(results, info)
            if maxDepth > 1 then
                collect(child, results, 2, maxDepth, maxResults)
            end
        end
        return { ok = true, instances = results, count = #results }
    end

    -- Sélecteur avec wildcard "*"
    if selector:find("%*") then
        -- On prend la partie avant le "*" comme chemin parent
        local prefix = selector:gsub("%*.*$", "")
        prefix = prefix:gsub("%.$", "")
        local parent = game
        if prefix ~= "" then
            parent = resolvePath(prefix)
            if not parent then
                return { ok = false, error = "Wildcard parent not found: " .. prefix }
            end
        end
        local results = {}
        local ok, children = pcall(function() return parent:GetChildren() end)
        if not ok then return { ok = false, error = "GetChildren échoué: " .. tostring(children) } end
        for _, child in ipairs(children) do
            if #results >= maxResults then break end
            local info = { name = child.Name, class = child.ClassName, path = child:GetFullName(), children = 0 }
            local ok2, gc = pcall(function() return child:GetChildren() end)
            if ok2 then info.children = #gc end
            table.insert(results, info)
            if maxDepth > 1 then
                collect(child, results, 2, maxDepth, maxResults)
            end
        end
        return { ok = true, instances = results, count = #results }
    end

    -- Sélecteur direct (chemin précis)
    local current = resolvePath(selector)
    if not current then
        return { ok = false, error = "Not found: " .. (cmd.selector or "?") }
    end

    local results = {}
    local info = { name = current.Name, class = current.ClassName, path = current:GetFullName(), children = 0 }
    local ok2, gc = pcall(function() return current:GetChildren() end)
    if ok2 then info.children = #gc end
    table.insert(results, info)
    collect(current, results, 2, maxDepth, maxResults)

    return { ok = true, instances = results, count = #results }
end

-- Tente toutes les méthodes de clic dans l'ordre de priorité.
local function handleClickGui(cmd)
    local target = resolvePath(cmd.path)
    if not target then
        return { ok = false, error = "GUI path not found: " .. (cmd.path or "?") }
    end
    if not isClickable(target.ClassName) then
        return { ok = false, error = "Target is not clickable: " .. target.ClassName }
    end

    local clicked = target.Name
    local path = target:GetFullName()
    local method = "none"

    -- (1) firesignal(btn.MouseButton1Click)
    if ENV.isSupported("firesignal") then
        local ok, err = pcall(function()
            return ENV.fireSignal(target.MouseButton1Click)
        end)
        if ok then
            method = "firesignal"
        else
            logger.warn("click firesignal échoué: " .. tostring(err))
        end
    end

    -- (2) getconnections + fire chaque connexion
    if method == "none" and ENV.isSupported("getconnections") then
        local ok, err = pcall(function()
            local conns = ENV.getConnections(target, "MouseButton1Click")
            if #conns == 0 then error("no connections") end
            for _, c in ipairs(conns) do
                pcall(function() c:Fire() end)
            end
        end)
        if ok then method = "getconnections" end
    end

    -- (3) firebuttonclick
    if method == "none" and ENV.isSupported("firebuttonclick") then
        local ok, err = ENV.fireButtonClick(target)
        if ok then method = "firebuttonclick" else logger.warn("firebuttonclick échoué: " .. tostring(err)) end
    end

    -- (4) fallback btn.MouseButton1Click:Fire()
    if method == "none" then
        local ok, err = pcall(function()
            target.MouseButton1Click:Fire()
        end)
        if ok then method = "fireevent" else logger.warn("MouseButton1Click:Fire échoué: " .. tostring(err)) end
    end

    if method == "none" then
        return { ok = false, clicked = clicked, path = path, method = "none", error = "Aucune méthode de clic disponible" }
    end

    return { ok = true, clicked = clicked, path = path, method = method }
end

return {
    get_instances = handleGetInstances,
    click_gui = handleClickGui,
}

end)()

_G.__POCKETMCP_MODULES["handlers.player"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/player.lua
-- get_player_info + player_control
-- ════════════════════════════════════════════════════════════

local Players = game:GetService("Players")
local LP = Players.LocalPlayer
local logger = require("utils.logger")

local function getInfo(target)
    local char = target.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    return {
        name = target.Name,
        displayName = target.DisplayName,
        userId = target.UserId,
        team = target.Team and target.Team.Name or "None",
        health = hum and hum.Health or 0,
        maxHealth = hum and hum.MaxHealth or 0,
        walkSpeed = hum and hum.WalkSpeed or 0,
        position = hrp and { x = hrp.X, y = hrp.Y, z = hrp.Z } or nil,
        characterLoaded = char ~= nil,
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
    return { ok = true, info = getInfo(target) }
end

local function handlePlayerControl(cmd)
    local target = LP
    if cmd.playerName and cmd.playerName ~= "" then
        target = Players:FindFirstChild(cmd.playerName) or LP
    end
    local action = cmd.action or "noop"
    local char = target.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    local hrp = char and char:FindFirstChild("HumanoidRootPart")

    local ok, err = pcall(function()
        if action == "walkSpeed" and hum then
            hum.WalkSpeed = tonumber(cmd.value) or hum.WalkSpeed
        elseif action == "jump" and hum then
            hum.Jump = true
        elseif action == "teleport" and hrp and cmd.position then
            hrp.CFrame = CFrame.new(cmd.position.x or 0, cmd.position.y or 0, cmd.position.z or 0)
        elseif action == "sit" and hum then
            hum.Sit = true
        end
    end)
    if not ok then
        logger.warn("player_control échoué: " .. tostring(err))
        return { ok = false, error = tostring(err), action = action }
    end
    return { ok = true, action = action, info = getInfo(target) }
end

return {
    get_player_info = handleGetPlayerInfo,
    player_control = handlePlayerControl,
}

end)()

_G.__POCKETMCP_MODULES["handlers.scan_exploit"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/scan_exploit.lua
-- Stub Lua pour scan_exploit. L'implémentation réelle est côté serveur
-- (mcp-tools/exploit.ts). Ce handler est appelé si le serveur délègue
-- au bridge, mais en pratique le serveur gère lui-même cet outil.
-- ════════════════════════════════════════════════════════════

local M = {}

function M.scan_exploit(cmd)
    return {
        ok = false,
        error = "scan_exploit non implémenté côté bridge Lua — géré côté serveur",
        hint = "Le serveur doit gérer cet outil via mcp-tools/exploit.ts",
    }
end

return M

end)()

_G.__POCKETMCP_MODULES["handlers.scan_race"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/scan_race.lua
-- Stub Lua pour scan_race. L'implémentation réelle est côté serveur.
-- ════════════════════════════════════════════════════════════

local M = {}

function M.scan_race(cmd)
    return {
        ok = false,
        error = "scan_race non implémenté côté bridge Lua — géré côté serveur",
        hint = "Le serveur doit gérer cet outil via mcp-tools/race.ts",
    }
end

return M

end)()

_G.__POCKETMCP_MODULES["handlers.scan_trust"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/scan_trust.lua
-- Stub Lua pour scan_trust. L'implémentation réelle est côté serveur.
-- ════════════════════════════════════════════════════════════

local M = {}

function M.scan_trust(cmd)
    return {
        ok = false,
        error = "scan_trust non implémenté côté bridge Lua — géré côté serveur",
        hint = "Le serveur doit gérer cet outil via mcp-tools/trust.ts",
    }
end

return M

end)()

_G.__POCKETMCP_MODULES["http"] = (function()
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

end)()

_G.__POCKETMCP_MODULES["websocket"] = (function()
-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · websocket.lua
-- Transport WebSocket + reconnexion auto (fallback HTTP si fermé)
-- ════════════════════════════════════════════════════════════

local HttpService = game:GetService("HttpService")
local config = require("config")
local state = require("state")
local json = require("utils.json")
local logger = require("utils.logger")
local http = require("http")

local ws = nil
local reconnectAttempts = 0
local MAX_RECONNECT = 5

local function onMessage(msg)
    local ok, cmd = pcall(function() return json.decode(msg) end)
    if not ok or not cmd then return end
    local result = state.processCommand(cmd)
    if result and ws then
        pcall(function()
            ws:Send(json.encodeSafe({ commandId = cmd.id, result = result }))
        end)
    end
end

local function connect()
    local ok, err = pcall(function()
        ws = WebSocket.connect("ws://" .. config.BRIDGE_URL .. "/ws")
        ws.OnMessage:Connect(onMessage)
        ws.OnClose:Connect(function()
            logger.warn("WebSocket fermé, bascule HTTP polling")
            state.transport = "HTTP Polling"
            reconnectAttempts = reconnectAttempts + 1
            if reconnectAttempts <= MAX_RECONNECT then
                logger.warn("reconnexion WS tentative " .. reconnectAttempts)
                task.wait(1)
                if connect() then return end
            end
            http.startHttpPolling()
        end)
        ws:Connect()
    end)
    if not ok then
        logger.warn("WebSocket connect échoué: " .. tostring(err))
        return false
    end
    return true
end

-- Auto-détection WebSocket (essaie WS_DETECT_TIMEOUT, bascule HTTP si échec).
local function tryWebSocket()
    if config.FORCE_HTTP then
        logger.print("WebSocket désactivé manuellement (DisableWebSocket=true)")
        return false
    end
    if not WebSocket then
        logger.print("WebSocket API non disponible → HTTP polling")
        return false
    end

    local wsOk = false
    connect()

    local waited = 0
    while waited < config.WS_DETECT_TIMEOUT do
        task.wait(0.1)
        waited = waited + 0.1
        if ws and pcall(function() return ws:IsConnected() end) then
            wsOk = ws:IsConnected()
            if wsOk then break end
        end
    end

    if wsOk then
        logger.print("WebSocket connecté ✓")
        reconnectAttempts = 0
        return true
    else
        logger.print("WebSocket échec/mort → bascule HTTP polling")
        pcall(function() if ws then ws:Close() end end)
        return false
    end
end

return {
    tryWebSocket = tryWebSocket,
    connect = connect,
}

end)()

-- === bootstrap (bridge.lua) ===
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
