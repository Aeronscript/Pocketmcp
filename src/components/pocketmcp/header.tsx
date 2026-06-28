"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <Image
                src="/pocketmcp-logo-optimized.png"
                alt="pocketmcp"
                width={36}
                height={36}
                className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                priority
              />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary pulse-green" />
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
