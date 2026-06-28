"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

const BRIDGE_MINIMAL = `-- dans votre executeur mobile, juste ça :
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()

-- le bridge v3 s'auto-sert avec :
--   - auto-détection WebSocket (essaie 3s, bascule HTTP si mort)
--   - auto-fallback request → HttpGet/HttpPost
--   - 100ms HTTP polling
--   - 10 handlers (execute, decompile, instances, spy, click, screenshot...)`;

const TEST_RESULTS = [
  { name: "HttpGet", status: "ok", note: "marche" },
  { name: "request", status: "ok", note: "marche (syn.request equiv)" },
  { name: "writefile", status: "ok", note: "marche" },
  { name: "WebSocket", status: "dead", note: "mort — auto-bascule HTTP" },
];

export function Bridge() {
  const [view, setView] = useState<"minimal" | "full">("minimal");
  const [copied, setCopied] = useState(false);
  const [bridgeCode, setBridgeCode] = useState<string>("");
  const [loadingBridge, setLoadingBridge] = useState(true);

  // Fetch le vrai bridge depuis le serveur
  useEffect(() => {
    fetch("http://localhost:16384/script.luau")
      .then((r) => r.text())
      .then((code) => {
        setBridgeCode(code);
        setLoadingBridge(false);
      })
      .catch(() => {
        setBridgeCode("-- serveur injoignable sur localhost:16384\n-- démarre-le avec: cd ~/pocketmcp && bun run dev");
        setLoadingBridge(false);
      });
  }, []);

  const code = view === "full" ? bridgeCode : BRIDGE_MINIMAL;

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("bridge copié", {
      description: view === "full" ? "code complet v3" : "version courte",
    });
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <section id="bridge" className="py-12 sm:py-24 scroll-mt-14 sm:scroll-mt-16 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            BRIDGE · LUA SCRIPT v3
          </div>
          <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> cat bridge.luau
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-mono">
            {"// auto-servi par le serveur sur /script.luau · testé sur roblox mobile"}
          </p>
        </div>

        {/* Test results banner */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="text-primary text-base sm:text-lg shrink-0">✓</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-[12px] sm:text-sm font-mono font-semibold text-primary mb-3">
                testé sur roblox mobile (delta) — 100% fonctionnel
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEST_RESULTS.map((t) => (
                  <div
                    key={t.name}
                    className={`rounded-md border px-3 py-2 text-center ${
                      t.status === "ok"
                        ? "border-primary/30 bg-primary/10"
                        : "border-rose-500/30 bg-rose-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-sm font-mono font-semibold ${
                        t.status === "ok" ? "text-primary" : "text-rose-400"
                      }`}>
                        {t.name}
                      </span>
                      <span className={`text-xs ${t.status === "ok" ? "text-primary" : "text-rose-400"}`}>
                        {t.status === "ok" ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {t.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bridge code viewer */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-primary/5">
          {/* Toolbar principale : traffic lights + path + bouton copier (toujours visible) */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary/70" />
              </div>
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate">
                ~/bridge.luau
              </span>
            </div>
            <button
              onClick={copy}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all ${
                copied
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
              }`}
            >
              {copied ? (
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

          {/* Toolbar secondaire : toggle minimal/full source */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/40 bg-background/40">
            <div className="flex items-center gap-1 rounded-md bg-secondary/60 p-0.5 border border-border/40">
              <button
                onClick={() => setView("minimal")}
                className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-mono rounded transition-all ${
                  view === "minimal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                minimal
              </button>
              <button
                onClick={() => setView("full")}
                className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-mono rounded transition-all ${
                  view === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                full source
              </button>
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">
              {view === "full" ? "v3 · 14KB · 350 lignes" : "1 ligne · copie-colle dans roblox"}
            </span>
          </div>

          <div className="relative bg-[#0d1117]">
            <pre className="max-h-[400px] sm:max-h-[480px] overflow-auto p-3 sm:p-4 text-[10px] sm:text-[12px] leading-[1.6] font-mono">
              <code className="text-[#c9d1d9] whitespace-pre">
                {view === "full" && loadingBridge ? "// chargement du bridge..." : code}
              </code>
            </pre>
          </div>

          <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 border-t border-border/40 bg-secondary/30 text-[9px] sm:text-[10px] font-mono text-muted-foreground">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-primary">● lua</span>
              <span>utf-8</span>
              <span>lf</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{code.split("\n").length} lignes</span>
              <span>{code.length.toLocaleString("fr-FR")} caractères</span>
            </div>
          </div>
        </div>

        {/* Info boxes */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-primary text-sm shrink-0">✓</span>
              <div>
                <div className="text-[12px] font-mono font-semibold text-primary mb-1">auto-détection websocket</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  le bridge essaie websocket pendant 3s au démarrage. si ça échoue (cas sur mobile),
                  il bascule automatiquement sur http polling 100ms. zéro config.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-primary text-sm shrink-0">✓</span>
              <div>
                <div className="text-[12px] font-mono font-semibold text-primary mb-1">auto-fallback request → httpget</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  si <code className="px-1 py-0.5 rounded bg-primary/10 text-primary">request()</code> échoue 3 fois,
                  bascule sur <code className="px-1 py-0.5 rounded bg-primary/10 text-primary">game:HttpGet</code> qui
                  contourne l'exécuteur et tape direct roblox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
