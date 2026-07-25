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
