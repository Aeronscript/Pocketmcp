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
