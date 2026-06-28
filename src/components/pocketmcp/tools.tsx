"use client";

const TOOLS = [
  {
    name: "execute_code",
    desc: "exécute du code lua dans roblox, capture les prints/warns",
    args: "{ code: string, clientId? }",
    returns: "logs[] + result",
    icon: "▶",
  },
  {
    name: "decompile_script",
    desc: "décompile un localscript/modulescript par son path",
    args: "{ path: string }",
    returns: "source lua",
    icon: "⚒",
  },
  {
    name: "get_instances",
    desc: "sélecteur css-like: game.ReplicatedStorage.Remotes.*",
    args: "{ selector: string }",
    returns: "Instance[]",
    icon: "▤",
  },
  {
    name: "spy_remotes",
    desc: "hook fireserver / invokeserver, capture les args",
    args: "{ enabled: bool, filter? }",
    returns: "void",
    icon: "◈",
  },
  {
    name: "list_remotes",
    desc: "résumé des remotes interceptés + events récents",
    args: "{ limit? }",
    returns: "summary + recent[]",
    icon: "≡",
  },
  {
    name: "click_gui",
    desc: "clique sur un textbutton par path via firesignal",
    args: "{ path: string }",
    returns: "bool",
    icon: "◉",
  },
  {
    name: "screenshot",
    desc: "capture l'écran (si screenshotworkspace dispo)",
    args: "{}",
    returns: "base64 | path",
    icon: "▣",
  },
  {
    name: "get_player_info",
    desc: "health, position, walkspeed, team, character",
    args: "{ playerName? }",
    returns: "PlayerInfo",
    icon: "○",
  },
  {
    name: "list_clients",
    desc: "liste les clients roblox connectés + supports",
    args: "{}",
    returns: "Client[]",
    icon: "▣",
  },
  {
    name: "get_logs",
    desc: "récupère les logs serveur récents",
    args: "{ limit? }",
    returns: "LogEntry[]",
    icon: "▤",
  },
];

export function Tools() {
  return (
    <section id="tools" className="py-16 sm:py-24 scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            MCP TOOLS · 10 ENDPOINTS
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> available tools
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            {"// exposés sur http://localhost:16384/mcp · compatibles opencode, codex, claude"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <div
              key={t.name}
              className="group rounded-lg border border-border/40 bg-card p-4 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-8 w-8 rounded-md bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary font-mono text-sm">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[13px] font-mono font-semibold text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">→ {t.returns}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{t.desc}</p>
                  <div className="rounded-md bg-background/60 border border-border/40 px-2 py-1 text-[10px] font-mono text-amber-400/80 truncate">
                    args: <span className="text-foreground/80">{t.args}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
