# PocketMCP — Guide Complet

**Auteur :** Aeronscript (Mohamed Amine)
**Version :** 0.1.0
**License :** MIT

> Serveur MCP Roblox mobile-first. Branche ton téléphone Android sur OpenCode, Codex, Claude ou AnyClaw via le routeur MC. 100% local, 0 dépendance cloud.

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation rapide (6 étapes)](#installation-rapide)
3. [Architecture](#architecture)
4. [Configuration du client IA](#configuration-du-client-ia)
5. [Outils MCP disponibles](#outils-mcp-disponibles)
6. [Bridge Lua — référence](#bridge-lua--référence)
7. [Dépannage](#dépannage)
8. [Sécurité](#sécurité)

---

## Prérequis

- **Android** 9+ avec au moins 4 Go de RAM (8 Go recommandé)
- **Termux** installé depuis [F-Droid](https://f-droid.org/packages/com.termux/) (NE PAS utiliser la version Play Store — obsolète)
- **Exécuteur Roblox mobile** : Delta, Hydrogen, KRNL Mobile ou Arceus X
- **Client IA compatible MCP** : OpenCode (avec routeur MC), Codex CLI, Claude Code, etc.
- **WiFi** (optionnel) pour partager le serveur avec ton PC

---

## Installation rapide

### Étape 1 — Installer Termux

Télécharge Termux depuis F-Droid : https://f-droid.org/packages/com.termux/

Ouvre Termux et lance :

```bash
pkg update && pkg upgrade -y
pkg install git nodejs curl python -y
```

### Étape 2 — Installer Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version  # doit afficher 1.3+
```

### Étape 3 — Cloner PocketMCP

```bash
git clone https://github.com/aeronscript/pocketmcp.git
cd pocketmcp
bun install
```

### Étape 4 — Démarrer le serveur

```bash
bun run dev
```

Le serveur démarre sur `http://localhost:16384`.

Ouvre Chrome mobile et va à : `http://localhost:16384`

### Étape 5 — Connecter Roblox

Dans Delta / Hydrogen / KRNL Mobile, exécute :

```lua
local url = "localhost:16384"
loadstring(game:HttpGet("http://" .. url .. "/script.luau"))()
```

Si WebSocket casse :

```lua
getgenv().DisableWebSocket = true
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()
```

### Étape 6 — Configurer le client IA

Dans ta config OpenCode / Codex :

```json
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}
```

Le routeur MC propage le serveur à Codex, Claude, AnyClaw, etc.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Ton téléphone Android                                  │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  Termux      │    │  PocketMCP Server            │  │
│  │              │    │  (Node.js + Bun)             │  │
│  │  - Node 18+  │───→│  Port 16384                  │  │
│  │  - Bun 1.3+  │    │                              │  │
│  │              │    │  - HTTP API /api/*           │  │
│  └──────────────┘    │  - WebSocket /ws             │  │
│                      │  - MCP endpoint /mcp         │  │
│  ┌──────────────┐    │  - Dashboard /               │  │
│  │  Chrome      │←──→│                              │  │
│  │  mobile      │    └──────────┬───────────────────┘  │
│  └──────────────┘               │                      │
│                                 │ WebSocket / HTTP     │
│  ┌──────────────┐               │                      │
│  │  Delta /     │←──────────────┘                      │
│  │  Hydrogen    │                                      │
│  │  (Roblox)    │                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
         ↑
         │ MCP HTTP+SSE
         ↓
┌─────────────────────────────────────────────────────────┐
│  Client IA (OpenCode / Codex / Claude / AnyClaw)        │
│  Connecté via le routeur MC                             │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration du client IA

### OpenCode (avec routeur MC)

Ajoute dans `~/.config/opencode/mcp.json` :

```json
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}
```

### Codex CLI

```bash
codex mcp add pocketmcp --transport http --url http://localhost:16384/mcp
```

### Claude Code

```bash
claude mcp add pocketmcp --transport http http://localhost:16384/mcp
```

### Claude Desktop

Édite `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}
```

---

## Outils MCP disponibles

| Outil | Description | Args |
|---|---|---|
| `execute_code` | Exécute du code Lua dans Roblox | `{ code, clientId? }` |
| `get_instances` | Liste les instances via sélecteur CSS-like | `{ selector }` |
| `decompile_script` | Décompile un LocalScript / ModuleScript | `{ path }` |
| `spy_remotes` | Active/désactive l'interception des RemoteEvents | `{ enabled, filter? }` |
| `click_gui` | Clique sur un bouton in-game par path | `{ path }` |
| `screenshot` | Capture l'écran Roblox | `{}` |
| `list_clients` | Liste les clients Roblox connectés | `{}` |
| `console_logs` | Récupère les logs récents du jeu | `{ level?, limit? }` |

---

## Bridge Lua — référence

### Variables globales configurables

Avant le `loadstring`, tu peux setter ces `getgenv()` :

| Variable | Défaut | Description |
|---|---|---|
| `getgenv().BridgeURL` | `"localhost:16384"` | URL du serveur PocketMCP |
| `getgenv().DisableWebSocket` | `false` | Force le HTTP polling (200ms) |
| `getgenv().EnableRemoteSpy` | `false` | Hook les FireServer / InvokeServer |

### Exemple complet

```lua
getgenv().BridgeURL = "localhost:16384"
getgenv().DisableWebSocket = true   -- si WebSocket casse
getgenv().EnableRemoteSpy = true    -- activer le spy

loadstring(game:HttpGet("http://localhost:16384/script.luau"))()
```

### Endpoints HTTP utilisés par le bridge

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/register` | POST | Enregistrement initial du client |
| `/api/poll` | POST | Récupération des commandes (HTTP polling) |
| `/api/result` | POST | Envoi du résultat d'une commande |
| `/api/heartbeat` | POST | Heartbeat 1s (FPS, ping) |
| `/api/remote` | POST | Log d'un RemoteEvent (si spy activé) |
| `/ws` | WS | Canal bidirectionnel (mode WebSocket) |

---

## Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier que le port 16384 est libre
lsof -i :16384

# Tuer le processus qui occupe le port
kill -9 $(lsof -t -i :16384)
```

### Le bridge ne se connecte pas

1. Vérifie que le serveur tourne : `curl http://localhost:16384/health`
2. Vérifie que ton exécuteur supporte `loadstring` + `HttpGet`
3. Force le HTTP polling : `getgenv().DisableWebSocket = true`
4. Vérifie les logs Termux — tu devrais voir `register` arriver

### L'IA ne voit pas le serveur MCP

1. Vérifie que le serveur répond : `curl http://localhost:16384/mcp`
2. Vérifie ta config client IA (URL + transport)
3. Redémarre le client IA après modification de config

### Partager avec ton PC sur le même WiFi

Lance le serveur avec :

```bash
bun run dev -- --host 0.0.0.0
```

Récupère l'IP de ton tél : `ifconfig wlan0`

Sur ton PC, configure le client IA avec : `http://192.168.x.x:16384/mcp`

---

## Sécurité

⚠ **Risque de ban Roblox** : tout exploit comporte un risque. Utilise un compte secondaire.

⚠ **Pas d'authentification** : le port 16384 n'a pas d'auth. Ne l'expose jamais sur internet. Uniquement LAN / VPN / SSH tunnel.

⚠ **Code exécutoire arbitraire** : le serveur permet d'exécuter n'importe quel code Lua dans Roblox. Utilise-le uniquement avec des clients IA de confiance.

---

## Crédits

- **Auteur** : Aeronscript (Mohamed Amine)
- **Inspiration** : [notpoiu/roblox-executor-mcp](https://github.com/notpoiu/roblox-executor-mcp)
- **License** : MIT

---

*PocketMCP n'est pas affilié à Roblox Corporation ni au projet notpoiu/roblox-executor-mcp.*
