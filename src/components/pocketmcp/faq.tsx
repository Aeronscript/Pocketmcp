"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "ça marche avec tous les exécuteurs mobile ?",
    a: "testé avec delta, hydrogen et krnl mobile. arceus x devrait marcher aussi tant qu'il supporte loadstring + httpget. si websocket casse (cas sur mobile), le bridge bascule automatiquement en http polling 100ms — pas besoin de configurer quoi que ce soit.",
  },
  {
    q: "pourquoi pas roblox studio mobile ?",
    a: "roblox studio n'existe pas sur mobile. et l'app roblox officielle ne supporte pas loadstring. il faut utiliser un exécuteur mobile (apk modifié) qui injecte le support lua.",
  },
  {
    q: "est-ce qu'on peut se faire ban ?",
    a: "oui. tout exploit roblox comporte un risque de ban. le bridge lui-même est discret (juste http + json), mais les actions exécutées (walkspeed, esp, etc) peuvent être détectées par les anti-cheats des jeux. utilisez un compte secondaire.",
  },
  {
    q: "le serveur consomme combien de batterie ?",
    a: "node + bun sur termux = ~2-5% batterie/heure en idle, ~8-12% quand l'ia exécute du code en boucle. si la batterie chute, mettez termux en background avec tmux et fermez le dashboard chrome.",
  },
  {
    q: "l'ia (codex/claude) voit-elle roblox ?",
    a: "non directement. l'ia appelle les outils mcp (execute_code, get_instances, etc) qui interrogent le serveur pocketmcp, qui à son tour envoie des commandes au client roblox via http polling. l'ia voit le résultat (texte, json) mais pas l'écran — sauf si l'outil screenshot est supporté par l'exécuteur.",
  },
  {
    q: "ça marche hors-ligne ?",
    a: "le serveur pocketmcp tourne 100% en local sur votre tél. mais votre client ia (codex, opencode) nécessite souvent internet pour appeler les apis des llms. donc il faut du data/wifi pour l'ia, mais pas pour le bridge roblox.",
  },
  {
    q: "comment partager le serveur avec un pc sur le même wifi ?",
    a: "par défaut le serveur écoute sur 0.0.0.0 (toutes les interfaces). récupérez l'ip du tél (ifconfig wlan0) puis connectez le pc via http://[ip-tel]:16384. attention : pas d'auth, donc uniquement sur un réseau de confiance.",
  },
  {
    q: "combien de clients roblox peuvent se connecter ?",
    a: "autant que vous voulez. chaque client a sa propre queue de commandes et son propre id. l'ia peut cibler un client spécifique via le paramètre clientId, sinon le serveur utilise le premier client connecté.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-12 sm:py-24 scroll-mt-14 sm:scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            FAQ
          </div>
          <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> man help
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`rounded-lg border bg-card overflow-hidden transition-all ${
                open === i ? "border-primary/40" : "border-border/40"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-2 p-3 sm:p-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-primary font-mono text-[11px] sm:text-[12px] shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-mono text-foreground/90">{faq.q}</span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open === i ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {open === i && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                  <div className="pl-6 sm:pl-8 text-[11px] sm:text-[13px] text-muted-foreground leading-relaxed font-mono">
                    <span className="text-primary">$ </span>
                    {faq.a}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
