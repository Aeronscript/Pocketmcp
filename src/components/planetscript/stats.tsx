"use client";

export function Stats() {
  const items = [
    { value: "12", label: "Scripts actifs", sub: "+3 ce mois" },
    { value: "150K+", label: "Téléchargements", sub: "toutes plateformes" },
    { value: "5", label: "Catégories", sub: "visuel, remote, détection..." },
    { value: "4.7", label: "Note moyenne", sub: "sur 12 scripts" },
  ];

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/60">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-8 sm:py-10 text-center">
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
                {item.value}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
