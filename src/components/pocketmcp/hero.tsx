"use client";

import Image from "next/image";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-12 sm:pt-20 sm:pb-24">
      {/* Grid background */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_80%)] opacity-60" />
      <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      {/* Traînées lumineuses animées en arrière-plan */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Traînée 1 - gauche vers droite */}
        <div className="absolute top-1/4 -left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-trail-1" />
        <div className="absolute top-1/4 -left-1/4 h-20 w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl animate-trail-1" />
        {/* Traînée 2 - droite vers gauche */}
        <div className="absolute top-1/2 -right-1/4 h-px w-1/2 bg-gradient-to-l from-transparent via-emerald-400/30 to-transparent animate-trail-2" />
        <div className="absolute top-1/2 -right-1/4 h-20 w-1/2 bg-gradient-to-l from-transparent via-emerald-400/10 to-transparent blur-xl animate-trail-2" />
        {/* Traînée 3 - plus subtile en bas */}
        <div className="absolute bottom-1/4 -left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent animate-trail-3" />
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Image
                src="/pocketmcp-logo-optimized.png"
                alt="pocketmcp"
                width={96}
                height={96}
                className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]"
                priority
              />
            </div>
          </div>

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] text-muted-foreground backdrop-blur-sm mb-5 sm:mb-7 font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="tracking-[0.16em] uppercase">MCP · termux · mobile</span>
          </div>

          {/* Title */}
          <h1 className="text-balance text-[28px] leading-[1.1] sm:text-5xl md:text-6xl font-semibold tracking-tight font-mono">
            roblox mcp
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-300 to-primary bg-clip-text text-transparent text-glow">
              in your pocket
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-[13px] sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-mono">
            le serveur <span className="text-primary">roblox-executor-mcp</span> adapté pour android.
            termux + delta + opencode = votre ia code dans roblox directement depuis votre poche.
          </p>

          {/* Terminal preview */}
          <div className="mt-6 sm:mt-8 mx-auto max-w-xl text-left">
            <div className="rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-primary/5">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                <span className="h-2 w-2 rounded-full bg-primary/70" />
                <span className="ml-2 text-[10px] text-muted-foreground font-mono">~/pocketmcp</span>
              </div>
              <pre className="p-3 sm:p-4 text-[10px] sm:text-[12px] leading-relaxed font-mono text-muted-foreground overflow-x-auto">
<span className="text-primary">$</span> <span className="text-foreground">bash setup.sh</span>
<span className="text-primary">→</span> installing node 18+...
<span className="text-primary">→</span> installing bun 1.3+...
<span className="text-primary">→</span> cloning pocketmcp server...
<span className="text-primary">→</span> starting on :16384
<span className="text-emerald-400">✓</span> <span className="text-foreground">dashboard live at localhost:16384</span>
<span className="text-primary cursor-blink"></span>
              </pre>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <a
              href="#setup"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 sm:px-5 py-2.5 sm:py-3 text-[12px] sm:text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-mono"
            >
              <span>$</span> démarrer l'install
            </a>
            <a
              href="#dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/30 backdrop-blur-sm px-4 sm:px-5 py-2.5 sm:py-3 text-[12px] sm:text-sm font-medium hover:bg-secondary/60 transition-colors font-mono"
            >
              voir le dashboard
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-10 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40 rounded-lg overflow-hidden border border-border/40">
          {[
            { v: "16384", l: "port" },
            { v: "0₿", l: "coût" },
            { v: "~5min", l: "install" },
            { v: "10", l: "outils" },
          ].map((s, i) => (
            <div key={i} className="bg-card p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-semibold tracking-tight tabular-nums font-mono text-primary">
                {s.v}
              </div>
              <div className="text-[10px] sm:text-[11px] text-foreground/60 mt-1 font-mono lowercase">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
