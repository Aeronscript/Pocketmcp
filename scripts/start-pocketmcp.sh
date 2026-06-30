#!/bin/bash
# Lance pocketmcp-server en arrière-plan persistant
cd /home/z/my-project/mini-services/pocketmcp-server

# Tue l'instance précédente
pkill -9 -f "bun.*pocketmcp-server/index" 2>/dev/null
sleep 1

# Lance avec nohup pour qu'il survive à la fin du shell
nohup bun index.ts > /tmp/pocketmcp.log 2>&1 < /dev/null &
echo $! > /tmp/pocketmcp.pid
disown

sleep 3
echo "Server PID: $(cat /tmp/pocketmcp.pid)"
echo "--- log ---"
cat /tmp/pocketmcp.log
echo "--- health check ---"
curl -s http://localhost:16384/health || echo "FAILED"
echo ""
