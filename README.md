# PocketMCP

> Serveur MCP Roblox mobile-first. Branche ton téléphone Android (Termux + Delta/Hydrogen) sur OpenCode, Codex, Claude ou AnyClaw. Dashboard live, exécution Lua, RemoteSpy, et plus — 100% local.

**Par Aeronscript (Mohamed Amine)**

---

## ⚡ Quick Start

### Mobile (Android)

```bash
# 1. Installe Termux depuis F-Droid (PAS le Play Store)
# 2. Dans Termux :
bash <(curl -fsSL https://pocketmcp.onrender.com/api/install.sh?code=VOTRE_CODE_SITE)
# 3. Démarre le serveur
cd ~/pocketmcp && bun run index.min.js
```

```lua
-- 4. Le serveur affiche un code adm_xxx au démarrage
-- 5. Dans Delta/Hydrogen/KRNL Mobile :
getgenv().PocketMCPCode = "votre_code_serveur"
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()
```

### PC (Windows/Mac/Linux)

```bash
curl -fsSL https://bun.sh/install | bash
mkdir ~/pocketmcp && cd ~/pocketmcp
curl -sL https://pocketmcp.onrender.com/api/server-bundle?code=VOTRE_CODE_SITE -o server.tar.gz
tar xzf server.tar.gz && mv pocketmcp-server/* . && rm -rf pocketmcp-server server.tar.gz
bun install
bun run index.min.js
```

---

## 🔐 Deux systèmes d'authentification

| Système | Codes | Utilisation |
|---|---|---|
| **Site** (pocketmcp.onrender.com) | `Robloxmcp-xxx` (admin) / `pmcp_xxx` (temp) | Login sur le site web |
| **Serveur** (localhost:16384) | `adm_xxx` (admin) / `tmp_xxx` (temp) | Bridge Lua + dashboard serveur |

- Code site → pour accéder au site pocketmcp.onrender.com
- Code serveur → pour le bridge dans Roblox (`getgenv().PocketMCPCode`)
- Les codes serveur `tmp_xxx` sont à **usage unique** (premier utilisateur = propriétaire à vie)
- Durée configurable : 1h à 5h (max)
- **Rate limiting** : 5 tentatives de login / 15 min sur le site

---

## 🎯 Features

- **10 outils MCP** : execute_code, decompile_script, get_instances, spy_remotes, list_remotes, click_gui, screenshot, get_player_info, list_clients, get_logs
- **Auto-détection WebSocket** — bascule auto sur HTTP polling 100ms si WS mort (cas sur mobile)
- **Auto-fallback HTTP** — `request()` → `game:HttpGet`/`game:HttpPost` si instable
- **Backoff progressif** — 100ms → 1s en idle (évite rate limits + batterie)
- **Authentification serveur** — code admin (SHA-256) + codes temporaires à usage unique
- **Whitelist clients** — seuls les clientIds enregistrés peuvent communiquer
- **Dashboard serveur** — icônes SVG, logs live, gestion des codes avec durée configurable
- **Terminal web** — xterm.js live sur le site
- **Serveur minifié** — distribué en `index.min.js` (anti-fork, illisible)
- **Mobile-first** — responsive 100%, touch targets 44px+

---

## 🔒 Sécurité

- **Serveur** : bind `127.0.0.1` par défaut (jamais exposé sur le réseau), auth sur tous les endpoints, codes hashés (SHA-256), CORS restreint aux origins localhost
- **Site** : login obligatoire, rate limiting, codes à usage unique, validation Gmail
- **Distribution** : serveur minifié, repo GitHub privé, bundle depuis le site uniquement (toutes les routes `/api/download`, `/api/server-bundle`, `/api/install.sh` exigent un code valide)
- **LICENSE** : All Rights Reserved — fork, copie, redistribution interdits

> ⚠️ `data/auth-codes.json` est **gitignoré** (contient le hash du code admin). Il est généré automatiquement au 1er lancement si absent. Ne le commitez jamais.

⚠ **Risque de ban Roblox** — utilisez un compte secondaire.

---

## 📦 Distribution

Le serveur est distribué **uniquement** depuis le site `pocketmcp.onrender.com` :
- `/api/install.sh?code=VOTRE_CODE` — script d'installation 1-commande
- `/api/server-bundle?code=VOTRE_CODE` — serveur MCP minifié en tar.gz

Le repo GitHub est **privé** et sert uniquement de backup/versioning.

### Variables d'environnement (serveur MCP)

| Variable | Défaut | Description |
|---|---|---|
| `POCKETMCP_HOST` | `127.0.0.1` | Interface d'écoute. Mettre `0.0.0.0` **uniquement** pour bridge depuis un émulateur sur le même réseau (expose le port sur le LAN). |
| `POCKETMCP_PORT` | `16384` | Port d'écoute. |
| `POCKETMCP_ADMIN_CODE` | auto-généré | Code admin du serveur (`adm_xxx`). |

---

## 📝 License

Copyright (c) 2026 Aeronscript. All Rights Reserved.
Fork, copie, redistribution interdits sans autorisation explicite. Voir [LICENSE](LICENSE).

Non affilié à Roblox Corporation.

---

## 👤 Auteur

**Aeronscript (Mohamed Amine)**
Contact : aeronscriptlabs@gmail.com
