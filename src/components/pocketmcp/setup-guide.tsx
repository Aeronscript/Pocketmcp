"use client";

import { useState } from "react";
import { toast } from "sonner";

const STEPS = [
  {
    id: 1,
    title: "installer termux",
    subtitle: "depuis f-droid (pas le play store)",
    code: `# telecharger termux depuis f-droid.org
# (le play store est obsolete et casse tout)

# une fois termux ouvert :
pkg update && pkg upgrade -y
pkg install git nodejs python -y`,
    note: "termux du play store ne marche plus depuis 2023. utilise f-droid.",
  },
  {
    id: 2,
    title: "installer bun",
    subtitle: "le runtime js pour le serveur mcp",
    code: `curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version`,
    note: "si curl n'est pas la : pkg install curl",
  },
  {
    id: 3,
    title: "cloner pocketmcp",
    subtitle: "et installer les dependances",
    code: `git clone https://github.com/aeronscript/pocketmcp.git
cd pocketmcp
bun install`,
    note: "le repo sera public une fois le projet stabilise.",
  },
  {
    id: 4,
    title: "demarrer le serveur",
    subtitle: "sur localhost:16384",
    code: `bun run dev

# serveur demarre sur http://localhost:16384
# dashboard accessible dans chrome mobile
# mcp endpoint: http://localhost:16384/mcp`,
    note: "garde termux ouvert. utilise tmux pour le background si besoin.",
  },
  {
    id: 5,
    title: "coller le bridge dans roblox",
    subtitle: "delta / hydrogen / krnl mobile",
    code: `-- dans ton executeur mobile :
local url = "localhost:16384"
loadstring(game:HttpGet("http://" .. url .. "/script.luau"))()

-- si websocket casse, ajoute avant :
getgenv().DisableWebSocket = true`,
    note: "doit etre execute dans un jeu roblox avec loadstring active.",
  },
  {
    id: 6,
    title: "connecter opencode",
    subtitle: "via le routeur mc",
    code: `# dans ta config opencode :
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}

# ouvrir le dashboard :
# chrome mobile → localhost:16384`,
    note: "le routeur mc propage le serveur a codex, claude, anyclaw etc.",
  },
];

export function SetupGuide() {
  const [activeStep, setActiveStep] = useState(1);
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (code: string, stepId: number) => {
    navigator.clipboard.writeText(code);
    setCopied(stepId);
    toast.success("copié dans le presse-papier");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section id="setup" className="py-16 sm:py-24 scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            SETUP · ~5 MINUTES
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> install guide
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            {"// 6 etapes · termux + bun + git + serveur + bridge + opencode"}
          </p>
        </div>

        {/* Steps navigation */}
        <div className="flex flex-wrap gap-1.5 mb-8">
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
              {s.title}
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
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center font-mono text-sm font-semibold ${
                  activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                }`}>
                  {String(step.id).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap mb-0.5">
                    <h3 className="text-[15px] font-mono font-semibold text-foreground">{step.title}</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">{"// "}{step.subtitle}</span>
                  </div>
                  <div className="mt-3 rounded-lg border border-border/40 bg-[#0d1117] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-secondary/30">
                      <span className="text-[10px] text-muted-foreground font-mono">~/{step.id === 5 ? "roblox" : "pocketmcp"}</span>
                      <button
                        onClick={() => copy(step.code, step.id)}
                        className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-mono transition-all ${
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
                    <pre className="p-3 text-[12px] leading-relaxed font-mono overflow-x-auto">
                      <code className="text-foreground/85">{step.code}</code>
                    </pre>
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground font-mono">
                    <span className="text-amber-400/70 shrink-0">⚠</span>
                    <span>{step.note}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Download bundle */}
        <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-base font-mono font-semibold text-foreground flex items-center gap-2">
                <span className="text-primary">⬇</span>
                bundle complet
              </h3>
              <p className="mt-1 text-[12px] text-muted-foreground font-mono">
                {"// setup.sh + bridge.luau + guide pdf · 12 ko total"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/download?type=setup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[12px] font-mono text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                setup.sh
              </a>
              <a
                href="/api/download?type=bridge"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-4 py-2 text-[12px] font-mono hover:bg-secondary/60 transition-colors"
              >
                bridge.luau
              </a>
              <a
                href="/api/download?type=guide"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-4 py-2 text-[12px] font-mono hover:bg-secondary/60 transition-colors"
              >
                guide.md
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
