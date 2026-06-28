"use client";

const TOOLS = [
  {
    name: "execute_code",
    desc: "exécute du code lua dans le client roblox connecté",
    args: "{ code: string, clientId?: string }",
    returns: "string",
    icon: "▶",
  },
  {
    name: "get_instances",
    desc: "récupère des instances via sélecteur css-like",
    args: "{ selector: string }",
    returns: "Instance[]",
    icon: "▤",
  },
  {
    name: "decompile_script",
    desc: "décompile un localscript / modulescript",
    args: "{ path: string }",
    returns: "string (source)",
    icon: "⚒",
  },
  {
    name: "spy_remotes",
    desc: "active / désactive l'interception des remotes",
    args: "{ enabled: bool, filter?: string }",
    returns: "void",
    icon: "◈",
  },
  {
    name: "click_gui",
    desc: "clique sur un bouton in-game par path",
    args: "{ path: string }",
    returns: "bool",
    icon: "◉",
  },
  {
    name: "screenshot",
    desc: "capture l'écran roblox (fallback: screenshotview)",
    args: "{}",
    returns: "base64 image",
    icon: "▣",
  },
  {
    name: "list_clients",
    desc: "liste les clients roblox connectés",
    args: "{}",
    returns: "Client[]",
    icon: "≡",
  },
  {
    name: "console_logs",
    desc: "récupère les logs récents du jeu",
    args: "{ level?: string, limit?: int }",
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
            MCP TOOLS · 8 ENDPOINTS
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
