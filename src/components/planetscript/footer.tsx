"use client";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3.5" />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="10"
                    ry="4"
                    transform="rotate(-30 12 12)"
                  />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight">
                  planetscript
                </span>
                <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                  Roblox · mobile & PC
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
              Une collection épurée de scripts Lua pour exécuteurs Roblox.
              Visuels, RemoteEvents, détection — pensés pour la performance et
              la lisibilité avant tout.
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Catégories
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#visual"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  Visuel
                </a>
              </li>
              <li>
                <a
                  href="#remote"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  RemoteEvents
                </a>
              </li>
              <li>
                <a
                  href="#detection"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  Détection
                </a>
              </li>
              <li>
                <a
                  href="#mobile-ui"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  UI Mobile
                </a>
              </li>
              <li>
                <a
                  href="#utility"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  Utilitaires
                </a>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              À savoir
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usage éducatif uniquement. Respecte les conditions d'utilisation
              de Roblox. planetscript n'est pas affilié à Roblox Corporation.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            © 2026 planetscript · Conçu avec soin pour la communauté
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Tous les scripts opérationnels
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
