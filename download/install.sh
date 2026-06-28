#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════
# PocketMCP — Install 1-commande pour Termux
# Auteur: Aeronscript (Mohamed Amine)
# Usage:  bash <(curl -fsSL https://raw.githubusercontent.com/aeronscript/pocketmcp/main/install.sh)
# ════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  pocketmcp · 1-command install${NC}"
echo -e "${CYAN}  by aeronscript (mohamed amine)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# Vérifier Termux
if [ ! -d "/data/data/com.termux" ]; then
  echo -e "${RED}✗ Ce script doit être lancé dans Termux (Android)${NC}"
  echo -e "${YELLOW}  installe termux depuis f-droid.org${NC}"
  exit 1
fi

INSTALL_DIR="$HOME/pocketmcp"
REPO_URL="https://github.com/aeronscript/pocketmcp.git"

# 1. Mise à jour système
echo -e "${YELLOW}[1/5] mise à jour termux...${NC}"
pkg update -y >/dev/null 2>&1 && pkg upgrade -y >/dev/null 2>&1

# 2. Dépendances système
echo -e "${YELLOW}[2/5] installation git + node + curl...${NC}"
pkg install -y git nodejs curl >/dev/null 2>&1

# Vérifier Node
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}✗ Node.js ≥ 18 requis (actuel: $(node -v 2>/dev/null || 'none'))${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

# 3. Installer Bun
echo -e "${YELLOW}[3/5] installation bun...${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  # Ajouter au bashrc
  grep -q 'BUN_INSTALL' ~/.bashrc 2>/dev/null || echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
  grep -q 'BUN_INSTALL/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi
echo -e "${GREEN}  ✓ Bun $(bun --version)${NC}"

# 4. Cloner le repo
echo -e "${YELLOW}[4/6] clonage du serveur...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}  repo existant, mise à jour...${NC}"
  cd "$INSTALL_DIR"
  git pull >/dev/null 2>&1
else
  git clone "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1
  cd "$INSTALL_DIR"
fi

# 5. Installer les dépendances npm
echo -e "${YELLOW}[5/6] installation des dépendances (bun install)...${NC}"
if [ -f "package.json" ]; then
  bun install >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ dépendances installées${NC}"
  else
    echo -e "${RED}  ✗ échec bun install — essayez manuellement: cd ~/pocketmcp && bun install${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}  ⚠ package.json introuvable — skipped${NC}"
fi

# 6. Démarrer le serveur
echo -e "${YELLOW}[6/6] vérification finale...${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ pocketmcp installé !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}pour démarrer le serveur:${NC}"
echo -e "  ${GREEN}cd ~/pocketmcp && bun run dev${NC}"
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
