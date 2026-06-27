"use client";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-secondary/20 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[800px] rounded-full bg-emerald-500/5 blur-[100px]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="10"
                    ry="3.5"
                    transform="rotate(-25 12 12)"
                  />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight">
                  planetscript
                </span>
                <span className="text-[10px] text-muted-foreground tracking-[0.18em] uppercase mt-0.5">
                  Roblox hub
                </span>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
              Bibliothèque épurée de scripts Lua pour exécuteurs Roblox.
              Visuels, RemoteEvents, détection — pensés pour la performance
              et la lisibilité avant tout.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 px-3.5 py-2.5">
              <div className="relative h-7 w-7 rounded-md bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                <span className="text-[11px] font-bold text-white">A</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Créé par
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  Aeronscript
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    · Mohamed Amine
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-2 md:col-start-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
              Catégories
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Visuel", href: "#visual" },
                { label: "RemoteEvents", href: "#remote" },
                { label: "Détection", href: "#detection" },
                { label: "UI Mobile", href: "#mobile-ui" },
                { label: "Utilitaires", href: "#utility" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
              Ressources
            </div>
            <ul className="space-y-2.5 text-sm">
              {["Documentation", "Changelog", "Tutoriels", "API Loader", "FAQ"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
              À savoir
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usage éducatif uniquement. Respecte les conditions d'utilisation
              de Roblox. Non affilié à Roblox Corporation.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span>© 2026 planetscript</span>
            <span className="text-border">·</span>
            <span>
              Créé par{" "}
              <span className="text-foreground font-medium">Aeronscript</span>
              <span className="text-border mx-1">·</span>
              <span className="text-muted-foreground">Mohamed Amine</span>
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Tous les scripts opérationnels
            </span>
          </div>
          <div className="font-mono">
            v3.0.0 · build 2026.06.27
          </div>
        </div>
      </div>
    </footer>
  );
}
