"use client";

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32"
    >
      {/* Decorative grid + glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] opacity-50"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute right-1/4 top-32 -z-10 h-[260px] w-[260px] rounded-full bg-teal-500/10 blur-[100px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="tracking-wider uppercase">
              12 scripts · MAJ le 24 juin 2026
            </span>
          </div>

          <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
            Scripts Roblox{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
              épurés
            </span>
            <br className="hidden sm:block" />
            pour mobile & PC
          </h1>

          <p className="mt-6 text-pretty text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Une collection soigneusement sélectionnée de scripts Lua pour
            exécuteurs. Visuels saisissants, scanner de RemoteEvents,
            détection d'anti-cheat — tout passe par un design clair et
            lisible.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#scripts"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Explorer les scripts
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href="#categories"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Voir les catégories
            </a>
          </div>
        </div>

        {/* Quick category pills */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
          {[
            { l: "ESP Visuel", c: "text-emerald-600 bg-emerald-500/10" },
            { l: "RemoteSpy", c: "text-amber-600 bg-amber-500/10" },
            { l: "Anti-Cheat", c: "text-rose-600 bg-rose-500/10" },
            { l: "Mobile Dock", c: "text-sky-600 bg-sky-500/10" },
            { l: "Key Bypass", c: "text-violet-600 bg-violet-500/10" },
            { l: "Aim Assist", c: "text-emerald-600 bg-emerald-500/10" },
          ].map((pill) => (
            <span
              key={pill.l}
              className={`rounded-full px-3 py-1 text-xs font-medium ${pill.c}`}
            >
              {pill.l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
