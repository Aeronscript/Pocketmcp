#!/bin/bash
# ════════════════════════════════════════════════════════════
# build_bridge.sh
# Version bash de build_bridge.ps1 — concatène config.lua + utils/* +
# handlers/* + websocket.lua + http.lua + bridge.lua en un seul
# bridge.built.lua autonome.
#
# Stratégie d'inlining : voir build_bridge.ps1 pour les détails.
# ════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

# Modules dans l'ordre de dépendance. Format : "nom|chemin"
MODULES=(
  "config|config.lua"
  "utils.logger|utils/logger.lua"
  "utils.json|utils/json.lua"
  "utils.retry|utils/retry.lua"
  "utils.fenv|utils/fenv.lua"
  "utils.crypto|utils/crypto.lua"
  "handlers.execute|handlers/execute.lua"
  "handlers.decompile|handlers/decompile.lua"
  "handlers.remotes|handlers/remotes.lua"
  "handlers.gui|handlers/gui.lua"
  "handlers.player|handlers/player.lua"
  "handlers.scan_exploit|handlers/scan_exploit.lua"
  "handlers.scan_race|handlers/scan_race.lua"
  "handlers.scan_trust|handlers/scan_trust.lua"
  "http|http.lua"
  "websocket|websocket.lua"
)

# Header avec require() maison + state partagé
HEADER='-- ════════════════════════════════════════════════════════════
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
'

OUT="$ROOT/bridge.built.lua"

# Ouvre le fichier de sortie
{
  echo "$HEADER"
  echo ""

  # Inline chaque module
  for entry in "${MODULES[@]}"; do
    name="${entry%%|*}"
    path="${entry##*|}"
    full="$ROOT/$path"
    if [ ! -f "$full" ]; then
      echo "❌ Module manquant: $full" >&2
      exit 1
    fi
    # Wrapper : le `return` final du module devient le retour de la closure.
    echo "_G.__POCKETMCP_MODULES[\"$name\"] = (function()"
    cat "$full"
    echo ""
    echo "end)()"
    echo ""
  done

  # Bootstrap bridge.lua (code exécutable, pas un return)
  if [ ! -f "$ROOT/bridge.lua" ]; then
    echo "❌ bridge.lua manquant" >&2
    exit 1
  fi
  echo "-- === bootstrap (bridge.lua) ==="
  cat "$ROOT/bridge.lua"
} > "$OUT"

SIZE=$(wc -c < "$OUT")
echo "✅ Build OK → $OUT ($SIZE octets)"
echo "  Modules inlinés : ${#MODULES[@]}"
echo "  + bridge.lua (bootstrap)"
