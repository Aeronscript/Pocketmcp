#!/bin/bash
# Lance pocketmcp-server en arrière-plan persistant
cd /home/z/my-project/mini-services/pocketmcp-server

# Tue l'instance précédente
pkill -f "bun.*pocketmcp-server/index" 2>/dev/null
sleep 1

# Lance avec setsid pour le détacher du shell
setsid bun index.ts > /tmp/pocketmcp.log 2>&1 < /dev/null &
echo $! > /tmp/pocketmcp.pid
disown

sleep 2
echo "Server PID: $(cat /tmp/pocketmcp.pid)"
echo "--- health check ---"
curl -s http://localhost:16384/health || echo "FAILED"
echo ""
