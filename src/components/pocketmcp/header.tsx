"use client";

import { useState, useEffect } from "react";

interface Props {
  onLogout?: () => void;
  role?: "admin" | "user" | null;
}

export function Header({ onLogout, role }: Props = {}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/60" : "bg-transparent border-b border-transparent"}`}>
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          <a href="#top" className="flex items-center gap-1.5 group shrink-0 -ml-1 sm:ml-0">
            <div className="flex flex-col leading-none">
              <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight font-mono">pocket<span className="text-primary">mcp</span></span>
              <span className="text-[8px] sm:text-[9px] text-foreground/60 tracking-[0.18em] uppercase mt-0.5 font-mono hidden sm:block">{role === "admin" ? "admin" : "roblox · mobile"}</span>
            </div>
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
          </a>
          <nav className="hidden lg:flex items-center gap-0.5">
            {[{ label: "dash", href: "#dashboard" },{ label: "bridge", href: "#bridge" },{ label: "setup", href: "#setup" },{ label: "tools", href: "#tools" },{ label: "faq", href: "#faq" }].map((item) => (
              <a key={item.href} href={item.href} className="px-3 py-1.5 text-[13px] text-foreground/70 hover:text-foreground rounded-md hover:bg-secondary/60 transition-colors font-mono">{item.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-mono text-primary bg-primary/10 rounded-full border border-primary/20"><span className="h-1.5 w-1.5 rounded-full bg-primary pulse-green" />v0.3.0</span>
            <a href="#setup" className="hidden sm:inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 text-[12px] sm:text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors font-mono">$ install</a>
            {onLogout && (
              <button onClick={onLogout} className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 text-[12px] font-mono text-foreground/60 hover:text-rose-400 border border-border/60 hover:border-rose-500/30 rounded-md transition-colors" title="déconnexion">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                <span className="hidden sm:inline">logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
