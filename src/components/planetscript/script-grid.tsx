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
          !s.tags.some((t) => t.toLowerCase().includes(q))
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

  const platforms: { key: PlatformFilter; label: string }[] = [
    { key: "all", label: "Toutes plateformes" },
    { key: "mobile", label: "Mobile" },
    { key: "pc", label: "PC" },
    { key: "universal", label: "Universel" },
  ];

  // Group scripts by category when no specific filter
  const grouped = filter === "all" && platformFilter === "all" && !query;

  return (
    <section id="scripts" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs font-mono text-emerald-600 mb-2">
              {String(filtered.length).padStart(2, "0")} / {scripts.length}{" "}
              scripts
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Bibliothèque de scripts
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Filtre par catégorie, plateforme ou cherche par mot-clé. Clique
              sur un script pour voir le code Lua complet et le copier.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
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
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition"
            />
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
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === c.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    filter === c.key
                      ? "bg-primary-foreground/20"
                      : "bg-background/60"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">
              Plateforme :
            </span>
            {platforms.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatformFilter(p.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  platformFilter === p.key
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid (grouped when no filter) */}
        {grouped ? (
          <div className="space-y-16">
            {(Object.keys(categoryMeta) as Category[]).map((cat) => {
              const list = scripts.filter((s) => s.category === cat);
              if (list.length === 0) return null;
              const meta = categoryMeta[cat];
              return (
                <section key={cat} id={cat} className="scroll-mt-20">
                  <div className="flex items-baseline justify-between gap-4 mb-5 pb-3 border-b border-border/60">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">
                        {meta.label}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        {meta.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {String(list.length).padStart(2, "0")} scripts
                    </span>
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
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">∅</div>
            <p className="text-sm">
              Aucun script ne correspond à ta recherche.
            </p>
            <button
              onClick={() => {
                setFilter("all");
                setPlatformFilter("all");
                setQuery("");
              }}
              className="mt-3 text-sm text-emerald-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
