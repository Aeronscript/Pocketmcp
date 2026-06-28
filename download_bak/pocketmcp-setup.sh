#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════
# PocketMCP — Termux installer
# Auteur: Aeronscript (Mohamed Amine)
# Usage:  bash setup.sh
# ════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  pocketmcp · termux installer${NC}"
echo -e "${CYAN}  by aeronscript (mohamed amine)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# Vérifier qu'on est sur Termux
if [ ! -d "/data/data/com.termux" ]; then
  echo -e "${RED}✗ Ce script doit être lancé dans Termux (Android)${NC}"
  exit 1
fi

# 1. Mise à jour des paquets
echo -e "${YELLOW}[1/6] mise à jour des paquets termux...${NC}"
pkg update -y && pkg upgrade -y

# 2. Installation des dépendances système
echo -e "${YELLOW}[2/6] installation des dépendances système...${NC}"
pkg install -y git nodejs curl python

# Vérifier Node.js
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js ≥ 18 requis. Version actuelle: ${NODE_VERSION:-none}${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# 3. Installation de Bun
echo -e "${YELLOW}[3/6] installation de bun...${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  source ~/.bashrc 2>/dev/null || true
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}✓ Bun $(bun --version)${NC}"

# 4. Clonage du repo
echo -e "${YELLOW}[4/6] clonage du repo pocketmcp...${NC}"
if [ -d "$HOME/pocketmcp" ]; then
  echo -e "${YELLOW}  repo existant, pull des dernières modifs...${NC}"
  cd "$HOME/pocketmcp"
  git pull
else
  git clone https://github.com/aeronscript/pocketmcp.git "$HOME/pocketmcp"
  cd "$HOME/pocketmcp"
fi

# 5. Installation des dépendances
echo -e "${YELLOW}[5/6] installation des dépendances npm...${NC}"
bun install

# 6. Démarrage du serveur
echo -e "${YELLOW}[6/6] démarrage du serveur...${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ pocketmcp installé avec succès !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}prochaines étapes:${NC}"
echo ""
echo -e "  1. démarre le serveur:"
echo -e "     ${GREEN}cd ~/pocketmcp && bun run dev${NC}"
echo ""
echo -e "  2. ouvre le dashboard dans chrome mobile:"
echo -e "     ${GREEN}http://localhost:16384${NC}"
echo ""
echo -e "  3. colle ce script dans delta/hydrogen:"
echo -e "     ${GREEN}loadstring(game:HttpGet(\"http://localhost:16384/script.luau\"))()${NC}"
echo ""
echo -e "  4. configure ton client IA (opencode/codex) avec:"
echo -e "     ${GREEN}url: http://localhost:16384/mcp${NC}"
echo -e "     ${GREEN}transport: http${NC}"
echo ""
echo -e "${YELLOW}⚠ garde termux ouvert. utilise tmux pour le background.${NC}"
echo -e "${YELLOW}⚠ risque de ban roblox. utilise un compte secondaire.${NC}"
echo ""
