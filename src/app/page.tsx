"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/pocketmcp/header";
import { Hero } from "@/components/pocketmcp/hero";
import { Dashboard } from "@/components/pocketmcp/dashboard";
import { Bridge } from "@/components/pocketmcp/bridge";
import { SetupGuide } from "@/components/pocketmcp/setup-guide";
import { Tools } from "@/components/pocketmcp/tools";
import { FAQ } from "@/components/pocketmcp/faq";
import { Footer } from "@/components/pocketmcp/footer";
import { FloatingDocs } from "@/components/pocketmcp/floating-docs";
import { DocsPage } from "@/components/pocketmcp/docs-page";

export default function Home() {
  const [view, setView] = useState<"home" | "docs">("home");

  // Handle ESC to go back from docs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view === "docs") {
        setView("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  // Lock scroll when docs is open
  useEffect(() => {
    if (view === "docs") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [view]);

  if (view === "docs") {
    return <DocsPage onBack={() => setView("home")} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero onOpenDocs={() => setView("docs")} />
        <Dashboard />
        <Bridge />
        <SetupGuide />
        <Tools />
        <DocsCTA onOpenDocs={() => setView("docs")} />
        <FAQ />
      </main>
      <Footer />
      <FloatingDocs onClick={() => setView("docs")} />
    </div>
  );
}

/* CTA section to direct users to the docs page */
function DocsCTA({ onOpenDocs }: { onOpenDocs: () => void }) {
  return (
    <section className="py-12 sm:py-20 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-10 text-center">
          {/* Decorative glow */}
          <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-[600px] rounded-full bg-primary/20 blur-3xl" />
          <div aria-hidden className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-primary mb-3">
              <span className="h-px w-8 bg-primary/40" />
              DOCUMENTATION COMPLÈTE
              <span className="h-px w-8 bg-primary/40" />
            </div>
            <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono mb-3">
              voulez-vous en savoir plus ?
            </h2>
            <p className="text-[13px] sm:text-[14px] text-foreground/70 leading-relaxed max-w-xl mx-auto mb-6 font-mono">
              la docs dédiée explique tout en détail : architecture, installation pas à pas,
              api reference, configuration, exemples de code, dépannage, sécurité.
              8 sections, immersion totale.
            </p>
            <button
              onClick={onOpenDocs}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 sm:px-6 sm:py-3 text-[13px] sm:text-[14px] font-mono font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              ouvrir la docs
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <p className="mt-3 text-[10px] font-mono text-foreground/40">
              ou cliquez sur l'icône livre en bas à gauche
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
