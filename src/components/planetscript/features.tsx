"use client";

export function Features() {
  const items = [
    {
      title: "Visuel saisissant",
      desc: "ESP haute performance, HUD animés, trails dynamiques. Rendu optimisé Drawing API qui tient 60 FPS même sur mobile bas de gamme.",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
    },
    {
      title: "Scanner RemoteEvents",
      desc: "Hook tous les RemoteEvents et RemoteFunctions du jeu. Log les arguments, compte les appels, détecte le spam et intercepte les payloads.",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
      ),
      accent: "from-amber-500/15 to-amber-500/0 text-amber-600",
    },
    {
      title: "Détection proactive",
      desc: "Scanne les LocalScripts pour des patterns anti-cheat, capture les erreurs avec stack trace, surveille FPS et mémoire en temps réel.",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      accent: "from-rose-500/15 to-rose-500/0 text-rose-600",
    },
    {
      title: "Compatibilité totale",
      desc: "Chargeur universel qui détecte l'exécuteur (Synapse, KRNL, Fluxus, Delta, Hydrogen) et normalise l'API. Mobile et PC sur le même code.",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
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
      accent: "from-violet-500/15 to-violet-500/0 text-violet-600",
    },
  ];

  return (
    <section className="py-20 sm:py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-mono text-emerald-600 mb-2">
            Pourquoi planetscript
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Tout ce qu'il faut pour exploiter à fond Roblox,
            <span className="text-muted-foreground"> proprement.</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-border/70 bg-card p-6 hover:border-border transition-colors overflow-hidden"
            >
              <div
                className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${item.accent} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
              />
              <div className="relative">
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent}`}
                >
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
