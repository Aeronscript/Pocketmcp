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
