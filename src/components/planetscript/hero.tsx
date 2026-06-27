"use client";

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32"
    >
      {/* Background grid */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_80%)] opacity-60"
      />

      {/* Aurora glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[-100px] -z-10 h-[480px] w-[920px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]"
      />
      <div
        aria-hidden
        className="absolute right-[10%] top-32 -z-10 h-[280px] w-[280px] rounded-full bg-teal-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute left-[8%] top-40 -z-10 h-[220px] w-[220px] rounded-full bg-violet-500/10 blur-[100px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm mb-7">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="tracking-[0.16em] uppercase">
              13 scripts · v3.0
            </span>
            <span className="text-border">·</span>
            <span>MAJ 27 juin 2026</span>
          </div>

          {/* Title */}
          <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-semibold tracking-[-0.02em] leading-[1.05]">
            Scripts Roblox{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                premium
              </span>
              <svg
                className="absolute -bottom-1 left-0 w-full h-2 text-emerald-500/40"
                viewBox="0 0 200 8"
                fill="none"
              >
                <path
                  d="M2 5.5c40-3 80-3 100-2s60 2 96 0"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br className="hidden sm:block" />
            pour mobile & PC
          </h1>

          {/* Subtitle */}
          <p className="mt-7 text-pretty text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            ESP haute performance, scanner RemoteEvents, audit anti-cheat et
            UI tactile complète. Du code production-ready, propre et
            documenté — pour exécuteurs modernes.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#scripts"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-emerald-500/25"
            >
              Explorer la bibliothèque
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/30 backdrop-blur-sm px-5 py-3 text-sm font-medium hover:bg-secondary/60 transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              Voir les features
            </a>
          </div>

          {/* Platform support */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Synapse X
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Script-Ware
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              KRNL
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Fluxus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Delta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Hydrogen
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
