"use client";

export function FloatingDocs() {
  return (
    <a
      href="#docs"
      aria-label="Documentation"
      className="fixed bottom-4 left-4 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 sm:h-6 sm:w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="13" y2="11" />
      </svg>
      {/* Tooltip */}
      <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-card border border-border text-[11px] font-mono text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        docs
      </span>
    </a>
  );
}
