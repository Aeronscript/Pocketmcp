import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// GET /api/install.sh?code=xxx
// Protégé : nécessite un code valide (admin ou temporaire)

const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");

interface AuthData { adminHash: string; tempCodes: any[]; }

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function loadAuth(): AuthData {
  try { if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch {}
  return { adminHash: "", tempCodes: [] };
}

function isValidCode(code: string): boolean {
  if (!code) return false;
  const data = loadAuth();
  if (hashCode(code) === data.adminHash) return true;
  const temp = (data.tempCodes || []).find((t: any) => t.code === code && t.claimed);
  return !!temp;
}

const INSTALL_SCRIPT = `#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════
# PocketMCP — Install 1-commande pour Termux
# Auteur: Aeronscript (Mohamed Amine)
# Le serveur est téléchargé depuis pmcp.space-z.ai
# ════════════════════════════════════════════════════════════

set -e

GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
CYAN='\\033[0;36m'
NC='\\033[0m'

SITE_URL="https://pmcp.space-z.ai"
INSTALL_DIR="$HOME/pocketmcp"
BUNDLE_URL="$SITE_URL/api/server-bundle?code=USER_CODE"

echo -e "\${CYAN}═══════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  pocketmcp · install depuis pmcp.space-z.ai\${NC}"
echo -e "\${CYAN}  by aeronscript (mohamed amine)\${NC}"
echo -e "\${CYAN}═══════════════════════════════════════════════════\${NC}"
echo ""

if [ ! -d "/data/data/com.termux" ]; then
  echo -e "\${RED}✗ Ce script doit être lancé dans Termux (Android)\${NC}"
  exit 1
fi

echo -e "\${YELLOW}[1/7] mise à jour termux...\${NC}"
pkg update -y >/dev/null 2>&1 && pkg upgrade -y >/dev/null 2>&1

echo -e "\${YELLOW}[2/7] installation node + curl + tar...\${NC}"
pkg install -y nodejs curl tar >/dev/null 2>&1

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "\${RED}✗ Node.js ≥ 18 requis\${NC}"
  exit 1
fi
echo -e "\${GREEN}  ✓ Node.js $(node -v)\${NC}"

echo -e "\${YELLOW}[3/7] installation bun...\${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  grep -q 'BUN_INSTALL' ~/.bashrc 2>/dev/null || echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
  grep -q 'BUN_INSTALL/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi
echo -e "\${GREEN}  ✓ Bun $(bun --version)\${NC}"

echo -e "\${YELLOW}[4/7] téléchargement du serveur...\${NC}"
rm -rf "$INSTALL_DIR" 2>/dev/null
mkdir -p "$INSTALL_DIR"

TMP_FILE="/tmp/pocketmcp-server.tar.gz"
HTTP_CODE=$(curl -sL -w "%{http_code}" -o "$TMP_FILE" "$BUNDLE_URL" 2>/dev/null)

if [ "$HTTP_CODE" != "200" ] || [ ! -s "$TMP_FILE" ]; then
  echo -e "\${RED}✗ échec téléchargement (HTTP $HTTP_CODE)\${NC}"
  exit 1
fi
echo -e "\${GREEN}  ✓ bundle téléchargé ($(du -h "$TMP_FILE" | cut -f1))\${NC}"

echo -e "\${YELLOW}[5/7] extraction...\${NC}"
cd "$INSTALL_DIR"
tar xzf "$TMP_FILE" 2>/dev/null
if [ -d "pocketmcp-server" ]; then
  cp -r pocketmcp-server/* . 2>/dev/null
  rm -rf pocketmcp-server
fi
rm -f "$TMP_FILE"

if [ ! -f "index.min.js" ] || [ ! -f "bridge.lua" ]; then
  echo -e "\${RED}✗ fichiers serveur manquants\${NC}"
  exit 1
fi
echo -e "\${GREEN}  ✓ fichiers extraits\${NC}"

echo -e "\${YELLOW}[6/7] installation des dépendances...\${NC}"
if [ -f "package.json" ]; then
  bun install 2>&1 | tail -1
  echo -e "\${GREEN}  ✓ dépendances installées\${NC}"
fi

echo -e "\${YELLOW}[7/7] vérification finale...\${NC}"
echo ""
echo -e "\${GREEN}═══════════════════════════════════════════════════\${NC}"
echo -e "\${GREEN}  ✓ pocketmcp installé dans ~/pocketmcp !\${NC}"
echo -e "\${GREEN}═══════════════════════════════════════════════════\${NC}"
echo ""
echo -e "\${CYAN}pour démarrer le serveur:\${NC}"
echo -e "  \${GREEN}cd ~/pocketmcp && bun run index.min.js\${NC}"
echo ""
echo -e "\${CYAN}le serveur affichera votre code d'auth (adm_xxx)\${NC}"
echo ""
echo -e "\${CYAN}puis dans roblox:\${NC}"
echo -e "  \${GREEN}getgenv().PocketMCPCode = \\"VOTRE_CODE\\"\${NC}"
echo -e "  \${GREEN}loadstring(game:HttpGet(\\"http://localhost:16384/script.luau\\"))()\${NC}"
echo ""
echo -e "\${CYAN}dashboard:\${NC}"
echo -e "  \${GREEN}http://localhost:16384\${NC}"
echo ""
echo -e "\${YELLOW}⚠ garde termux ouvert. utilise tmux pour le background.\${NC}"
echo -e "\${YELLOW}⚠ risque de ban roblox. compte secondaire recommandé.\${NC}"
echo ""
echo -e "\${CYAN}by aeronscript (mohamed amine) · v0.3.0\${NC}"
echo ""
`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || req.headers.get("Authorization")?.replace("Bearer ", "") || "";
  if (!isValidCode(code)) {
    return NextResponse.json(
      { ok: false, error: "code d'accès requis — usage: bash <(curl -fsSL https://pmcp.space-z.ai/api/install.sh?code=VOTRE_CODE)" },
      { status: 403 }
    );
  }
  const script = INSTALL_SCRIPT.replace(/USER_CODE/g, code);
  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": 'inline; filename="install.sh"',
      "Cache-Control": "no-cache",
    },
  });
}
