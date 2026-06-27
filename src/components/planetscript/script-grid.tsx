"use client";

import { useState, useMemo } from "react";
import {
  scripts,
  categoryMeta,
  type Category,
  type Platform,
} from "@/lib/scripts-data";
import { ScriptCard } from "./script-card";

type Filter = "all" | Category;
type PlatformFilter = "all" | Platform;

export function ScriptGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      if (filter !== "all" && s.category !== filter) return false;
      if (platformFilter !== "all" && s.platform !== platformFilter)
        return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q) &&
          !s.tags.some((t) => t.toLowerCase().includes(q)) &&
          !s.tagline.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [filter, platformFilter, query]);

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: scripts.length },
    ...(Object.keys(categoryMeta) as Category[]).map((c) => ({
      key: c,
      label: categoryMeta[c].label,
      count: scripts.filter((s) => s.category === c).length,
    })),
  ];

  const platforms: { key: PlatformFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Toutes", icon: null },
    {
      key: "mobile",
      label: "Mobile",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
      ),
    },
    {
      key: "pc",
      label: "PC",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      key: "universal",
      label: "Universel",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
  ];

  const grouped = filter === "all" && platformFilter === "all" && !query;

  return (
    <section id="scripts" className="py-20 sm:py-28 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-3">
              <span className="h-px w-8 bg-emerald-500/40" />
              BIBLIOTHÈQUE
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.15]">
              {filtered.length} script{filtered.length > 1 ? "s" : ""}{" "}
              <span className="text-muted-foreground">disponible{filtered.length > 1 ? "s" : ""}</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl">
              Filtre par catégorie, plateforme ou cherche par mot-clé. Clique
              sur un script pour voir le code Lua complet et le copier.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-80">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ESP, RemoteSpy, fly..."
              className="w-full rounded-lg border border-border bg-secondary/30 backdrop-blur-sm pl-9 pr-9 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div
          id="categories"
          className="flex flex-col gap-4 mb-10"
        >
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all ${
                  filter === c.key
                    ? "bg-primary text-primary-foreground shadow-sm shadow-emerald-500/20"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/40"
                }`}
              >
                {c.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                    filter === c.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mr-1">
              Plateforme
            </span>
            {platforms.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatformFilter(p.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  platformFilter === p.key
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid (grouped when no filter) */}
        {grouped ? (
          <div className="space-y-16 sm:space-y-20">
            {(Object.keys(categoryMeta) as Category[]).map((cat) => {
              const list = scripts.filter((s) => s.category === cat);
              if (list.length === 0) return null;
              const meta = categoryMeta[cat];
              return (
                <section key={cat} id={cat} className="scroll-mt-20">
                  <div className="flex items-baseline justify-between gap-4 mb-5 sm:mb-6 pb-4 border-b border-border/50">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-emerald-500 tracking-[0.18em] uppercase">
                          {meta.short}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                          {meta.label}
                        </h3>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {String(list.length).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((s) => (
                      <ScriptCard key={s.id} script={s} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 sm:py-28 text-muted-foreground">
            <div className="text-5xl mb-4 opacity-40">∅</div>
            <p className="text-sm">
              Aucun script ne correspond à ta recherche.
            </p>
            <button
              onClick={() => {
                setFilter("all");
                setPlatformFilter("all");
                setQuery("");
              }}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
