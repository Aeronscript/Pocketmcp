"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Props {
  onLogout?: () => void;
  role?: "admin" | "user" | null;
  deviceId?: string | null;
}

export function Header({ onLogout, role, deviceId }: Props = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const copyDeviceId = async () => {
    if (!deviceId) return;
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      toast.success("ID copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("impossible de copier");
    }
  };

  // Short ID : 12 premiers chars pour l'affichage
  const shortId = deviceId ? deviceId.slice(0, 12) : "";
  const isAdmin = role === "admin";

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
            {/* Device ID : affiché avec style spécial pour admin */}
            {deviceId && (
              <button
                onClick={copyDeviceId}
                title={`Cliquez pour copier votre ID complet :\n${deviceId}`}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-[10px] sm:text-[11px] font-mono rounded-full border transition-all ${
                  isAdmin
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50"
                    : "bg-secondary/40 text-foreground/60 border-border/60 hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {isAdmin && (
                  <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-bold uppercase tracking-wider hidden sm:inline">admin</span>
                  </span>
                )}
                <span className="font-mono">{shortId}…</span>
                <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${copied ? "scale-110" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {copied ? (
                    <polyline points="20 6 9 17 4 12" />
                  ) : (
                    <>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </>
                  )}
                </svg>
              </button>
            )}
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
