"use client";

export function Features() {
  return (
    <section
      id="features"
      className="relative py-20 sm:py-28 scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-3">
            <span className="h-px w-8 bg-emerald-500/40" />
            POURQUOI PLANETSCRIPT
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.15]">
            Tout ce qu'il faut pour exploiter Roblox,{" "}
            <span className="text-muted-foreground">
              proprement et sans lag.
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            Des modules pensés pour la performance et la lisibilité. Chaque
            script est testé sur 7 exécuteurs et optimisé pour les configs
            low-end comme pour le haut de gamme.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {/* Big card: Visual */}
          <div className="group relative sm:col-span-2 lg:col-span-2 lg:row-span-2 overflow-hidden rounded-2xl border border-border/60 bg-card p-7 sm:p-9 hover:border-emerald-500/40 transition-colors">
            <div
              aria-hidden
              className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">
                Visuel saisissant
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-md">
                ESP production-ready avec skeleton, tracers, chams, health
                bars. Rendu Drawing API avec pool d'objets réutilisables
                pour tenir 60 FPS même sur mobile d'entrée de gamme.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Skeleton", "Tracers", "Chams", "FOV Ring", "Health Bar"].map(
                  (t) => (
                    <span
                      key={t}
                      className="rounded-md bg-secondary/60 px-2 py-1 text-[11px] font-mono text-muted-foreground"
                    >
                      {t}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Remote Spy */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 hover:border-amber-500/40 transition-colors">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h4l3-9 4 18 3-9h4" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Scanner RemoteEvents</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Hook metatable __namecall, GUI live avec filtres, export JSON,
                blacklist par remote.
              </p>
            </div>
          </div>

          {/* Detection */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 hover:border-rose-500/40 transition-colors">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Détection proactive</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Audit de LocalScripts, 12 patterns AC, capture d'erreurs F9,
                monitoring FPS / mémoire.
              </p>
            </div>
          </div>

          {/* Mobile UI */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 hover:border-sky-500/40 transition-colors">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12" y2="18" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">UI mobile native</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Bibliothèque tactile complète : toggles, sliders, dropdowns,
                joystick virtuel. Touch targets 44px min.
              </p>
            </div>
          </div>

          {/* Compatibilité */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 hover:border-violet-500/40 transition-colors">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Compatibilité totale</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Loader universel détectant 7 exécuteurs. API normalisée avec
                fallbacks gracieux et retry automatique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
