"use client";

import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-secondary/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 shrink-0">
                <Image
                  src="/pocketmcp-logo-optimized.png"
                  alt="pocketmcp"
                  width={36}
                  height={36}
                  className="h-full w-auto object-contain"
                />
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
          <div className="md:col-span-2 md:col-start-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4 font-mono">
              sections
            </div>
            <ul className="space-y-2.5 text-sm font-mono">
              {[
                { label: "dashboard", href: "#dashboard" },
                { label: "bridge", href: "#bridge" },
                { label: "setup", href: "#setup" },
                { label: "outils", href: "#tools" },
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

          {/* Support */}
          <div className="md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4 font-mono">
              support
            </div>
            <ul className="space-y-2.5 text-sm font-mono">
              <li>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdPMsjCSuXzasdzLe8BEXXk59DB_VLxoyXmfCOZTjsZmXJljQ/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  contacter
                </a>
              </li>
              <li>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdPMsjCSuXzasdzLe8BEXXk59DB_VLxoyXmfCOZTjsZmXJljQ/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  signaler un bug
                </a>
              </li>
              <li>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdPMsjCSuXzasdzLe8BEXXk59DB_VLxoyXmfCOZTjsZmXJljQ/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  demander une feature
                </a>
              </li>
            </ul>
          </div>

          {/* À savoir */}
          <div className="md:col-span-2">
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
