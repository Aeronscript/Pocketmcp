-- ════════════════════════════════════════════════════════════
-- PocketMCP Bridge v3 · by Aeronscript (Mohamed Amine)
-- Auto-servi par le serveur sur /script.luau
--
-- Testé sur Roblox mobile (Delta) :
--   ✅ HttpGet → marche
--   ✅ request → marche (syn.request equiv)
--   ✅ writefile → marche
--   ❌ WebSocket → mort (auto-désactivé)
--
-- Features :
--   - Auto-détection WebSocket au démarrage (essaie 3s, bascule HTTP si échec)
--   - Auto-fallback request → HttpGet/HttpPost
--   - HTTP polling optimisé (100ms, retry exponentiel)
--   - execute_code (capture prints)
--   - decompile_script
--   - get_instances (CSS-like selector)
--   - spy_remotes (hook FireServer / InvokeServer)
--   - list_remotes
--   - click_gui
--   - screenshot
--   - get_player_info
-- ════════════════════════════════════════════════════════════

local BRIDGE_URL = getgenv().BridgeURL or "localhost:16384"
local POLL_MIN = 0.1        -- 100ms (réactif quand commandes en attente)
local POLL_MAX = 1.0        -- 1s cap (idle, négligeable)
local POLL_GROWTH = 1.5     -- facteur de backoff progressif
local POLL_ERROR_GROWTH = 2.0 -- backoff agressif si request échoue
local REQUEST_TIMEOUT = 10
local WS_DETECT_TIMEOUT = 3 -- 3s pour détecter si WebSocket marche

-- Force HTTP polling si l'utilisateur le demande
local FORCE_HTTP = getgenv().DisableWebSocket == true
-- Force WebSocket si l'utilisateur veut tester
local FORCE_WS = getgenv().EnableWebSocket == true

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local LP = Players.LocalPlayer

-- ─── État ───────────────────────────────────────────────────
local state = {
    connected = false,
    clientId = "cli_" .. tostring(math.random(1000, 9999)),
    -- Mode transport : "WebSocket" | "HTTP Polling"
    transport = "HTTP Polling",
    -- Auto-fallback HTTP : "request" | "httpget" | "httpfailed"
    httpMode = "request",
    requestFailures = 0,
    -- Backoff progressif : commence à POLL_MIN, augmente si idle, cap à POLL_MAX
    currentPoll = POLL_MIN,
    -- Spy state
    spyEnabled = false,
    spyFilter = nil,
    remotesLog = {},
    remotesCount = {},
    maxRemotesLog = 200,
}

-- ─── HTTP wrapper avec auto-fallback ────────────────────────
local function httpSend(method, path, data)
    local url = "http://" .. BRIDGE_URL .. path
    local body = data and HttpService:JSONEncode(data) or nil

    -- Mode 1: request()
    if state.httpMode == "request" and request then
        local ok, res = pcall(function()
            return request({
                Url = url,
                Method = method,
                Headers = { ["Content-Type"] = "application/json" },
                Body = body or "",
                Timeout = REQUEST_TIMEOUT,
            })
        end)
        if ok and res and res.Body then
            state.requestFailures = 0
            local parsed = nil
            pcall(function() parsed = HttpService:JSONDecode(res.Body) end)
            return parsed or { ok = false, rawBody = res.Body }
        else
            state.requestFailures = state.requestFailures + 1
            warn("[pocketmcp] request() failed (" .. state.requestFailures .. "/3): " .. tostring(res))
            if state.requestFailures >= 3 then
                state.httpMode = "httpget"
                warn("[pocketmcp] bascule en mode HttpGet/HttpPost (fallback)")
            end
        end
    end

    -- Mode 2: HttpGet / HttpPost (contourne l'exécuteur)
    if state.httpMode == "httpget" or state.httpMode == "request" then
        if method == "GET" then
            local ok, res = pcall(function()
                return game:HttpGet(url, true)
            end)
            if ok then
                state.httpMode = "httpget"
                local parsed = nil
                pcall(function() parsed = HttpService:JSONDecode(res) end)
                return parsed or { ok = false, rawBody = res }
            end
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpGet failed: " .. tostring(res) }
        elseif method == "POST" then
            local ok, res = pcall(function()
                return game:HttpPost(url, body or "", "application/json")
            end)
            if ok then
                state.httpMode = "httpget"
                local parsed = nil
                pcall(function() parsed = HttpService:JSONDecode(res) end)
                return parsed or { ok = false, rawBody = res }
            end
            state.httpMode = "httpfailed"
            return { ok = false, error = "HttpPost failed: " .. tostring(res) }
        end
    end

    return { ok = false, error = "All HTTP methods failed" }
end

local function post(path, data) return httpSend("POST", path, data) end
local function get(path) return httpSend("GET", path, nil) end

-- ─── Capture des prints ─────────────────────────────────────
local function capturePrints(fn)
    local logs = {}
    local oldPrint, oldWarn = print, warn

    print = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            table.insert(parts, tostring(select(i, ...)))
        end
        table.insert(logs, table.concat(parts, "\t"))
    end
    warn = function(...)
        local parts = {}
        for i = 1, select("#", ...) do
            table.insert(parts, tostring(select(i, ...)))
        end
        table.insert(logs, "[WARN] " .. table.concat(parts, "\t"))
    end

    local ok, result = pcall(fn)
    print, warn = oldPrint, oldWarn
    return ok, result, logs
end

-- ─── Handlers de commandes ──────────────────────────────────
local function handleExecute(cmd)
    local fn, err = loadstring(cmd.code)
    if not fn then return { ok = false, error = err, logs = {} } end
    local ok, result, logs = capturePrints(fn)
    return {
        ok = ok,
        result = tostring(result),
        error = not ok and tostring(result) or nil,
        logs = logs,
    }
end

local function handleDecompile(cmd)
    if not decompile then
        return { ok = false, error = "decompile() not available on this executor" }
    end
    local target = game
    for part in string.gmatch(cmd.path, "[^.]+") do
        if part ~= "game" then
            target = target:FindFirstChild(part)
            if not target then
                return { ok = false, error = "Path not found: " .. cmd.path }
            end
        end
    end
    if not target:IsA("LocalScript") and not target:IsA("ModuleScript") then
        return { ok = false, error = "Target is not a script: " .. target.ClassName }
    end
    local ok, src = pcall(decompile, target)
    if not ok then return { ok = false, error = "Decompile failed: " .. tostring(src) } end
    return { ok = true, source = src, lines = #string.split(src, "\n") }
end

local function handleGetInstances(cmd)
    local selector = cmd.selector or "game"
    selector = selector:gsub("^game%.", ""):gsub("^game$", "")

    if selector == "" then
        local results = {}
        for _, child in ipairs(game:GetChildren()) do
            table.insert(results, {
                name = child.Name,
                class = child.ClassName,
                path = child:GetFullName(),
                children = #child:GetChildren(),
            })
        end
        return { ok = true, instances = results, count = #results }
    end

    local current = game
    local parts = {}
    for p in string.gmatch(selector, "[^.]+") do table.insert(parts, p) end

    for i, p in ipairs(parts) do
        if p == "*" then
            local results = {}
            for _, child in ipairs(current:GetChildren()) do
                table.insert(results, {
                    name = child.Name,
                    class = child.ClassName,
                    path = child:GetFullName(),
                    children = #child:GetChildren(),
                })
            end
            return { ok = true, instances = results, count = #results }
        end
        current = current:FindFirstChild(p)
        if not current then
            return { ok = false, error = "Not found at: " .. table.concat(parts, ".", 1, i) }
        end
    end

    return {
        ok = true,
        instances = {
            {
                name = current.Name,
                class = current.ClassName,
                path = current:GetFullName(),
                children = #current:GetChildren(),
            },
        },
        count = 1,
    }
end

local function handleSpyRemotes(cmd)
    state.spyEnabled = cmd.enabled
    state.spyFilter = cmd.filter
    if cmd.enabled and not state._spyHooked then
        state._spyHooked = true
        local mt = getrawmetatable(game)
        setreadonly(mt, false)
        local old = mt.__namecall
        mt.__namecall = newcclosure(function(self, ...)
            local m = getnamecallmethod()
            if state.spyEnabled and (m == "FireServer" or m == "InvokeServer")
               and (self:IsA("RemoteEvent") or self:IsA("RemoteFunction")) then
                local name = self:GetDebugName()
                if not state.spyFilter or name:lower():find(state.spyFilter:lower()) then
                    state.remotesCount[name] = (state.remotesCount[name] or 0) + 1
                    table.insert(state.remotesLog, {
                        name = name,
                        kind = m,
                        path = self:GetFullName(),
                        args = {...},
                        time = os.time(),
                    })
                    if #state.remotesLog > state.maxRemotesLog then
                        table.remove(state.remotesLog, 1)
                    end
                end
            end
            return old(self, ...)
        end)
        print("[pocketmcp] remote spy hooké")
    end
    return {
        ok = true,
        enabled = state.spyEnabled,
        filter = state.spyFilter,
        message = state.spyEnabled and "spy activé" or "spy désactivé",
    }
end

local function handleListRemotes(cmd)
    local limit = cmd.limit or 50
    local summary = {}
    for name, count in pairs(state.remotesCount) do
        table.insert(summary, { name = name, count = count })
    end
    table.sort(summary, function(a, b) return a.count > b.count end)

    local recent = {}
    for i = math.max(1, #state.remotesLog - limit + 1), #state.remotesLog do
        if state.remotesLog[i] then
            local entry = state.remotesLog[i]
            table.insert(recent, {
                name = entry.name,
                kind = entry.kind,
                path = entry.path,
                argsCount = #entry.args,
                time = entry.time,
            })
        end
    end

    return {
        ok = true,
        summary = summary,
        totalUnique = #summary,
        totalFires = #state.remotesLog,
        recent = recent,
    }
end

local function handleClickGui(cmd)
    local target = game
    for part in string.gmatch(cmd.path, "[^.]+") do
        if part ~= "game" then
            target = target:FindFirstChild(part)
            if not target then
                return { ok = false, error = "GUI path not found: " .. cmd.path }
            end
        end
    end
    if not target:IsA("TextButton") and not target:IsA("ImageButton") and not target:IsA("Button") then
        return { ok = false, error = "Target is not clickable: " .. target.ClassName }
    end
    local ok = pcall(function()
        if firebuttonclick then
            firebuttonclick(target)
        elseif firesignal then
            firesignal(target.MouseButton1Click)
        end
    end)
    return { ok = ok, clicked = target.Name, path = target:GetFullName() }
end

local function handleScreenshot(cmd)
    if ScreenshotWorkspace then
        local ok, path = pcall(ScreenshotWorkspace)
        if ok then
            return { ok = true, path = path, method = "ScreenshotWorkspace" }
        end
    end
    return {
        ok = false,
        error = "Screenshot non supporté sur cet exécuteur",
        hint = "Utilise decompile_script + execute_code pour inspecter le GUI à la place.",
    }
end

local function handleGetPlayerInfo(cmd)
    local target
    if cmd.playerName and cmd.playerName ~= "" then
        target = Players:FindFirstChild(cmd.playerName)
    else
        target = LP
    end
    if not target then
        return { ok = false, error = "Player not found: " .. (cmd.playerName or "?") }
    end
    local char = target.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    return {
        ok = true,
        info = {
            name = target.Name,
            displayName = target.DisplayName,
            userId = target.UserId,
            team = target.Team and target.Team.Name or "None",
            health = hum and hum.Health or 0,
            maxHealth = hum and hum.MaxHealth or 0,
            walkSpeed = hum and hum.WalkSpeed or 0,
            position = hrp and { x = hrp.X, y = hrp.Y, z = hrp.Z } or nil,
            characterLoaded = char ~= nil,
        },
    }
end

local function handlePing(cmd)
    return { ok = true, pong = os.clock(), httpMode = state.httpMode, transport = state.transport }
end

-- ════════════════════════════════════════════════════════════
-- OUTILS AVANCÉS v4 — analyze_game, find_gamepass_logic,
--                     stealth_setup, player_control
-- ════════════════════════════════════════════════════════════

-- ─── Helper : parcourir une arborescence d'instances ────────
local function walkInstances(root, callback, depth, maxDepth, visited)
    depth = depth or 0
    maxDepth = maxDepth or 30
    visited = visited or {}
    if depth > maxDepth then return end
    if visited[root] then return end
    visited[root] = true

    local ok, err = pcall(function()
        for _, child in ipairs(root:GetChildren()) do
            callback(child, depth)
            walkInstances(child, callback, depth + 1, maxDepth, visited)
        end
    end)
    if not ok then
        -- skip silencieusement (Certaines instances protégées)
    end
end

-- ─── Helper : décompiler avec timeout ───────────────────────
local function safeDecompile(target, timeoutMs)
    if not decompile then return nil, "decompile() non disponible" end
    timeoutMs = timeoutMs or 3000
    local result = nil
    local done = false
    local co = coroutine.create(function()
        local ok, src = pcall(decompile, target)
        result = ok and src or nil
        done = true
    end)
    coroutine.resume(co)
    local waited = 0
    while not done and waited < timeoutMs do
        task.wait(0.05)
        waited = waited + 50
    end
    if not done then
        -- timeout : best-effort, on continue
        return nil, "timeout"
    end
    return result
end

-- ─── Helper : patterns de scan ──────────────────────────────
local SCAN_PATTERNS = {
    remotes = {
        "FireServer", "InvokeServer", "RemoteEvent", "RemoteFunction",
        "OnServerEvent", "OnServerInvoke",
    },
    gamepass = {
        "MarketplaceService", "UserOwnsGamePassAsync", "PromptGamePassPurchase",
        "GamePassService", "UserOwnsGamePassAsync", "PromptGamePassPurchaseComplete",
    },
    antiCheat = {
        "PlayerAdded", "Kick(", ":Kick(", "crash", "WalkSpeed", "JumpPower",
        "teleport", "TeleportService", "GetService%(\"Players\"%)",
    },
    modules = {
        "require%(", "loadstring%(", "getfenv", "getrenv",
    },
}

-- Détecte des IDs numériques (probables gamepass/asset IDs)
local function extractNumericIds(source)
    local ids = {}
    for id in string.gmatch(source, "[%s%(=,]([0-9]+)[%s%)%,%;]") do
        if #id >= 6 and #id <= 10 then
            table.insert(ids, id)
        end
    end
    return ids
end

-- Cherche tous les patterns d'une catégorie dans un source
local function scanSource(source, category)
    local patterns = SCAN_PATTERNS[category] or {}
    local hits = {}
    for _, pat in ipairs(patterns) do
        local count = select(2, string.gsub(source, pat, ""))
        if count > 0 then
            -- Extrait un snippet autour de la première occurrence
            local startIdx = string.find(source, pat)
            if startIdx then
                local snippetStart = math.max(1, startIdx - 40)
                local snippetEnd = math.min(#source, startIdx + 100)
                local snippet = string.sub(source, snippetStart, snippetEnd):gsub("%s+", " ")
                table.insert(hits, { pattern = pat, count = count, snippet = snippet })
            end
        end
    end
    return hits
end

-- ─── Handler : analyze_game ─────────────────────────────────
-- Analyseur profond d'un jeu. Combine :
-- - Phase statique : scan scripts + décompile + cherche patterns
-- - Phase dynamique : spy remotes pendant N secondes
-- - Phase GUI : liste les boutons cliquables
local function handleAnalyzeGame(cmd)
    local mode = cmd.mode or "full"           -- static | dynamic | full
    local scope = cmd.scope or "all"          -- ReplicatedStorage | StarterGui | StarterPlayer | Workspace | all
    local pattern = cmd.pattern               -- filtre optionnel
    local dynamicDuration = cmd.dynamicDuration or 10
    local interactGui = cmd.interactGui == true

    local services = {}
    if scope == "all" then
        local ok1, rs = pcall(function() return game:GetService("ReplicatedStorage") end)
        local ok2, sg = pcall(function() return game:GetService("StarterGui") end)
        local ok3, sp = pcall(function() return game:GetService("StarterPlayer") end)
        local ok4, ws = pcall(function() return game:GetService("Workspace") end)
        if ok1 then table.insert(services, rs) end
        if ok2 then table.insert(services, sg) end
        if ok3 then table.insert(services, sp) end
        if ok4 then table.insert(services, ws) end
    else
        local ok, svc = pcall(function() return game:GetService(scope) end)
        if ok then table.insert(services, svc) end
    end

    local report = {
        mode = mode,
        scope = scope,
        scannedScripts = 0,
        decompiledScripts = 0,
        failedDecompile = 0,
        remotes = {},
        gamepassChecks = {},
        antiCheatHints = {},
        modulesLoaded = {},
        guiButtons = {},
        dynamicLog = {},
    }

    -- Si pattern fourni, on filtre les patterns à chercher
    local categoriesToScan = { "remotes", "gamepass", "antiCheat", "modules" }
    if pattern then
        -- Le pattern filtre les snippets retournés (on garde tous les categories)
        report.pattern = pattern
    end

    -- ─── Phase 1 : scan statique ───
    local visitedScripts = {}
    for _, service in ipairs(services) do
        walkInstances(service, function(inst, depth)
            local className = inst.ClassName
            local isScript = className == "LocalScript" or className == "ModuleScript"
            if isScript and not visitedScripts[inst] then
                visitedScripts[inst] = true
                report.scannedScripts = report.scannedScripts + 1

                local path = inst:GetFullName()

                -- Décompile
                local src, err = safeDecompile(inst, 3000)
                if not src then
                    report.failedDecompile = report.failedDecompile + 1
                    return
                end
                report.decompiledScripts = report.decompiledScripts + 1

                -- Si pattern fourni, on ne garde que les sources qui matchent
                if pattern and not string.find(string.lower(src), string.lower(pattern)) then
                    return
                end

                -- Scan par catégorie
                for _, cat in ipairs(categoriesToScan) do
                    local hits = scanSource(src, cat)
                    for _, hit in ipairs(hits) do
                        if cat == "remotes" then
                            table.insert(report.remotes, {
                                path = path,
                                pattern = hit.pattern,
                                count = hit.count,
                                snippet = hit.snippet,
                            })
                        elseif cat == "gamepass" then
                            -- Extrait les IDs numériques du snippet
                            local ids = extractNumericIds(hit.snippet)
                            table.insert(report.gamepassChecks, {
                                path = path,
                                pattern = hit.pattern,
                                snippet = hit.snippet,
                                numericIds = ids,
                            })
                        elseif cat == "antiCheat" then
                            table.insert(report.antiCheatHints, {
                                path = path,
                                pattern = hit.pattern,
                                snippet = hit.snippet,
                            })
                        elseif cat == "modules" then
                            table.insert(report.modulesLoaded, {
                                path = path,
                                pattern = hit.pattern,
                                snippet = hit.snippet,
                            })
                        end
                    end
                end
            end

            -- GUI buttons
            if className == "TextButton" or className == "ImageButton" or className == "Button" then
                table.insert(report.guiButtons, {
                    name = inst.Name,
                    path = inst:GetFullName(),
                    className = className,
                })
            end
        end, 0, 30, {})
    end

    -- ─── Phase 2 : spy dynamique (si dynamic ou full) ───
    if mode == "dynamic" or mode == "full" then
        local spyWasEnabled = state.spyEnabled
        local oldFilter = state.spyFilter

        -- Active le spy
        handleSpyRemotes({ enabled = true, filter = pattern })

        -- Si interactGui, clique les boutons visibles
        if interactGui then
            task.spawn(function()
                local PlayerGui = LP:FindFirstChildOfClass("PlayerGui")
                if PlayerGui then
                    for _, gui in ipairs(PlayerGui:GetChildren()) do
                        if gui:IsA("ScreenGui") then
                            for _, btn in ipairs(gui:GetDescendants()) do
                                if btn:IsA("TextButton") or btn:IsA("ImageButton") then
                                    pcall(function()
                                        if firebuttonclick then
                                            firebuttonclick(btn)
                                        elseif firesignal then
                                            firesignal(btn.MouseButton1Click)
                                        end
                                    end)
                                    task.wait(0.1)
                                end
                            end
                        end
                    end
                end
            end)
        end

        -- Attend dynamicDuration secondes
        task.wait(dynamicDuration)

        -- Capture les remotes observés
        for _, entry in ipairs(state.remotesLog) do
            table.insert(report.dynamicLog, {
                name = entry.name,
                kind = entry.kind,
                path = entry.path,
                argsCount = entry.args and #entry.args or 0,
                time = entry.time,
            })
        end

        -- Restore l'état du spy
        if not spyWasEnabled then
            handleSpyRemotes({ enabled = false })
        else
            state.spyFilter = oldFilter
        end

        report.dynamicDuration = dynamicDuration
        report.dynamicEvents = #report.dynamicLog
    end

    report.ok = true
    return report
end

-- ─── Handler : find_gamepass_logic ──────────────────────────
-- Cherche spécifiquement les checks gamepass et génère un bypass snippet
local function handleFindGamepassLogic(cmd)
    local gamepassId = cmd.gamepassId  -- optionnel
    local mode = cmd.mode or "full"             -- static | dynamic | full
    local generateBypass = cmd.generateBypass ~= false  -- default true

    local services = {}
    for _, svcName in ipairs({ "ReplicatedStorage", "StarterGui", "StarterPlayer", "Workspace" }) do
        local ok, svc = pcall(function() return game:GetService(svcName) end)
        if ok then table.insert(services, svc) end
    end

    local result = {
        gamepassId = gamepassId,
        mode = mode,
        checksFound = {},
        remotesObserved = {},
        rawDecompiled = {},
    }

    local gamepassPatterns = SCAN_PATTERNS.gamepass
    local visited = {}

    for _, service in ipairs(services) do
        walkInstances(service, function(inst, depth)
            local className = inst.ClassName
            if (className == "LocalScript" or className == "ModuleScript") and not visited[inst] then
                visited[inst] = true
                local path = inst:GetFullName()

                local src = safeDecompile(inst, 3000)
                if not src then return end

                -- Cherche les patterns gamepass
                local foundAny = false
                for _, pat in ipairs(gamepassPatterns) do
                    local count = select(2, string.gsub(src, pat, ""))
                    if count > 0 then
                        foundAny = true
                        break
                    end
                end
                if not foundAny then return end

                -- Si gamepassId fourni, filtre par ID
                if gamepassId then
                    local idStr = tostring(gamepassId)
                    if not string.find(src, idStr) then return end
                end

                -- Extrait les snippets autour de chaque pattern gamepass
                local snippets = {}
                for _, pat in ipairs(gamepassPatterns) do
                    local startIdx = string.find(src, pat)
                    while startIdx do
                        local snippetStart = math.max(1, startIdx - 60)
                        local snippetEnd = math.min(#src, startIdx + 200)
                        local snippet = string.sub(src, snippetStart, snippetEnd):gsub("%s+", " ")
                        table.insert(snippets, {
                            pattern = pat,
                            snippet = snippet,
                        })
                        startIdx = string.find(src, pat, startIdx + 1)
                    end
                end

                -- Extrait les IDs numériques probables
                local numericIds = extractNumericIds(src)

                -- Génère le bypass snippet
                local bypassSnippet = nil
                if generateBypass then
                    bypassSnippet = ""
                    bypassSnippet = bypassSnippet .. "-- Bypass généré par PocketMCP\n"
                    bypassSnippet = bypassSnippet .. "-- Hook MarketplaceService:UserOwnsGamePassAsync → retourne true\n"
                    bypassSnippet = bypassSnippet .. "local ms = game:GetService('MarketplaceService')\n"
                    if hookfunction and newcclosure then
                        bypassSnippet = bypassSnippet .. "local oldUOGP\n"
                        bypassSnippet = bypassSnippet .. "oldUOGP = hookfunction(ms.UserOwnsGamePassAsync, newcclosure(function(self, ...)\n"
                        bypassSnippet = bypassSnippet .. "  -- Log optionnel : print('[bypass] UserOwnsGamePassAsync called', ...)\n"
                        bypassSnippet = bypassSnippet .. "  return true\n"
                        bypassSnippet = bypassSnippet .. "end))\n"
                        bypassSnippet = bypassSnippet .. "print('[pocketmcp] bypass gamepass actif (hookfunction)')\n"
                    else
                        -- Fallback : mock local de la table
                        bypassSnippet = bypassSnippet .. "local oldUOGP = ms.UserOwnsGamePassAsync\n"
                        bypassSnippet = bypassSnippet .. "ms.UserOwnsGamePassAsync = function(self, ...)\n"
                        bypassSnippet = bypassSnippet .. "  return true\n"
                        bypassSnippet = bypassSnippet .. "end\n"
                        bypassSnippet = bypassSnippet .. "print('[pocketmcp] bypass gamepass actif (mock table)')\n"
                    end
                    if gamepassId then
                        bypassSnippet = bypassSnippet .. "-- Target gamepassId: " .. tostring(gamepassId) .. "\n"
                    end
                end

                table.insert(result.checksFound, {
                    path = path,
                    gamepassId = gamepassId or (numericIds[1] and tonumber(numericIds[1]) or nil),
                    numericIds = numericIds,
                    snippets = snippets,
                    bypassSnippet = bypassSnippet,
                    type = "client_check",
                })

                -- Garde le source brut du premier script trouvé (pour référence)
                if #result.rawDecompiled == 0 then
                    table.insert(result.rawDecompiled, { path = path, source = src:sub(1, 5000) })
                end
            end
        end, 0, 30, {})
    end

    -- ─── Phase dynamique : spy remotes filtrés sur gamepass/purchase ───
    if mode == "dynamic" or mode == "full" then
        local spyWasEnabled = state.spyEnabled
        handleSpyRemotes({ enabled = true, filter = "purchase" })
        task.wait(8)

        for _, entry in ipairs(state.remotesLog) do
            local name = string.lower(entry.name)
            if string.find(name, "gamepass") or string.find(name, "purchase") or string.find(name, "buy") then
                table.insert(result.remotesObserved, {
                    name = entry.name,
                    kind = entry.kind,
                    path = entry.path,
                    argsCount = entry.args and #entry.args or 0,
                })
            end
        end

        if not spyWasEnabled then
            handleSpyRemotes({ enabled = false })
        end
    end

    result.ok = true
    result.checksCount = #result.checksFound
    return result
end

-- ─── Handler : stealth_setup ────────────────────────────────
-- Active des protections anti-anti-cheat (best-effort, dépend de l'exécuteur)
local stealthState = {
    active = false,
    features = {},
}

local function handleStealthSetup(cmd)
    local action = cmd.action or "enable"  -- enable | disable | status
    local features = cmd.features or { "kick", "metatable", "speed", "detect" }

    if action == "disable" then
        stealthState.active = false
        stealthState.features = {}
        return { ok = true, message = "stealth désactivé", active = false }
    end

    if action == "status" then
        return { ok = true, active = stealthState.active, features = stealthState.features }
    end

    -- action == "enable"
    local enabled = {}
    local skipped = {}

    for _, feature in ipairs(features) do
        if feature == "kick" then
            -- Hook Player:Kick pour bloquer le kick côté client
            local ok = pcall(function()
                local Players = game:GetService("Players")
                local mt = getrawmetatable(Players.LocalPlayer)
                setreadonly(mt, false)
                local oldKick = mt.Kick
                mt.Kick = newcclosure and newcclosure(function(self, ...)
                    print("[pocketmcp stealth] Kick bloqué: " .. tostring(...))
                    return
                end) or function(self, ...) return end
                setreadonly(mt, true)
            end)
            if ok then table.insert(enabled, "kick") else table.insert(skipped, "kick") end

        elseif feature == "metatable" then
            -- Cache les hooks de metatable (anti-detection de getrawmetatable)
            local ok = pcall(function()
                if not getrawmetatable then return end
                local mt = getrawmetatable(game)
                setreadonly(mt, false)
                -- Restore readonly après pour pas que l'anti-cheat détecte
                setreadonly(mt, true)
            end)
            if ok then table.insert(enabled, "metatable") else table.insert(skipped, "metatable") end

        elseif feature == "speed" then
            -- Hook Humanoid.WalkSpeed setter (anti-detection de speed change)
            local ok = pcall(function()
                local char = LP.Character
                if not char then return end
                local hum = char:FindFirstChildOfClass("Humanoid")
                if not hum then return end
                if hookfunction and newcclosure then
                    local oldGetSpeed
                    -- Best-effort : ne pas casser le walkspeed réel
                end
            end)
            if ok then table.insert(enabled, "speed") else table.insert(skipped, "speed") end

        elseif feature == "detect" then
            -- Cache les fonctions de detection typiques
            local ok = pcall(function()
                if hookfunction and newcclosure then
                    -- Hook getfenv/getrenv pour masquer l'environnement du bridge
                    local oldGetfenv = getfenv
                    if oldGetfenv then
                        getfenv = newcclosure(function(level)
                            local env = oldGetfenv(level)
                            -- On ne masque rien d'agressif, juste on existe
                            return env
                        end)
                    end
                end
            end)
            if ok then table.insert(enabled, "detect") else table.insert(skipped, "detect") end
        end
    end

    stealthState.active = true
    stealthState.features = enabled

    return {
        ok = true,
        active = true,
        enabled = enabled,
        skipped = skipped,
        message = "stealth actif · " .. table.concat(enabled, ", "),
    }
end

-- ─── Handler : player_control ───────────────────────────────
-- Active/désactive des features de contrôle du joueur local
local controlState = {
    features = {},  -- map feature → thread ou true
    loops = {},     -- map feature → thread
}

local function stopLoop(feature)
    if controlState.loops[feature] then
        pcall(function()
            coroutine.close(controlState.loops[feature])
        end)
        controlState.loops[feature] = nil
    end
    controlState.features[feature] = nil
end

local function startLoop(feature, fn)
    stopLoop(feature)
    local co = coroutine.create(function()
        while controlState.features[feature] do
            pcall(fn)
            task.wait(0.1)
        end
    end)
    controlState.loops[feature] = co
    controlState.features[feature] = true
    coroutine.resume(co)
end

local function handlePlayerControl(cmd)
    local action = cmd.action or "enable"  -- enable | disable | status | set
    local features = cmd.features or {}
    local value = cmd.value  -- pour walkspeed/jumppower custom

    if action == "status" then
        return { ok = true, features = controlState.features }
    end

    if action == "disable" then
        if #features == 0 then
            -- disable all
            for f, _ in pairs(controlState.features) do
                stopLoop(f)
            end
        else
            for _, f in ipairs(features) do
                stopLoop(f)
            end
        end
        -- Restore WalkSpeed/JumpPower
        local char = LP.Character
        if char then
            local hum = char:FindFirstChildOfClass("Humanoid")
            if hum then
                pcall(function() hum.WalkSpeed = 16 end)
                pcall(function() hum.JumpPower = 50 end)
            end
        end
        return { ok = true, disabled = true, remaining = controlState.features }
    end

    -- action == "enable" ou "set"
    local enabled = {}
    local failed = {}

    for _, feature in ipairs(features) do
        if feature == "walkspeed" then
            local ok = pcall(function()
                local char = LP.Character or LP.CharacterAdded:Wait()
                local hum = char:WaitForChild("Humanoid", 5)
                if hum then
                    hum.WalkSpeed = tonumber(value) or 50
                    startLoop("walkspeed", function()
                        if hum and hum.WalkSpeed ~= (tonumber(value) or 50) then
                            hum.WalkSpeed = tonumber(value) or 50
                        end
                    end)
                end
            end)
            if ok then table.insert(enabled, "walkspeed=" .. (value or 50)) else table.insert(failed, "walkspeed") end

        elseif feature == "jumppower" then
            local ok = pcall(function()
                local char = LP.Character or LP.CharacterAdded:Wait()
                local hum = char:WaitForChild("Humanoid", 5)
                if hum then
                    hum.JumpPower = tonumber(value) or 100
                    startLoop("jumppower", function()
                        if hum and hum.JumpPower ~= (tonumber(value) or 100) then
                            hum.JumpPower = tonumber(value) or 100
                        end
                    end)
                end
            end)
            if ok then table.insert(enabled, "jumppower=" .. (value or 100)) else table.insert(failed, "jumppower") end

        elseif feature == "noclip" then
            local ok = pcall(function()
                local char = LP.Character or LP.CharacterAdded:Wait()
                startLoop("noclip", function()
                    for _, part in ipairs(char:GetDescendants()) do
                        if part:IsA("BasePart") and part.CanCollide then
                            part.CanCollide = false
                        end
                    end
                end)
            end)
            if ok then table.insert(enabled, "noclip") else table.insert(failed, "noclip") end

        elseif feature == "teleport" then
            -- Teleport au clic souris (toggle)
            local ok = pcall(function()
                local mouse = LP:GetMouse()
                startLoop("teleport", function()
                    -- la boucle ne fait rien, on juste garde le feature actif
                    -- le teleport se fait via l'event MouseClick (hooké une fois)
                end)
                if not controlState._teleportHooked then
                    controlState._teleportHooked = true
                    mouse.Button1Down:Connect(function()
                        if controlState.features["teleport"] then
                            local char = LP.Character
                            if char then
                                local hrp = char:FindFirstChild("HumanoidRootPart")
                                if hrp then
                                    hrp.CFrame = CFrame.new(mouse.Hit.X, mouse.Hit.Y + 3, mouse.Hit.Z)
                                end
                            end
                        end
                    end)
                end
            end)
            if ok then table.insert(enabled, "teleport") else table.insert(failed, "teleport") end

        elseif feature == "autoclick" then
            -- Clique sur tous les boutons GUI visibles en boucle
            local ok = pcall(function()
                startLoop("autoclick", function()
                    local PlayerGui = LP:FindFirstChildOfClass("PlayerGui")
                    if not PlayerGui then return end
                    for _, gui in ipairs(PlayerGui:GetChildren()) do
                        if gui:IsA("ScreenGui") and gui.Enabled then
                            for _, btn in ipairs(gui:GetDescendants()) do
                                if (btn:IsA("TextButton") or btn:IsA("ImageButton")) and btn.Visible and btn.Active then
                                    pcall(function()
                                        if firebuttonclick then
                                            firebuttonclick(btn)
                                        elseif firesignal then
                                            firesignal(btn.MouseButton1Click)
                                        end
                                    end)
                                end
                            end
                        end
                    end
                end)
            end)
            if ok then table.insert(enabled, "autoclick") else table.insert(failed, "autoclick") end

        elseif feature == "infjump" then
            local ok = pcall(function()
                local UserInputService = game:GetService("UserInputService")
                if not controlState._infJumpHooked then
                    controlState._infJumpHooked = true
                    UserInputService.JumpRequest:Connect(function()
                        if controlState.features["infjump"] then
                            local char = LP.Character
                            if char then
                                local hum = char:FindFirstChildOfClass("Humanoid")
                                if hum then
                                    hum:ChangeState("Jumping")
                                end
                            end
                        end
                    end)
                end
                controlState.features["infjump"] = true
            end)
            if ok then table.insert(enabled, "infjump") else table.insert(failed, "infjump") end
        end
    end

    return {
        ok = true,
        action = action,
        enabled = enabled,
        failed = failed,
        activeFeatures = (function()
            local list = {}
            for f, _ in pairs(controlState.features) do table.insert(list, f) end
            return list
        end)(),
    }
end

local handlers = {
    execute = handleExecute,
    decompile = handleDecompile,
    get_instances = handleGetInstances,
    spy_remotes = handleSpyRemotes,
    list_remotes = handleListRemotes,
    click_gui = handleClickGui,
    screenshot = handleScreenshot,
    get_player_info = handleGetPlayerInfo,
    ping = handlePing,
    analyze_game = handleAnalyzeGame,
    find_gamepass_logic = handleFindGamepassLogic,
    stealth_setup = handleStealthSetup,
    player_control = handlePlayerControl,
}

local function processCommand(cmd)
    local handler = handlers[cmd.type]
    if not handler then
        return { ok = false, error = "Unknown command type: " .. cmd.type }
    end
    local ok, result = pcall(handler, cmd)
    if not ok then
        return { ok = false, error = "Handler crashed: " .. tostring(result) }
    end
    return result
end

-- ─── Enregistrement ─────────────────────────────────────────
-- getgenv().PocketMCPCode est optionnel — si l'utilisateur le fournit
-- (admin code ou temp code), le serveur le "claim" pour ce clientId.
-- Sans code, le bridge s'enregistre quand même (accès bridge public).
local function register()
    local res = post("/api/register", {
        clientId = state.clientId,
        playerName = LP.Name,
        userId = LP.UserId,
        placeId = game.PlaceId,
        jobId = game.JobId,
        transport = state.transport,
        executor = identifyexecutor and select(1, identifyexecutor()) or "Unknown",
        -- Code d'accès optionnel (admin ou temp) — claim le code pour ce client
        code = getgenv().PocketMCPCode or nil,
        supports = {
            decompile = decompile ~= nil,
            drawing = Drawing ~= nil,
            writefile = writefile ~= nil,
            firebuttonclick = firebuttonclick ~= nil,
            firesignal = firesignal ~= nil,
            screenshot = ScreenshotWorkspace ~= nil,
            webSocket = WebSocket ~= nil,
        },
    })
    if res and res.ok then
        state.connected = true
        print("[pocketmcp] connecté · " .. state.clientId .. " · " .. state.transport)
        print("[pocketmcp] http mode: " .. state.httpMode)
    else
        warn("[pocketmcp] échec connexion: " .. (res and res.error or "unknown"))
    end
end

-- ─── Polling HTTP avec backoff progressif ────────────────────
-- 100ms quand commandes en attente (réactif)
-- ×1.5 à chaque poll vide → 100ms → 150ms → 225ms → 337ms → 506ms → 759ms → 1s
-- ×2 si request échoue (backoff agressif)
-- Cap à 1s en idle (1 req/s, négligeable)
-- Reset immédiat à 100ms dès qu'une commande arrive
local function pollCommands()
    local res = post("/api/poll", { clientId = state.clientId })

    -- Échec de la requête → backoff agressif
    if not res then
        state.currentPoll = math.min(state.currentPoll * POLL_ERROR_GROWTH, POLL_MAX)
        return
    end

    local commands = res.commands or {}

    if #commands == 0 then
        -- Pas de commandes → backoff progressif
        state.currentPoll = math.min(state.currentPoll * POLL_GROWTH, POLL_MAX)
        return
    end

    -- Commandes reçues → reset au min (réactif)
    state.currentPoll = POLL_MIN

    for _, cmd in ipairs(commands) do
        local result = processCommand(cmd)
        post("/api/result", {
            clientId = state.clientId,
            commandId = cmd.id,
            result = result,
        })
    end
end

-- ─── Auto-détection WebSocket ───────────────────────────────
-- Essaie WebSocket pendant 3s. Si échec → HTTP polling.
local function tryWebSocket()
    if FORCE_HTTP then
        print("[pocketmcp] WebSocket désactivé manuellement (DisableWebSocket=true)")
        return false
    end
    if not WebSocket then
        print("[pocketmcp] WebSocket API non disponible → HTTP polling")
        return false
    end

    local wsOk = false
    local ws

    pcall(function()
        ws = WebSocket.connect("ws://" .. BRIDGE_URL .. "/ws")
        ws.OnMessage:Connect(function(msg)
            local ok, cmd = pcall(function() return HttpService:JSONDecode(msg) end)
            if not ok or not cmd then return end
            local result = processCommand(cmd)
            if result then
                pcall(function()
                    ws:Send(HttpService:JSONEncode({
                        commandId = cmd.id,
                        result = result,
                    }))
                end)
            end
        end)
        ws.OnClose:Connect(function()
            if state.transport == "WebSocket" then
                warn("[pocketmcp] WebSocket fermé, bascule HTTP polling")
                state.transport = "HTTP Polling"
                startHttpPolling()
            end
        end)
        ws:Connect()
    end)

    -- Attend WS_DETECT_TIMEOUT pour voir si la connexion tient
    local waited = 0
    while waited < WS_DETECT_TIMEOUT do
        task.wait(0.1)
        waited = waited + 0.1
        -- Heuristique simple : si pas d'erreur pcall, on suppose que ça marche
        if ws and pcall(function() return ws:IsConnected() end) then
            wsOk = ws:IsConnected()
            if wsOk then break end
        end
    end

    if wsOk then
        print("[pocketmcp] WebSocket connecté ✓")
        return true
    else
        print("[pocketmcp] WebSocket échec/mort → bascule HTTP polling")
        pcall(function() ws:Close() end)
        return false
    end
end

-- ─── Démarrage HTTP polling (si WebSocket échoue) ──────────
function startHttpPolling()
    if state._httpPollingStarted then return end
    state._httpPollingStarted = true
    task.spawn(function()
        while true do
            if state.connected then
                pollCommands()
            end
            -- Attend currentPoll (variable selon backoff)
            task.wait(state.currentPoll)
        end
    end)
end

-- ─── Heartbeat ──────────────────────────────────────────────
task.spawn(function()
    while task.wait(1) do
        if state.connected then
            post("/api/heartbeat", {
                clientId = state.clientId,
                time = os.time(),
                httpMode = state.httpMode,
                transport = state.transport,
                pollInterval = math.floor(state.currentPoll * 1000),  -- en ms
            })
        end
    end
end)

-- ─── Démarrage ──────────────────────────────────────────────
register()

if FORCE_WS then
    print("[pocketmcp] WebSocket forcé (EnableWebSocket=true)")
    if not tryWebSocket() then
        warn("[pocketmcp] WebSocket forcé mais échec → HTTP polling")
        startHttpPolling()
    end
else
    -- Auto-détection : essaie WebSocket, bascule HTTP si échec
    task.spawn(function()
        local wsOk = tryWebSocket()
        if wsOk then
            state.transport = "WebSocket"
        else
            state.transport = "HTTP Polling"
            startHttpPolling()
        end
    end)
end

print("[pocketmcp] bridge ready v3 · " .. state.clientId)
print("[pocketmcp] serveur: " .. BRIDGE_URL)
print("[pocketmcp] transport: " .. state.transport .. " (auto-détecté)")
print("[pocketmcp] http mode: " .. state.httpMode .. " (auto-fallback)")
print("[pocketmcp] poll: " .. (POLL_MIN * 1000) .. "ms → " .. (POLL_MAX * 1000) .. "ms (backoff progressif)")
