"use client";

import { useState } from "react";
import { toast } from "sonner";

const INSTALL_ONE_LINE = `bash <(curl -fsSL https://pmcp.space-z.ai/api/install.sh)`;

const STEPS = [
  {
    id: 1,
    title: "installer via termux",
    subtitle: "1 commande",
    code: `# prérequis : termux installé (depuis f-droid)
# ouvrez termux et collez :

bash <(curl -fsSL https://pmcp.space-z.ai/api/install.sh)

# ça installe :
#   - node 18+ (si manquant)
#   - bun 1.3+ (si manquant)
#   - clone le repo pocketmcp
#   - bun install (dépendances npm)
#   - configure le PATH dans ~/.bashrc
# durée typique : 3 à 5 minutes selon votre connexion`,
    note: "nécessite termux depuis f-droid (pas le play store, qui est obsolète). connexion internet requise pendant l'install.",
  },
  {
    id: 2,
    title: "démarrez le serveur",
    subtitle: "1 commande",
    code: `cd ~/pocketmcp
bun run index.min.js

# serveur live sur http://localhost:16384
# dashboard: http://localhost:16384
# mcp endpoint: http://localhost:16384/mcp
# bridge auto-servi sur /script.luau`,
    note: "gardez termux ouvert. pour le background : tmux new -s mcp puis bun run index.min.js, detach avec Ctrl+B D",
  },
  {
    id: 3,
    title: "collez le bridge dans roblox",
    subtitle: "delta / hydrogen / krnl mobile",
    code: `-- dans votre executeur mobile, juste ça :
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()

-- si websocket casse (cas sur mobile) :
getgenv().DisableWebSocket = true
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()`,
    note: "le serveur auto-sert le bridge, pas besoin de copier le code manuellement. doit être exécuté dans un jeu roblox avec loadstring activé.",
  },
  {
    id: 4,
    title: "connectez votre IA",
    subtitle: "opencode / codex / claude",
    code: `# dans la config de votre client IA :
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}

# le routeur mc propage a codex, claude, anyclaw...
# votre IA peut maintenant executer du lua dans roblox`,
    note: "redémarrez votre client IA après la config pour qu'il détecte le serveur. compatible opencode, codex cli, claude code, claude desktop, anyclaw.",
  },
];

export function SetupGuide() {
  const [activeStep, setActiveStep] = useState(1);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedInstall, setCopiedInstall] = useState(false);

  const copy = (code: string, stepId: number) => {
    navigator.clipboard.writeText(code);
    setCopied(stepId);
    toast.success("copié dans le presse-papier");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyInstall = () => {
    navigator.clipboard.writeText(INSTALL_ONE_LINE);
    setCopiedInstall(true);
    toast.success("commande d'install copiée", {
      description: "colle-la dans termux",
    });
    setTimeout(() => setCopiedInstall(false), 2400);
  };

  return (
    <section id="setup" className="py-12 sm:py-24 scroll-mt-14 sm:scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            SETUP · ~5 MINUTES TOTAL
          </div>
          <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> install guide
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-mono">
            {"// 4 étapes · install → start → bridge → IA"}
          </p>
        </div>

        {/* Big install command — featured */}
        <div className="mb-6 sm:mb-8 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-6 relative overflow-hidden">
          <div aria-hidden className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] sm:text-base font-mono font-semibold text-primary flex items-center gap-2">
                  <span>⚡</span>
                  install en 1 commande
                </h3>
                <p className="mt-1 text-[11px] sm:text-[12px] text-muted-foreground font-mono">
                  {"// ouvrez termux, collez ça, attendez 3 minutes, c'est fini"}
                </p>
              </div>
              <button
                onClick={copyInstall}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] sm:text-[12px] font-mono font-semibold transition-all ${
                  copiedInstall
                    ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                }`}
              >
                {copiedInstall ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    copié !
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    copier
                  </>
                )}
              </button>
            </div>
            <div className="rounded-lg border border-border/40 bg-[#0d1117] p-3 sm:p-4 font-mono text-[10px] sm:text-[12px] overflow-x-auto">
              <span className="text-primary">$</span>{" "}
              <span className="text-foreground break-all">{INSTALL_ONE_LINE}</span>
            </div>
          </div>
        </div>

        {/* Steps navigation */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveStep(s.id);
                document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-mono transition-all border ${
                activeStep === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border"
              }`}
            >
              <span className="tabular-nums">{String(s.id).padStart(2, "0")}</span>
              {s.title.split("·")[0].trim()}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              id={`step-${step.id}`}
              className={`rounded-xl border bg-card overflow-hidden transition-all ${
                activeStep === step.id ? "border-primary/40 shadow-lg shadow-primary/5" : "border-border/40"
              }`}
            >
              <div className="flex items-start gap-3 p-3 sm:p-5">
                <div className={`shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center font-mono text-[13px] sm:text-sm font-semibold ${
                  activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                }`}>
                  {String(step.id).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                    <h3 className="text-[13px] sm:text-[15px] font-mono font-semibold text-foreground">{step.title}</h3>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">{"// "}{step.subtitle}</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3 rounded-lg border border-border/40 bg-[#0d1117] overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 border-b border-border/40 bg-secondary/30">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">
                        ~/{step.id === 3 ? "roblox" : "pocketmcp"}
                      </span>
                      <button
                        onClick={() => copy(step.code, step.id)}
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] sm:text-[10px] font-mono transition-all ${
                          copied === step.id
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {copied === step.id ? (
                          <>
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            copié
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            copier
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 sm:p-3 text-[10px] sm:text-[12px] leading-relaxed font-mono overflow-x-auto">
                      <code className="text-foreground/85">{step.code}</code>
                    </pre>
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                    <span className="text-amber-400/70 shrink-0">⚠</span>
                    <span>{step.note}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live server status */}
        <div className="mt-6 rounded-xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-mono font-semibold text-foreground">
              <span className="text-primary">●</span> serveur live (démo)
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">localhost:16384</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <a
              href="http://localhost:16384"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-secondary/40 hover:bg-secondary/60 transition-colors py-3 px-2"
            >
              <div className="text-[10px] text-muted-foreground font-mono uppercase mb-1">dashboard</div>
              <div className="text-[11px] font-mono text-primary">/:16384</div>
            </a>
            <a
              href="http://localhost:16384/health"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-secondary/40 hover:bg-secondary/60 transition-colors py-3 px-2"
            >
              <div className="text-[10px] text-muted-foreground font-mono uppercase mb-1">health</div>
              <div className="text-[11px] font-mono text-primary">/health</div>
            </a>
            <a
              href="http://localhost:16384/script.luau"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-secondary/40 hover:bg-secondary/60 transition-colors py-3 px-2"
            >
              <div className="text-[10px] text-muted-foreground font-mono uppercase mb-1">bridge</div>
              <div className="text-[11px] font-mono text-primary">/script.luau</div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
