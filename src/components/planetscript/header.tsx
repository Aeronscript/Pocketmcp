"use client";

import { useState, useEffect } from "react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
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
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Visuel", href: "#visual" },
              { label: "RemoteEvents", href: "#remote" },
              { label: "Détection", href: "#detection" },
              { label: "Mobile UI", href: "#mobile-ui" },
              { label: "Utilitaires", href: "#utility" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#scripts"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              Explorer
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
