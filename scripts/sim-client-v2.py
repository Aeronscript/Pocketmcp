#!/usr/bin/env python3
"""Simule un client Roblox complet avec tous les handlers."""
import requests
import time
import json
import re

BASE = "http://localhost:16384"
CLIENT_ID = "cli_test_v2"

# 1. Register
print("→ register")
r = requests.post(f"{BASE}/api/register", json={
    "clientId": CLIENT_ID,
    "playerName": "TestPlayerV2",
    "userId": 99999,
    "placeId": 4924922222,
    "jobId": "test-v2",
    "transport": "HTTP Polling",
    "executor": "Delta",
    "supports": {
        "decompile": True,
        "drawing": True,
        "writefile": True,
        "firebuttonclick": True,
        "firesignal": True,
        "screenshot": False,
    },
})
print(f"  ← {r.json()}")

# 2. Mock state for handlers
mock_remotes = []  # log of intercepted remotes
spy_enabled = False

def handle_command(cmd):
    """Simule l'exécution d'une commande côté Roblox."""
    cmd_type = cmd.get("type")
    print(f"    ← cmd: {cmd_type} (id={cmd['id']})")
    
    if cmd_type == "execute":
        code = cmd.get("code", "")
        # Capture prints from code
        logs = []
        for m in re.finditer(r'print\(["\'](.+?)["\']\)', code):
            logs.append(m.group(1))
        # Check for errors
        if "error_test" in code:
            return {"ok": False, "error": "simulated error", "logs": logs}
        return {"ok": True, "result": "executed", "logs": logs}
    
    elif cmd_type == "decompile":
        path = cmd.get("path", "")
        # Mock decompile
        if "Shop" in path:
            return {
                "ok": True,
                "source": f"-- Mock decompiled source of {path}\nlocal Shop = {{}}\nfunction Shop.buy(item) print('buying ' .. item) end\nreturn Shop",
                "lines": 3,
            }
        return {"ok": False, "error": f"Script not found: {path}"}
    
    elif cmd_type == "get_instances":
        selector = cmd.get("selector", "game")
        # Mock instances
        if "Remotes.*" in selector:
            return {
                "ok": True,
                "instances": [
                    {"name": "BuyItem", "class": "RemoteEvent", "path": "ReplicatedStorage.Remotes.BuyItem", "children": 0},
                    {"name": "SendMessage", "class": "RemoteEvent", "path": "ReplicatedStorage.Remotes.SendMessage", "children": 0},
                    {"name": "GetInventory", "class": "RemoteFunction", "path": "ReplicatedStorage.Remotes.GetInventory", "children": 0},
                ],
                "count": 3,
            }
        return {"ok": True, "instances": [{"name": "game", "class": "DataModel", "path": "game", "children": 5}], "count": 1}
    
    elif cmd_type == "spy_remotes":
        global spy_enabled
        spy_enabled = cmd.get("enabled", False)
        # Simule quelques remotes interceptés
        if spy_enabled:
            mock_remotes.clear()
            mock_remotes.extend([
                {"name": "BuyItem", "kind": "FireServer", "path": "ReplicatedStorage.Remotes.BuyItem", "argsCount": 2, "time": int(time.time())},
                {"name": "BuyItem", "kind": "FireServer", "path": "ReplicatedStorage.Remotes.BuyItem", "argsCount": 2, "time": int(time.time())},
                {"name": "SendMessage", "kind": "FireServer", "path": "ReplicatedStorage.Remotes.SendMessage", "argsCount": 1, "time": int(time.time())},
            ])
        return {"ok": True, "enabled": spy_enabled, "filter": cmd.get("filter"), "message": "spy " + ("activé" if spy_enabled else "désactivé")}
    
    elif cmd_type == "list_remotes":
        summary = {}
        for r in mock_remotes:
            summary[r["name"]] = summary.get(r["name"], 0) + 1
        return {
            "ok": True,
            "summary": [{"name": k, "count": v} for k, v in summary.items()],
            "totalUnique": len(summary),
            "totalFires": len(mock_remotes),
            "recent": mock_remotes[-10:],
        }
    
    elif cmd_type == "click_gui":
        path = cmd.get("path", "")
        return {"ok": True, "clicked": path.split(".")[-1], "path": path}
    
    elif cmd_type == "screenshot":
        return {"ok": False, "error": "ScreenshotWorkspace not available", "hint": "Use decompile_script instead"}
    
    elif cmd_type == "get_player_info":
        return {
            "ok": True,
            "info": {
                "name": "TestPlayerV2",
                "displayName": "TestV2",
                "userId": 99999,
                "team": "Blue",
                "health": 100,
                "maxHealth": 100,
                "walkSpeed": 16,
                "position": {"x": 12.4, "y": 58.2, "z": -3.1},
                "characterLoaded": True,
            },
        }
    
    elif cmd_type == "ping":
        return {"ok": True, "pong": time.time(), "httpMode": "request"}
    
    return {"ok": False, "error": f"Unknown type: {cmd_type}"}

# 3. Poll loop
print("\n→ polling loop (15 iterations, 1s each)")
for i in range(15):
    r = requests.post(f"{BASE}/api/poll", json={"clientId": CLIENT_ID})
    data = r.json()
    cmds = data.get("commands", [])
    
    for cmd in cmds:
        result = handle_command(cmd)
        # Send result back
        requests.post(f"{BASE}/api/result", json={
            "clientId": CLIENT_ID,
            "commandId": cmd["id"],
            "result": result,
        })
        print(f"    → result sent: ok={result.get('ok')}")
    
    # Heartbeat
    requests.post(f"{BASE}/api/heartbeat", json={
        "clientId": CLIENT_ID,
        "time": int(time.time()),
        "httpMode": "request",
    })
    
    if not cmds:
        time.sleep(1)

print("\n✓ simulation terminée")
