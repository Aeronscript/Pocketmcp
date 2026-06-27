"use client";

export function Stats() {
  const items = [
    {
      value: "13",
      label: "Scripts actifs",
      sub: "+5 ce mois",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      value: "180K+",
      label: "Téléchargements",
      sub: "toutes plateformes",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
    {
      value: "5",
      label: "Catégories",
      sub: "visuel → mobile",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      value: "4.8",
      label: "Note moyenne",
      sub: "sur 13 scripts",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative border-y border-border/40 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className={`px-4 sm:px-6 py-8 sm:py-10 ${
                i < items.length - 1 ? "lg:border-r border-border/40" : ""
              } ${i % 2 === 0 ? "border-r lg:border-r border-border/40" : ""} ${
                i < 2 ? "border-b lg:border-b-0 border-border/40" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-500 mb-3">
                {item.icon}
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight tabular-nums leading-none">
                {item.value}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
