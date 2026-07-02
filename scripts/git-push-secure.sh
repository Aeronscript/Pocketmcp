#!/bin/bash
# ════════════════════════════════════════════════════════════
# Push sécurisé vers GitHub sans leak de token dans les logs
# Le token est lu depuis .z-ai-secrets/github-token (local, gitignored)
# ════════════════════════════════════════════════════════════
set -e

TOKEN_FILE="/home/z/my-project/.z-ai-secrets/github-token"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "❌ Token file not found: $TOKEN_FILE"
  echo "   Demande à l'utilisateur de fournir un token GitHub"
  exit 1
fi

TOKEN=$(cat "$TOKEN_FILE" | tr -d '[:space:]')

if [ -z "$TOKEN" ]; then
  echo "❌ Token file is empty"
  exit 1
fi

cd /home/z/my-project

# Configure le remote avec le token (ne s'affiche pas dans les logs grâce à git)
git remote set-url origin "https://Aeronscript:${TOKEN}@github.com/Aeronscript/Pocketmcp.git"

# Push
echo "=== push en cours ==="
git push origin main 2>&1 | tail -5

# Nettoie le remote immédiatement (le token ne reste pas dans la config git)
git remote set-url origin "https://github.com/Aeronscript/Pocketmcp.git"

echo ""
echo "✓ Push terminé, remote nettoyé (token retiré de la config git)"
