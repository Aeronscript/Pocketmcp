"use client";

import { useState, useEffect } from "react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18" />
              </svg>
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary pulse-green" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight font-mono">
                pocket<span className="text-primary">mcp</span>
              </span>
              <span className="text-[8px] sm:text-[9px] text-foreground/60 tracking-[0.18em] uppercase mt-0.5 font-mono hidden sm:block">
                roblox · mobile
              </span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {[
              { label: "dash", href: "#dashboard" },
              { label: "bridge", href: "#bridge" },
              { label: "setup", href: "#setup" },
              { label: "tools", href: "#tools" },
              { label: "faq", href: "#faq" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-[13px] text-foreground/70 hover:text-foreground rounded-md hover:bg-secondary/60 transition-colors font-mono"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-mono text-primary bg-primary/10 rounded-full border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-green" />
              v0.3.0
            </span>
            <a
              href="#setup"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 text-[12px] sm:text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors font-mono"
            >
              $ install
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
