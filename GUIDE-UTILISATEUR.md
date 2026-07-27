# 📱 PocketMCP — Guide Utilisateur

> **PocketMCP, c'est quoi ?** C'est un outil qui te permet de contrôler Roblox depuis ton téléphone Android, en parlant avec une IA (Claude, OpenCode, Codex...). Tu lui demandes "change ma vitesse de marche à 60" et ça le fait. Directement dans le jeu.

**Par Aeronscript (Mohamed Amine)**

---

## 🎯 À qui s'adresse ce guide ?

Ce guide est pour toi si :
- Tu joues à Roblox sur Android
- Tu utilises un exécuteur (Delta, Hydrogen, KRNL...)
- Tu veux piloter Roblox avec une IA
- Tu n'es pas développeur — c'est OK, on y va étape par étape

---

## ⚙️ Prérequis (ce qu'il te faut avant de commencer)

### 1. Un téléphone Android
- **Version** : Android 9 ou plus
- **RAM** : 4 Go minimum (8 Go recommandés)
- **Stockage** : 500 Mo de libre

### 2. Termux (l'app qui fait tourner le serveur)
- **IMPORTANT** : télécharge Termux depuis **F-Droid** uniquement
- ❌ NE PAS télécharger depuis le Play Store (la version est obsolète et cassée)
- 👉 Lien : https://f-droid.org/packages/com.termux/

### 3. Un exécuteur Roblox mobile
N'importe lequel de ces 4 marche :
- **Delta** (recommandé, le plus stable)
- **Hydrogen**
- **KRNL Mobile**
- **Arceus X**

### 4. Une IA compatible MCP
Au choix :
- **OpenCode** (avec routeur MC activé)
- **Codex CLI**
- **Claude Code**
- **AnyClaw**

---

## 🚀 Installation en 5 minutes

### Étape 1 — Obtenir un code d'accès

Pour utiliser PocketMCP, il te faut un **code d'accès**. C'est comme un mot de passe qui te dit "tu as le droit d'utiliser ce tool".

**Comment l'obtenir ?**
- Demande-le à la personne qui t'a fait connaître PocketMCP
- Ou contacte l'auteur : aeronscriptlabs@gmail.com

Tu recevras un code qui ressemble à : `pmcp_xxxxxxxxxxxx`

> ⚠️ **Ce code est unique à toi**. Ne le partage pas. Une fois que tu l'as utilisé, il est lié à ton téléphone à vie.

### Étape 2 — Installer Termux

1. Va sur https://f-droid.org/packages/com.termux/ depuis ton téléphone
2. Clique sur "Download APK"
3. Installe l'APK (autorise l'installation depuis des sources inconnues si Android te le demande)
4. Ouvre Termux — tu verras un écran noir avec du texte

### Étape 3 — Installer PocketMCP en 1 commande

Dans Termux, **colle cette commande** (remplace `VOTRE_CODE` par ton code) :

```bash
bash <(curl -fsSL https://pocketmcp.onrender.com/api/install.sh?code=VOTRE_CODE)
```

**Exemple** si ton code est `pmcp_abc123def456` :
```bash
bash <(curl -fsSL https://pocketmcp.onrender.com/api/install.sh?code=pmcp_abc123def456)
```

Attends 3-5 minutes. Tu vas voir :
- ✓ Node.js installé
- ✓ Bun installé
- ✓ Serveur téléchargé
- ✓ pocketmcp installé dans ~/pocketmcp !

### Étape 4 — Démarrer le serveur

Toujours dans Termux, tape :

```bash
cd ~/pocketmcp && bun run index.min.js
```

Tu vas voir un message comme :
```
🔐 ADMIN CODE: adm_xxxxxxxxxxxxxx
```

**Note ce code quelque part** — c'est ton code admin serveur. Tu en auras besoin pour le dashboard.

Le serveur tourne tant que tu ne fermes pas Termux. **Laisse Termux ouvert**.

### Étape 5 — Connecter Roblox

1. Ouvre ton exécuteur Roblox (Delta, Hydrogen, etc.)
2. Lance une partie Roblox
3. Dans l'exécuteur, colle ce code :

```lua
getgenv().PocketMCPCode = "VOTRE_CODE_ADMIN"
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()
```

**Remplace `VOTRE_CODE_ADMIN`** par le code `adm_xxx` que tu as noté à l'étape 4.

4. Exécute le script
5. Tu devrais voir dans la console de l'exécuteur : `[pocketmcp] connecté · cli_xxxx`

**C'est fait !** 🎉 Le bridge entre Roblox et PocketMCP est connecté.

---

## 🤖 Utiliser PocketMCP avec une IA

Maintenant que le serveur tourne et que Roblox est connecté, tu peux utiliser une IA pour contrôler le jeu.

### Exemples de ce que tu peux demander à l'IA

Une fois ton IA connectée au serveur MCP (`http://localhost:16384/mcp`), tu peux lui demander :

**Exécuter du code Lua :**
> "Change ma vitesse de marche à 60"

L'IA va exécuter : `game.Players.LocalPlayer.Character.Humanoid.WalkSpeed = 60`

**Espionner les RemoteEvents :**
> "Montre-moi tous les RemoteEvents qui sont appelés quand j'achète quelque chose"

L'IA va activer le spy et te montrer les remotes en temps réel.

**Décompiler un script :**
> "Décompile le script LocalScript dans StarterPlayer"

L'IA va te retourner le code source du script.

**Analyser le jeu :**
> "Analyse ce jeu et dis-moi quelles sont les failles potentielles"

L'IA va scanner le jeu et te lister les remotes qui font confiance au client, les race conditions, etc.

**Contrôler ton perso :**
> "Téléporte-moi à la position (100, 50, 200)"

L'IA va exécuter : `game.Players.LocalPlayer.Character.HumanoidRootPart.CFrame = CFrame.new(100, 50, 200)`

### Les 14 outils disponibles

| Outil | Ce qu'il fait |
|-------|---------------|
| **execute_code** | Exécute du code Lua dans Roblox |
| **decompile_script** | Décompile un script (voit le code source) |
| **get_instances** | Explore l'arbre du jeu |
| **spy_remotes** | Espionne les RemoteEvents |
| **list_remotes** | Liste les remotes spyés |
| **click_gui** | Clique sur un bouton GUI à distance |
| **screenshot** | Prend un screenshot (PC seulement) |
| **get_player_info** | Infos sur un joueur (pos, vie, équipe) |
| **list_clients** | Liste les clients connectés |
| **get_logs** | Récupère les logs |
| **analyze_game** | Analyse profondément le jeu |
| **find_gamepass_logic** | Cherche les checks gamepass |
| **stealth_setup** | Protections anti-anti-cheat |
| **player_control** | Walkspeed, noclip, teleport, autoclick |

---

## 📊 Le Dashboard (page web de contrôle)

PocketMCP a un dashboard web où tu peux voir ce qui se passe en direct.

### Ouvrir le dashboard

1. Sur ton téléphone, ouvre ton navigateur (Chrome, Firefox...)
2. Va à : **http://localhost:16384**

Tu vas voir :
- **Clients connectés** : la liste des bridges Roblox actifs
- **Logs live** : ce qui se passe en temps réel
- **Outils MCP** : la liste des 14 outils
- **Bridge script** : le code à coller dans Roblox

### Gérer tes codes d'accès

Dans le dashboard, tu peux :
- **Générer un nouveau code d'appairage** (bouton "↻ générer un nouveau code")
- **Voir les codes temporaires** actifs
- **Révoquer un code** si tu penses qu'il a fuité

---

## 🔧 Problèmes courants et solutions

### "Le script ne s'exécute pas dans l'exécuteur"

**Solution** :
1. Vérifie que tu as bien remplacé `VOTRE_CODE_ADMIN` par le code `adm_xxx`
2. Vérifie que Termux est ouvert et le serveur tourne
3. Redémarre l'exécuteur et réessaie

### "L'IA ne se connecte pas au serveur"

**Solution** :
1. Vérifie que l'IA est configurée avec l'URL : `http://localhost:16384/mcp`
2. Vérifie que Termux affiche "pocketmcp v0.5 démarré sur http://0.0.0.0:16384"
3. Si tu es sur PC et le serveur sur ton tél : utilise l'IP de ton tél au lieu de `localhost` (ex: `http://192.168.1.50:16384/mcp`)

### "Le serveur affiche 'pairing_required'"

**Solution** : Ton code d'appairage est invalide ou expiré. Demande un nouveau code à l'auteur ou génère-en un depuis le dashboard (si tu es admin).

### "Le dashboard affiche 'aucun client connecté'"

**Solution** :
1. Vérifie que tu as bien exécuté le bridge dans Roblox
2. Vérifie que tu vois `[pocketmcp] connecté` dans la console de l'exécuteur
3. Le dashboard rafraîchit toutes les 2 secondes — patiente

### "Tout est lent"

**Solution** :
1. Ferme les autres apps en arrière-plan
2. Vérifie que tu as au moins 4 Go de RAM libre
3. Si tu es en WebSocket, passe en HTTP polling (plus stable sur mobile)

### "J'ai perdu mon code admin"

**Solution** :
1. Dans Termux, tape : `cat ~/.pocketmcp.env`
2. Tu verras ton code admin `adm_xxx`

Si tu veux le révoquer et en générer un nouveau :
```bash
cd ~/pocketmcp
bun index.ts --reset-admin
# Puis redémarre :
bun index.ts
```

---

## ⚠️ Avertissements importants

### Risque de ban Roblox
L'utilisation d'un exécuteur est contre les ToS de Roblox. **Utilise un compte secondaire** pour tester. L'auteur décline toute responsabilité en cas de ban.

### Garde Termux ouvert
Le serveur tourne **uniquement tant que Termux est ouvert**. Si tu fermes Termux, le serveur s'arrête. Pour le garder en arrière-plan :
- Utilise `tmux` (cherche "termux tmux" sur YouTube)
- Ou désactive l'optimisation batterie pour Termux dans les paramètres Android

### WiFi pas obligatoire
PocketMCP marche **100% en local** sur ton téléphone. Tu n'as pas besoin d'internet après l'installation initiale. Le serveur parle directement à Roblox via `localhost`.

---

## 🆘 Besoin d'aide ?

- **Email** : aeronscriptlabs@gmail.com
- **GitHub** : https://github.com/Aeronscript/Pocketmcp

---

## 📝 Récapitulatif express

| Étape | Commande / Action |
|-------|-------------------|
| 1. Obtenir un code | Contacter l'auteur |
| 2. Installer Termux | Télécharger depuis F-Droid |
| 3. Installer PocketMCP | `bash <(curl -fsSL https://pocketmcp.onrender.com/api/install.sh?code=VOTRE_CODE)` |
| 4. Démarrer le serveur | `cd ~/pocketmcp && bun run index.min.js` |
| 5. Connecter Roblox | Coller le bridge dans l'exécuteur |
| 6. Ouvrir le dashboard | http://localhost:16384 dans le navigateur |
| 7. Connecter l'IA | URL MCP : http://localhost:16384/mcp |

**C'est tout !** Tu es prêt à utiliser PocketMCP. 🚀

---

*PocketMCP v0.5 · Copyright (c) 2026 Aeronscript · All Rights Reserved*
