"use client";

import Image from "next/image";

interface Props {
  onClick: () => void;
}

export function FloatingDocs({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Ouvrir la documentation"
      className="fixed bottom-4 left-4 z-50 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-card border border-primary/40 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group overflow-hidden"
    >
      <Image
        src="/pocketmcp-logo-optimized.png"
        alt=""
        width={40}
        height={40}
        className="h-8 w-8 sm:h-10 sm:w-10 object-contain group-hover:scale-110 transition-transform"
      />
      {/* Tooltip */}
      <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-card border border-border text-[11px] font-mono text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        docs
      </span>
    </button>
  );
}
