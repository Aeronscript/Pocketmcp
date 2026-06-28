#!/usr/bin/env python3
"""Simule un client Roblox (Delta/Hydrogen) qui s'enregistre et poll."""
import requests
import time
import json

BASE = "http://localhost:16384"
CLIENT_ID = "cli_test_001"

# 1. Register
print("→ register")
r = requests.post(f"{BASE}/api/register", json={
    "clientId": CLIENT_ID,
    "playerName": "TestPlayer",
    "userId": 12345,
    "placeId": 4924922222,
    "jobId": "test-job",
    "transport": "HTTP Polling",
})
print(f"  ← {r.json()}")

# 2. Heartbeat
print("→ heartbeat")
requests.post(f"{BASE}/api/heartbeat", json={"clientId": CLIENT_ID, "fps": 60})
print("  ← ok")

# 3. Poll loop (5 iterations)
print("→ polling for commands (5 iterations, 1s each)...")
for i in range(5):
    r = requests.post(f"{BASE}/api/poll", json={"clientId": CLIENT_ID})
    data = r.json()
    cmds = data.get("commands", [])
    if cmds:
        print(f"  ← received {len(cmds)} command(s)")
        for cmd in cmds:
            print(f"    cmd: {cmd['type']} ({cmd['id']})")
            if cmd["type"] == "execute":
                # Simule l'exécution
                code = cmd.get("code", "")
                print(f"    code: {code[:80]}...")
                
                # Si le code contient print, simule la sortie
                logs = []
                if "print(" in code:
                    # Extract print args (très simplifié)
                    import re
                    for m in re.finditer(r'print\(["\'](.+?)["\']\)', code):
                        logs.append(m.group(1))
                
                result = {
                    "ok": True,
                    "result": "executed",
                    "logs": logs,
                }
                print(f"    result: {result}")
                
                # Envoie le résultat
                requests.post(f"{BASE}/api/result", json={
                    "clientId": CLIENT_ID,
                    "commandId": cmd["id"],
                    "result": result,
                })
                print(f"    → result sent")
    else:
        print(f"  ← no commands (iter {i+1}/5)")
    time.sleep(1)

print("✓ simulation terminée")
