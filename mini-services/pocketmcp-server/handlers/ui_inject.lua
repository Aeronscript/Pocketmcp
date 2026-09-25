-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge · handlers/ui_inject.lua (stub)
--
-- CLT-001 fix : stub PocketUI pour compatibilité avec l'ancien bridge.
--
-- L'ancien bridge exposait une lib PocketUI via getgenv().PocketUI pour
-- afficher des overlays in-game (buttons, panels). Le nouveau bridge
-- (v0.5) ne l'incluait plus → erreur au require("handlers.ui_inject").
--
-- Ce stub restaure le require sans casser le bridge, mais n'implémente
-- pas réellement PocketUI (la lib complète n'est pas dans le repo).
-- Les appels retournent un message "non disponible" pour ne pas crasher.
--
-- Pour restaurer PocketUI complètement, il faut :
-- 1. Récupérer le contenu original de handlers/ui_inject.lua (depuis
--    l'ancien bridge pocketmcp/)
-- 2. Le coller ici en remplacement du stub
-- 3. Rebuilder bridge.built.lua via bash build_bridge.sh
-- ════════════════════════════════════════════════════════════

local M = {}

-- ui_inject : expose PocketUI dans getgenv() pour les scripts utilisateurs.
-- Stub : ne fait rien, mais ne crash pas.
function M.ui_inject(cmd)
    -- Marque PocketUI comme "non disponible" pour que les scripts qui
    -- testent getgenv().PocketUI ne crash pas.
    if not getgenv().PocketUI then
        getgenv().PocketUI = {
            available = false,
            version = "stub",
            message = "PocketUI non disponible dans cette version du bridge. Restaure handlers/ui_inject.lua depuis l'ancien bridge.",
        }
    end
    return {
        ok = true,
        stub = true,
        message = "ui_inject stub : PocketUI exposé comme non disponible",
    }
end

return M
