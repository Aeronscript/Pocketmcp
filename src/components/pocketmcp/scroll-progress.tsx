"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * ScrollProgress : 3 améliorations UX discrètes
 *
 * 1. Scroll progress bar : une fine barre verte en haut qui montre la
 *    progression du scroll dans la page.
 * 2. Active section highlight : détecte la section visible et la passe
 *    au Header via une callback.
 * 3. Back-to-top button : un bouton discret en bas à droite qui apparaît
 *    quand on a scrollé plus de 600px.
 *
 * Ne touche pas au logo ni aux sections existantes.
 */

const SECTIONS = ["dashboard", "bridge", "setup", "tools", "faq"];

export function ScrollProgress({ onActiveSection }: { onActiveSection?: (id: string) => void }) {
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
      setShowBackToTop(scrollTop > 600);

      // Détecte la section active (la plus proche du haut du viewport)
      const offset = 120; // marge pour sticky header
      let active = "";
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom > offset) {
            active = id;
            break;
          }
        }
      }
      if (active && onActiveSection) onActiveSection(active);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [onActiveSection]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      {/* Scroll progress bar — fine, en haut, sous le Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none"
        aria-hidden
      >
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back-to-top button — discret, en bas à droite */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="retour en haut"
          className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full border border-border/60 bg-card/80 backdrop-blur-md text-foreground/70 hover:text-primary hover:border-primary/40 transition-all shadow-lg hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 mx-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
    </>
  );
}
