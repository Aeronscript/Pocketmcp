#!/usr/bin/env python3
"""Test le backoff progressif : simule un client qui poll et montre l'évolution de pollInterval."""
import requests
import time

BASE = "http://localhost:16384"
CID = "cli_backoff_test"

# Register
requests.post(f"{BASE}/api/register", json={
    "clientId": CID, "playerName": "BackoffTest", "userId": 1,
    "placeId": 1, "jobId": "test", "transport": "HTTP Polling", "executor": "Delta",
    "supports": {"decompile": True, "drawing": True, "writefile": True,
                 "firebuttonclick": True, "firesignal": True, "screenshot": False, "webSocket": False}
})
print("✓ registered")

# Simule le backoff côté Python (le vrai bridge le fait en Lua)
# 100ms → 150ms → 225ms → 337ms → 506ms → 759ms → 1000ms (cap)
POLL_MIN = 0.1
POLL_MAX = 1.0
POLL_GROWTH = 1.5
current_poll = POLL_MIN

print(f"\n⏱  simulation backoff (polls sans commandes) :\n")

for i in range(8):
    # Poll (le serveur retourne [] car pas de commandes)
    r = requests.post(f"{BASE}/api/poll", json={"clientId": CID})
    cmds = r.json().get("commands", [])

    if len(cmds) == 0:
        # Backoff progressif
        new_poll = min(current_poll * POLL_GROWTH, POLL_MAX)
        print(f"  poll #{i+1}: {len(cmds)} cmd → {int(current_poll*1000)}ms → {int(new_poll*1000)}ms")
        current_poll = new_poll
    else:
        # Reset
        current_poll = POLL_MIN
        print(f"  poll #{i+1}: {len(cmds)} cmd → reset à {int(current_poll*1000)}ms")

    # Heartbeat avec pollInterval
    requests.post(f"{BASE}/api/heartbeat", json={
        "clientId": CID,
        "pollInterval": int(current_poll * 1000),
    })
    time.sleep(0.5)

# Maintenant simule une commande → reset
print(f"\n→ simulation commande reçue (reset à {int(POLL_MIN*1000)}ms)\n")
current_poll = POLL_MIN
requests.post(f"{BASE}/api/heartbeat", json={
    "clientId": CID,
    "pollInterval": int(current_poll * 1000),
})
time.sleep(1)

# Vérifie que le serveur a bien stocké le pollInterval
r = requests.get(f"{BASE}/api/clients")
clients = r.json().get("clients", [])
for c in clients:
    if c["clientId"] == CID:
        print(f"✓ serveur rapporte pollInterval = {c.get('pollInterval', '?')}ms pour {c['playerName']}")

print("\n✓ backoff test terminé")
