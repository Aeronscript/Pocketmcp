#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════
# PocketMCP — Install local (sans GitHub)
# Auteur: Aeronscript (Mohamed Amine)
#
# Usage:
#   1. télécharge pocketmcp-bundle.tar.gz sur ton tél
#   2. ouvre termux et lance:
#        cd ~
#        tar xzf /storage/emulated/0/Download/pocketmcp-bundle.tar.gz
#        cd pocketmcp
#        bash install-local.sh
# ════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  pocketmcp · install local (sans github)${NC}"
echo -e "${CYAN}  by aeronscript (mohamed amine)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# Vérifier Termux
if [ ! -d "/data/data/com.termux" ]; then
  echo -e "${RED}✗ Ce script doit être lancé dans Termux (Android)${NC}"
  exit 1
fi

# Vérifier qu'on est dans le bon dossier
if [ ! -f "./index.ts" ] || [ ! -f "./bridge.lua" ]; then
  echo -e "${RED}✗ Fichiers du serveur introuvables${NC}"
  echo -e "${YELLOW}  lance ce script depuis le dossier pocketmcp qui contient index.ts et bridge.lua${NC}"
  exit 1
fi

# 1. Mise à jour système
echo -e "${YELLOW}[1/4] mise à jour termux...${NC}"
pkg update -y >/dev/null 2>&1 && pkg upgrade -y >/dev/null 2>&1

# 2. Dépendances système
echo -e "${YELLOW}[2/4] installation git + node + curl...${NC}"
pkg install -y nodejs curl >/dev/null 2>&1

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}✗ Node.js ≥ 18 requis (actuel: $(node -v 2>/dev/null || 'none'))${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

# 3. Installer Bun
echo -e "${YELLOW}[3/4] installation bun...${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  grep -q 'BUN_INSTALL' ~/.bashrc 2>/dev/null || echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
  grep -q 'BUN_INSTALL/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi
echo -e "${GREEN}  ✓ Bun $(bun --version)${NC}"

# 4. Vérifier les fichiers du serveur
echo -e "${YELLOW}[4/4] vérification des fichiers...${NC}"
echo -e "${GREEN}  ✓ index.ts présent${NC}"
echo -e "${GREEN}  ✓ bridge.lua présent${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ pocketmcp installé !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}pour démarrer le serveur:${NC}"
echo -e "  ${GREEN}bun run dev${NC}"
echo ""
echo -e "${CYAN}puis dans roblox (delta/hydrogen), colle:${NC}"
echo -e "  ${GREEN}loadstring(game:HttpGet(\"http://localhost:16384/script.luau\"))()${NC}"
echo ""
echo -e "${CYAN}dashboard:${NC}"
echo -e "  ${GREEN}http://localhost:16384${NC}"
echo ""
echo -e "${CYAN}config ton client IA (opencode/codex) avec:${NC}"
echo -e "  ${GREEN}url: http://localhost:16384/mcp${NC}"
echo -e "  ${GREEN}transport: http${NC}"
echo ""
echo -e "${YELLOW}⚠ garde termux ouvert. utilise tmux pour le background.${NC}"
echo -e "${YELLOW}⚠ risque de ban roblox. compte secondaire recommandé.${NC}"
echo ""
