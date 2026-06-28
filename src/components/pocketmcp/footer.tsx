"use client";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-secondary/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-lg bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12" y2="18" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[14px] font-semibold tracking-tight font-mono">
                  pocket<span className="text-primary">mcp</span>
                </span>
                <span className="text-[9px] text-muted-foreground tracking-[0.18em] uppercase mt-0.5 font-mono">
                  roblox · mobile
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md font-mono">
              serveur mcp roblox pour android. branchez votre tél sur opencode, codex,
              claude ou anyclaw via le routeur mc. 100% local, 0 dépendance cloud.
            </p>
          </div>

          {/* Sections du site */}
          <div className="md:col-span-3 md:col-start-9">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4 font-mono">
              sections
            </div>
            <ul className="space-y-2.5 text-sm font-mono">
              {[
                { label: "dashboard", href: "#dashboard" },
                { label: "bridge", href: "#bridge" },
                { label: "setup", href: "#setup" },
                { label: "outils", href: "#tools" },
                { label: "docs", href: "#docs" },
                { label: "faq", href: "#faq" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* À savoir */}
          <div className="md:col-span-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4 font-mono">
              à savoir
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              usage éducatif. risque de ban roblox. non affilié à roblox corporation ni au repo original notpoiu/roblox-executor-mcp.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span>© 2026 pocketmcp</span>
            <span className="text-border">·</span>
            <span>
              créé par <span className="text-foreground font-medium">aeronscript</span>
              <span className="text-border mx-1">·</span>
              <span className="text-muted-foreground">mohamed amine</span>
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              v0.3.0 · mit license
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
