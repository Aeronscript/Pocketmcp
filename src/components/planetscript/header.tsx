"use client";

import { useState, useEffect } from "react";

const NAV = [
  { label: "Visuel", href: "#visual" },
  { label: "RemoteEvents", href: "#remote" },
  { label: "Détection", href: "#detection" },
  { label: "Mobile UI", href: "#mobile-ui" },
  { label: "Utilitaires", href: "#utility" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-3 group shrink-0">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-105">
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
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
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/60 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 hover:border-border hover:bg-secondary/40 transition-colors"
              aria-label="GitHub"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.18c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
            </a>
            <a
              href="#scripts"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-emerald-500/20"
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

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors"
              aria-label="Menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 pt-2 border-t border-border/40">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/60 transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#scripts"
                onClick={() => setMobileOpen(false)}
                className="mt-2 px-3 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md text-center"
              >
                Explorer les scripts
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
