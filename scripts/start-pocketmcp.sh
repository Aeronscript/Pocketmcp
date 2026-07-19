#!/bin/bash
# Lance pocketmcp-server en arrière-plan persistant (depuis la racine du repo)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../mini-services/pocketmcp-server"
cd "$SERVER_DIR"

# Tue l'instance précédente
pkill -9 -f "bun.*pocketmcp-server/index" 2>/dev/null || true
sleep 1

# Lance avec nohup pour qu'il survive à la fin du shell
LOG_FILE="${POCKETMCP_LOG:-/tmp/pocketmcp.log}"
nohup bun index.ts > "$LOG_FILE" 2>&1 < /dev/null &
echo $! > /tmp/pocketmcp.pid
disown

sleep 3
echo "Server PID: $(cat /tmp/pocketmcp.pid)"
echo "--- log ---"
cat "$LOG_FILE"
echo "--- health check ---"
curl -s http://localhost:16384/health || echo "FAILED"
echo ""
