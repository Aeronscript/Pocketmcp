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
            <div className="mt-6 flex items-center gap-2">
              {[
                { label: "GitHub", icon: "github" },
                { label: "Discord", icon: "discord" },
                { label: "Telegram", icon: "telegram" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 hover:border-border hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s.label === "GitHub" && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.18c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>
                  )}
                  {s.label === "Discord" && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M20.32 4.37A19.79 19.79 0 0 0 15.45 2.8a.07.07 0 0 0-.08.04c-.21.36-.44.83-.6 1.2a18.42 18.42 0 0 0-5.55 0c-.16-.38-.39-.84-.6-1.2a.08.08 0 0 0-.08-.04A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C1.07 8.16.36 11.85.71 15.5a.08.08 0 0 0 .03.06 19.92 19.92 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.29 1.22-1.99a.08.08 0 0 0-.04-.11c-.65-.25-1.27-.55-1.86-.89a.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .07-.01c3.9 1.78 8.13 1.78 11.98 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.59.34-1.21.64-1.86.89a.08.08 0 0 0-.04.11c.36.7.78 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.41-4.22-.69-7.88-2.92-11.1a.06.06 0 0 0-.03-.03ZM8.68 13.27c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.41 2.15-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41Zm6.66 0c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.41 2.15-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41Z" />
                    </svg>
                  )}
                  {s.label === "Telegram" && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                    </svg>
                  )}
                </a>
              ))}
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
          <div className="flex items-center gap-2">
            <span>© 2026 planetscript</span>
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
