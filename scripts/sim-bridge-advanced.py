#!/usr/bin/env python3
"""
Simulateur de client bridge PocketMCP — version single-thread.
Poll dans le main thread, heartbeat via timer périodique.
"""
import requests
import time
import json
import sys

SERVER = "http://localhost:16384"
CLIENT_ID = "cli_sim_advanced"

sim_state = {
    "scripts": {
        "ReplicatedStorage.Modules.Shop": '''local MarketplaceService = game:GetService("MarketplaceService")
local Shop = {}

function Shop.buy(itemId)
    local hasGamepass = MarketplaceService:UserOwnsGamePassAsync(game.Players.LocalPlayer.UserId, 1234567)
    if hasGamepass then
        print("item bought for free (gamepass owner)")
        game.ReplicatedStorage.Remotes.BuyItem:FireServer(itemId)
    else
        MarketplaceService:PromptGamePassPurchase(game.Players.LocalPlayer, 1234567)
    end
end

return Shop
''',
        "ReplicatedStorage.Modules.AntiCheat": '''local Players = game:GetService("Players")
local LP = Players.LocalPlayer

local function checkSpeed()
    local char = LP.Character
    if not char then return end
    local hum = char:FindFirstChildOfClass("Humanoid")
    if hum and hum.WalkSpeed > 20 then
        LP:Kick("Speed hack detected")
    end
end

game:GetService("RunService").Heartbeat:Connect(checkSpeed)
''',
    },
    "gui_buttons": [
        {"name": "BuyButton", "path": "StarterGui.MainMenu.Frame.BuyButton", "className": "TextButton"},
        {"name": "CloseButton", "path": "StarterGui.MainMenu.Frame.CloseButton", "className": "TextButton"},
    ],
    "stealth_active": False,
    "control_features": {},
    "walkspeed": 16,
    "jumppower": 50,
    "last_heartbeat": 0,
}

def register():
    r = requests.post(f"{SERVER}/api/register", json={
        "clientId": CLIENT_ID,
        "playerName": "SimAdvanced",
        "userId": 99999,
        "placeId": 123,
        "executor": "Simulator",
        "transport": "HTTP Polling",
        "supports": {
            "decompile": True,
            "drawing": False,
            "writefile": False,
            "firebuttonclick": True,
            "firesignal": True,
            "screenshot": False,
            "webSocket": False,
        },
    }, timeout=5)
    print(f"[register] {r.json()}", flush=True)
    return r.json().get("ok", False)

def handle_command(cmd):
    cmd_type = cmd.get("type")
    print(f"  [handler] commande: {cmd_type}", flush=True)
    
    if cmd_type == "ping":
        return {"ok": True, "pong": time.time(), "httpMode": "request", "transport": "HTTP Polling"}
    
    if cmd_type == "execute":
        return {"ok": True, "result": "executed", "logs": ["[sim] code exécuté"]}
    
    if cmd_type == "decompile":
        path = cmd.get("path", "")
        if path in sim_state["scripts"]:
            src = sim_state["scripts"][path]
            return {"ok": True, "source": src, "lines": len(src.split("\n"))}
        for k, v in sim_state["scripts"].items():
            if k.endswith(path) or path.endswith(k):
                return {"ok": True, "source": v, "lines": len(v.split("\n"))}
        return {"ok": False, "error": f"Path not found: {path}"}
    
    if cmd_type == "get_instances":
        return {"ok": True, "instances": [
            {"name": "Shop", "class": "ModuleScript", "path": "ReplicatedStorage.Modules.Shop", "children": 0},
            {"name": "AntiCheat", "class": "ModuleScript", "path": "ReplicatedStorage.Modules.AntiCheat", "children": 0},
        ], "count": 2}
    
    if cmd_type == "spy_remotes":
        return {"ok": True, "enabled": cmd.get("enabled", False), "filter": cmd.get("filter")}
    
    if cmd_type == "list_remotes":
        return {"ok": True, "summary": [], "totalUnique": 0, "totalFires": 0, "recent": []}
    
    if cmd_type == "analyze_game":
        return {
            "ok": True,
            "mode": cmd.get("mode", "full"),
            "scope": cmd.get("scope", "all"),
            "scannedScripts": 2,
            "decompiledScripts": 2,
            "failedDecompile": 0,
            "remotes": [
                {"path": "ReplicatedStorage.Modules.Shop", "pattern": "FireServer", "count": 1, "snippet": 'game.ReplicatedStorage.Remotes.BuyItem:FireServer(itemId)'},
            ],
            "gamepassChecks": [
                {"path": "ReplicatedStorage.Modules.Shop", "pattern": "UserOwnsGamePassAsync", "snippet": "MarketplaceService:UserOwnsGamePassAsync(game.Players.LocalPlayer.UserId, 1234567)", "numericIds": ["1234567"]},
            ],
            "antiCheatHints": [
                {"path": "ReplicatedStorage.Modules.AntiCheat", "pattern": "Kick(", "snippet": 'LP:Kick("Speed hack detected")'},
                {"path": "ReplicatedStorage.Modules.AntiCheat", "pattern": "WalkSpeed", "snippet": "if hum and hum.WalkSpeed > 20 then"},
            ],
            "modulesLoaded": [],
            "guiButtons": sim_state["gui_buttons"],
            "dynamicLog": [],
            "dynamicDuration": cmd.get("dynamicDuration", 10),
            "dynamicEvents": 0,
        }
    
    if cmd_type == "find_gamepass_logic":
        return {
            "ok": True,
            "gamepassId": cmd.get("gamepassId"),
            "mode": cmd.get("mode", "full"),
            "checksFound": [
                {
                    "path": "ReplicatedStorage.Modules.Shop",
                    "gamepassId": 1234567,
                    "numericIds": ["1234567"],
                    "snippets": [
                        {"pattern": "UserOwnsGamePassAsync", "snippet": "local hasGamepass = MarketplaceService:UserOwnsGamePassAsync(game.Players.LocalPlayer.UserId, 1234567)"},
                        {"pattern": "PromptGamePassPurchase", "snippet": "MarketplaceService:PromptGamePassPurchase(game.Players.LocalPlayer, 1234567)"},
                    ],
                    "bypassSnippet": """-- Bypass généré par PocketMCP
local ms = game:GetService('MarketplaceService')
local oldUOGP
oldUOGP = hookfunction(ms.UserOwnsGamePassAsync, newcclosure(function(self, ...)
  return true
end))
print('[pocketmcp] bypass gamepass actif')
""",
                    "type": "client_check",
                }
            ],
            "remotesObserved": [],
            "rawDecompiled": [{"path": "ReplicatedStorage.Modules.Shop", "source": sim_state["scripts"]["ReplicatedStorage.Modules.Shop"][:500]}],
            "checksCount": 1,
        }
    
    if cmd_type == "stealth_setup":
        action = cmd.get("action", "enable")
        if action == "disable":
            sim_state["stealth_active"] = False
            return {"ok": True, "message": "stealth désactivé", "active": False}
        if action == "status":
            return {"ok": True, "active": sim_state["stealth_active"], "features": ["kick", "metatable"] if sim_state["stealth_active"] else []}
        features = cmd.get("features", ["kick", "metatable", "speed", "detect"])
        sim_state["stealth_active"] = True
        return {"ok": True, "active": True, "enabled": features, "skipped": [], "message": f"stealth actif · {', '.join(features)}"}
    
    if cmd_type == "player_control":
        action = cmd.get("action", "enable")
        features = cmd.get("features", [])
        value = cmd.get("value")
        if action == "status":
            return {"ok": True, "features": sim_state["control_features"]}
        if action == "disable":
            for f in features:
                sim_state["control_features"].pop(f, None)
            sim_state["walkspeed"] = 16
            sim_state["jumppower"] = 50
            return {"ok": True, "disabled": True, "remaining": sim_state["control_features"]}
        enabled = []
        for f in features:
            if f == "walkspeed":
                sim_state["walkspeed"] = value or 50
                sim_state["control_features"]["walkspeed"] = sim_state["walkspeed"]
                enabled.append(f"walkspeed={sim_state['walkspeed']}")
            elif f == "jumppower":
                sim_state["jumppower"] = value or 100
                sim_state["control_features"]["jumppower"] = sim_state["jumppower"]
                enabled.append(f"jumppower={sim_state['jumppower']}")
            else:
                sim_state["control_features"][f] = True
                enabled.append(f)
        return {"ok": True, "action": action, "enabled": enabled, "failed": [], "activeFeatures": list(sim_state["control_features"].keys())}
    
    if cmd_type == "click_gui":
        return {"ok": True, "clicked": cmd.get("path", "").split(".")[-1], "path": cmd.get("path")}
    
    if cmd_type == "screenshot":
        return {"ok": False, "error": "non supporté sur simulateur"}
    
    if cmd_type == "get_player_info":
        return {"ok": True, "info": {"name": "SimAdvanced", "userId": 99999, "walkSpeed": sim_state["walkspeed"], "health": 100}}
    
    return {"ok": False, "error": f"Unknown command type: {cmd_type}"}

def main():
    print("=== Simulateur bridge PocketMCP (single-thread) ===", flush=True)
    try:
        if not register():
            print("Échec register", flush=True)
            sys.exit(1)
    except Exception as e:
        print(f"ERREUR register: {e}", flush=True)
        sys.exit(1)
    
    sim_state["last_heartbeat"] = time.time()
    print("Bridge simulé connecté. Polling...", flush=True)
    
    iteration = 0
    while True:
        try:
            iteration += 1
            now = time.time()
            # Heartbeat toutes les 2s
            if now - sim_state["last_heartbeat"] > 2:
                try:
                    requests.post(f"{SERVER}/api/heartbeat", json={
                        "clientId": CLIENT_ID,
                        "httpMode": "request",
                        "pollInterval": 500,
                    }, timeout=3)
                    sim_state["last_heartbeat"] = now
                except Exception as he:
                    print(f"[hb err] {he}", flush=True)
            
            # Poll (avec timeout court)
            r = requests.post(f"{SERVER}/api/poll", json={"clientId": CLIENT_ID}, timeout=3)
            data = r.json()
            cmds = data.get("commands", [])
            if cmds:
                print(f"[poll iter={iteration}] {len(cmds)} commande(s) reçue(s)", flush=True)
            for cmd in cmds:
                cmd_id = cmd.get("id")
                print(f"  [handler] commande: {cmd.get('type')} (id={cmd_id})", flush=True)
                result = handle_command(cmd)
                print(f"  [result] {json.dumps(result)[:150]}...", flush=True)
                requests.post(f"{SERVER}/api/result", json={
                    "clientId": CLIENT_ID,
                    "commandId": cmd_id,
                    "result": result,
                }, timeout=3)
        except Exception as e:
            print(f"[loop error iter={iteration}] {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()
        
        time.sleep(0.5)

if __name__ == "__main__":
    main()
