"use client";

import { useState, useEffect } from "react";

type Section =
  | "intro"
  | "architecture"
  | "install"
  | "api"
  | "config"
  | "examples"
  | "troubleshoot"
  | "security"
  | "admin";

const SECTIONS: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: "intro", label: "introduction", icon: "▸", desc: "ce qu'est pocketmcp" },
  { id: "architecture", label: "architecture", icon: "▤", desc: "comment ça marche" },
  { id: "install", label: "installation", icon: "⬇", desc: "setup pas à pas" },
  { id: "api", label: "api reference", icon: "◈", desc: "endpoints http + mcp" },
  { id: "config", label: "configuration", icon: "⚙", desc: "variables + clients ia" },
  { id: "examples", label: "exemples", icon: "▶", desc: "snippets lua prêts" },
  { id: "troubleshoot", label: "dépannage", icon: "?", desc: "problèmes courants" },
  { id: "security", label: "sécurité", icon: "⚠", desc: "risques + bonnes pratiques" },
];

const ADMIN_SECTION = { id: "admin" as Section, label: "code admin", icon: "🔐", desc: "générer des codes d'accès" };

interface Props {
  onBack: () => void;
  onNavigate?: (section: string) => void;
  isAdmin?: boolean;
  adminCode?: string;
  AdminComponent?: React.ReactNode;
}

export function DocsPage({ onBack, onNavigate, isAdmin, adminCode, AdminComponent }: Props) {
  const [section, setSection] = useState<Section>("intro");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visibleSections = isAdmin ? [...SECTIONS, ADMIN_SECTION] : SECTIONS;

  // Scroll to top on section change
  useEffect(() => {
    document.getElementById("docs-content")?.scrollTo(0, 0);
  }, [section]);

  // Handle navigation to home section
  const goToSection = (id: string) => {
    onBack();
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border/60 bg-secondary/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                className="shrink-0 inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 text-[12px] font-mono text-foreground/80 hover:text-foreground border border-border/60 hover:bg-secondary/60 rounded-md transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M11 18l-6-6 6-6" />
                </svg>
                <span className="hidden sm:inline">retour</span>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-primary font-mono text-[13px] sm:text-[14px] font-semibold truncate">
                  ~/docs
                </span>
                <span className="text-foreground/40 font-mono text-[11px] sm:text-[12px] hidden sm:inline">
                  / {section}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Liens rapides vers sections home */}
              <nav className="hidden md:flex items-center gap-0.5 mr-2">
                {[
                  { label: "dash", id: "dashboard" },
                  { label: "bridge", id: "bridge" },
                  { label: "setup", id: "setup" },
                  { label: "tools", id: "tools" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToSection(item.id)}
                    className="px-2.5 py-1 text-[12px] text-foreground/60 hover:text-foreground rounded-md hover:bg-secondary/60 transition-colors font-mono"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-mono text-primary bg-primary/10 rounded-full border border-primary/20">
                <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-green" />
                v0.3.0
              </span>
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-md border border-border/60 hover:bg-secondary/60 transition-colors"
                aria-label="Sommaire"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {sidebarOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout : sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block absolute lg:relative z-30 lg:z-0 inset-y-0 left-0 w-72 lg:w-64 xl:w-72 bg-card lg:bg-transparent border-r border-border/60 lg:border-r-0 overflow-y-auto pt-4 pb-8 lg:pt-6`}
        >
          <div className="px-3 sm:px-4 lg:px-6">
            <div className="text-[10px] font-mono text-foreground/50 uppercase tracking-[0.16em] mb-3 px-2">
              sommaire
            </div>
            <nav className="space-y-0.5">
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSection(s.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors group ${
                    section === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[12px] shrink-0 ${section === s.id ? "text-primary" : "text-foreground/40 group-hover:text-foreground/70"}`}>
                      {s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-mono font-medium truncate">{s.label}</div>
                      <div className="text-[10px] text-foreground/50 truncate hidden sm:block">{s.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-border/40 px-2">
              <div className="text-[10px] font-mono text-foreground/50 uppercase tracking-[0.16em] mb-2">
                raccourcis
              </div>
              <div className="space-y-1.5 text-[11px] font-mono text-foreground/60">
                <div className="flex items-center justify-between">
                  <span>recherche</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 border border-border/40 text-[10px]">/</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>retour</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 border border-border/40 text-[10px]">esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay pour mobile quand sidebar open */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <main id="docs-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
            {section === "intro" && <IntroSection />}
            {section === "architecture" && <ArchitectureSection />}
            {section === "install" && <InstallSection />}
            {section === "api" && <ApiSection />}
            {section === "config" && <ConfigSection />}
            {section === "examples" && <ExamplesSection />}
            {section === "troubleshoot" && <TroubleshootSection />}
            {section === "security" && <SecuritySection onBack={onBack} />}
            {section === "admin" && isAdmin && AdminComponent}

            {/* Navigation footer */}
            <div className="mt-12 pt-6 border-t border-border/40 flex items-center justify-between gap-3">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-[12px] font-mono text-foreground/60 hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M11 18l-6-6 6-6" />
                </svg>
                retour à l'accueil
              </button>
              <div className="flex items-center gap-1.5">
                {visibleSections.findIndex((s) => s.id === section) > 0 && (
                  <button
                    onClick={() => setSection(visibleSections[visibleSections.findIndex((s) => s.id === section) - 1].id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono text-foreground/60 hover:text-foreground hover:bg-secondary/60 rounded-md transition-colors"
                  >
                    ← précédent
                  </button>
                )}
                {visibleSections.findIndex((s) => s.id === section) < visibleSections.length - 1 && (
                  <button
                    onClick={() => setSection(visibleSections[visibleSections.findIndex((s) => s.id === section) + 1].id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
                  >
                    suivant →
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────── SECTIONS ─────────────────────── */

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pour le bash/json : on garde whitespace-pre + scroll-x (commandes longues)
  // Pour le lua/text : on wrap (lisibilité, pas de scroll horizontal)
  const isWrap = lang === "lua" || lang === "text" || lang === "ascii";

  return (
    <div className="rounded-lg border border-border/40 bg-[#0d1117] overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-secondary/30">
        <span className="text-[10px] font-mono text-foreground/50 uppercase tracking-wider">{lang}</span>
        <button
          onClick={copy}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono transition-all ${
            copied
              ? "bg-primary/20 text-primary"
              : "text-foreground/60 hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          {copied ? (
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
      <pre className={`p-3 sm:p-4 text-[11px] sm:text-[12px] leading-[1.65] font-mono ${isWrap ? "overflow-x-hidden" : "overflow-x-auto"}`}>
        <code className={`text-[#c9d1d9] ${isWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}>{code}</code>
      </pre>
    </div>
  );
}

function Callout({ type = "info", title, children }: { type?: "info" | "warn" | "danger" | "success"; title: string; children: React.ReactNode }) {
  const styles = {
    info: "border-sky-500/30 bg-sky-500/5 text-sky-300",
    warn: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    danger: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    success: "border-primary/30 bg-primary/5 text-primary",
  };
  const icons = { info: "ℹ", warn: "⚠", danger: "✗", success: "✓" };
  return (
    <div className={`rounded-lg border p-3.5 sm:p-4 my-4 ${styles[type]}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-sm shrink-0 mt-0.5">{icons[type]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] sm:text-[13px] font-mono font-semibold mb-1">{title}</div>
          <div className="text-[11px] sm:text-[12px] text-foreground/75 leading-relaxed font-mono">{children}</div>
        </div>
      </div>
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono mb-3">{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg sm:text-xl font-mono font-semibold text-primary mt-8 mb-3 flex items-center gap-2"><span className="text-foreground/30">#</span>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[14px] sm:text-[15px] font-mono font-semibold text-foreground mt-5 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] sm:text-[14px] text-foreground/75 leading-relaxed mb-3 font-mono">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-secondary/60 text-primary text-[12px] font-mono">{children}</code>;
}

/* ─── INTRO ─── */
function IntroSection() {
  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">DOCUMENTATION</div>
      <H1>pocketmcp, c'est quoi ?</H1>
      <P>
        pocketmcp est un serveur <Code>MCP</Code> (Model Context Protocol) qui permet à une IA
        (opencode, codex, claude...) d'exécuter du code Lua dans un client Roblox mobile.
        tout tourne en local sur votre téléphone android via termux, aucun cloud.
      </P>

      <Callout type="info" title="en résumé">
        votre ia → serveur pocketmcp (termux) → bridge lua → roblox mobile.
        l'ia peut exécuter du code, décompiler des scripts, espionner les remotes, etc.
      </Callout>

      <H2>ce que ça permet</H2>
      <div className="space-y-2.5">
        {[
          { t: "exécuter du code lua à distance", d: "votre ia envoie du code, roblox l'exécute, vous récupérez le résultat" },
          { t: "décompiler des scripts du jeu", d: "récupérez le source des localscripts/modulescripts pour l'audit" },
          { t: "espionner les remoteevents", d: "hook fireserver / invokeserver, log les args et compte les appels" },
          { t: "naviguer dans l'arbre d'instances", d: "sélecteur css-like : game.replicatedstorage.remotes.*" },
          { t: "interagir avec le gui", d: "cliquez sur des boutons in-game via firesignal" },
          { t: "monitorer en temps réel", d: "fps, ping, position, santé des joueurs connectés" },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card">
            <span className="text-primary font-mono text-[12px] shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="text-[13px] font-mono font-semibold text-foreground">{f.t}</div>
              <div className="text-[11px] text-foreground/60 mt-0.5 font-mono">{f.d}</div>
            </div>
          </div>
        ))}
      </div>

      <H2>ce que ça ne fait pas</H2>
      <Callout type="warn" title="limites honnêtes">
        - pocketmcp ne contourne pas l'anti-cheat de roblox. c'est à vous de coder vos scripts en conséquence.<br/>
        - screenshot ne marche pas sur mobile (pas d'api screenshotworkspace). le serveur répond automatiquement avec des alternatives (get_instances, decompile_script) au lieu de timeout.<br/>
        - websocket ne fonctionne pas sur mobile (bascule auto en http polling 100ms).<br/>
        - le serveur écoute sur localhost par défaut (sécurisé). authentification obligatoire (code admin hashé SHA-256 + codes temporaires à usage unique).
      </Callout>

      <H2>public visé</H2>
      <P>
        ce projet s'adresse aux développeurs / scripteurs roblox qui veulent piloter leur jeu
        depuis une ia, sur mobile. ce n'est pas un "hub de scripts" tout fait — c'est une
        infrastructure à brancher sur votre client ia préféré.
      </P>

      <Callout type="success" title="prêt à commencer ?">
        commencez par la section <strong>installation</strong> pour mettre en place le serveur,
        puis suivez l'ordre du sommaire. tout est expliqué pas à pas.
      </Callout>
    </div>
  );
}

/* ─── ARCHITECTURE ─── */
function ArchitectureSection() {
  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">ARCHITECTURE</div>
      <H1>comment ça marche</H1>
      <P>
        pocketmcp est composé de 3 briques qui communiquent via http/json.
        comprendre le flux aide à debugger quand quelque chose ne marche pas.
      </P>

      <Callout type="warn" title="prérequis avant l'install">
        - <strong>termux</strong> installé depuis f-droid (la version play store est obsolète)<br/>
        - <strong>un exécuteur roblox mobile</strong> : delta, hydrogen, krnl mobile (loadstring + httpget requis)<br/>
        - <strong>un client ia compatible mcp</strong> : opencode, codex cli, claude code, claude desktop, anyclaw<br/>
        - <strong>connexion internet</strong> pendant l'install (récupère le repo + dépendances)<br/>
        - <strong>compte roblox secondaire</strong> recommandé (risque de ban existe pour tout exploit)
      </Callout>

      <H2>vue d'ensemble du système</H2>
      <CodeBlock lang="ascii" code={`┌──────────────────────────────────────────────────────────┐
│  votre téléphone android                                  │
│                                                          │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │  termux      │    │  pocketmcp server (bun)      │   │
│  │  - node 18+  │───→│  port 16384                  │   │
│  │  - bun 1.3+  │    │                              │   │
│  └──────────────┘    │  - http api /api/*           │   │
│                      │  - mcp endpoint /mcp         │   │
│  ┌──────────────┐    │  - dashboard /               │   │
│  │  chrome      │←──→│  - bridge auto-servi         │   │
│  │  mobile      │    └──────────┬───────────────────┘   │
│  └──────────────┘               │ http polling 100ms     │
│                                 │                        │
│  ┌──────────────┐               │                        │
│  │  delta /     │←──────────────┘                        │
│  │  hydrogen    │                                        │
│  │  (roblox)    │                                        │
│  └──────────────┘                                        │
└──────────────────────────────────────────────────────────┘
         ↑ mcp json-rpc 2.0
         ↓
┌──────────────────────────────────────────────────────────┐
│  client ia (opencode / codex / claude / anyclaw)         │
│  connecté via routeur mc                                 │
└──────────────────────────────────────────────────────────┘`} />

      <H2>flux d'une commande execute_code</H2>
      <P>quand votre ia veut exécuter du code lua dans roblox :</P>
      <div className="space-y-2">
        {[
          { n: 1, t: "l'ia appelle POST /mcp", d: "avec method tools/call, params name=execute_code, arguments={code: '...'}" },
          { n: 2, t: "le serveur empile la commande", d: "dans la queue du client roblox connecté (par clientId)" },
          { n: 3, t: "le bridge lua poll", d: "toutes les 100ms, il appelle POST /api/poll pour récupérer ses commandes" },
          { n: 4, t: "le bridge exécute le code", d: "via loadstring(), en capturant les print() et warn()" },
          { n: 5, t: "le bridge renvoie le résultat", d: "POST /api/result avec {ok, result, error, logs[]}" },
          { n: 6, t: "le serveur répond à l'ia", d: "formaté en json-rpc 2.0 avec content[{type, text}]" },
        ].map((step) => (
          <div key={step.n} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card">
            <span className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-mono font-semibold">{step.n}</span>
            <div>
              <div className="text-[13px] font-mono font-semibold text-foreground">{step.t}</div>
              <div className="text-[11px] text-foreground/60 mt-0.5 font-mono">{step.d}</div>
            </div>
          </div>
        ))}
      </div>

      <H2>pourquoi pas websocket ?</H2>
      <P>
        testé sur delta mobile : l'api <Code>WebSocket</Code> est bien présente dans l'exécuteur
        mais ne parvient pas à se connecter (timeout ou erreur silencieuse).
        le bridge essaie ws pendant 3s au démarrage, et si la connexion échoue il bascule
        automatiquement sur http polling 100ms. c'est transparent, aucune config n'est nécessaire.
      </P>
      <Callout type="info" title="sur pc">
        sur synapse x et script-ware (pc), le websocket fonctionne normalement.
        le bridge l'utilisera automatiquement si disponible.
      </Callout>

      <H2>auto-fallback http</H2>
      <P>
        si <Code>request()</Code> échoue 3 fois de suite (cas rare sur delta, possible sur
        exécuteurs instables), le bridge bascule sur <Code>game:HttpGet</Code> / <Code>game:HttpPost</Code>
        qui contourne l'exécuteur et tape directement l'api roblox. l'état du mode http est
        remonté au serveur via heartbeat : <Code>request</Code> / <Code>httpget</Code> / <Code>httpfailed</Code>.
      </P>

      <H2>backoff progressif du polling</H2>
      <P>
        pour éviter de surcharger l'exécuteur (rate limits, lag sur jeux lourds, batterie),
        le bridge n'utilise pas un polling fixe. il adapte dynamiquement l'intervalle :
      </P>
      <CodeBlock lang="text" code={`100ms   → 150ms   → 225ms   → 337ms   → 506ms   → 759ms   → 1000ms (cap)
  ↑                              ×1.5 à chaque poll vide                              ↑
  └─ reset immédiat quand une commande arrive           idle (1 req/s, négligeable) ──┘`} />
      <Callout type="info" title="logique de backoff">
        - <strong>100ms</strong> quand des commandes sont en attente (réactif)<br/>
        - <strong>×1.5</strong> à chaque poll vide → augmente progressivement<br/>
        - <strong>×2</strong> si request échoue (backoff agressif)<br/>
        - <strong>cap à 1s</strong> en idle (1 req/s au lieu de 10 req/s)<br/>
        - <strong>reset immédiat</strong> à 100ms dès qu'une commande arrive
      </Callout>
      <P>
        le poll interval courant est remonté au serveur via heartbeat et visible dans le dashboard
        (badge violet <Code>poll: XXXms</Code>). ça permet de voir en temps réel si le bridge est
        actif (100ms) ou idle (1s).
      </P>
      <Callout type="success" title="bénéfices pratique">
        sur delta avec un jeu lourd : au lieu de 10 requêtes/seconde en continu,
        le bridge fait 1 req/s en idle. ça évite les rate limits, réduit la conso batterie,
        et le jeu reste fluide. dès que l'ia envoie une commande, le bridge redevient réactif
        (100ms) le temps de traiter.
      </Callout>
    </div>
  );
}

/* ─── INSTALL ─── */
function InstallSection() {
  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">INSTALLATION</div>
      <H1>setup pas à pas</H1>
      <P>
        4 étapes, environ 5 minutes. lisez attentivement les notes — la plupart des problèmes
        viennent d'un prérequis manquant.
      </P>

      <H2>étape 1 — installer termux</H2>
      <P>
        termux est un terminal linux pour android. la version du play store est obsolète
        depuis 2023, il faut l'installer depuis f-droid.
      </P>
      <CodeBlock lang="bash" code={`# téléchargez termux depuis f-droid :
# https://f-droid.org/packages/com.termux/

# une fois termux ouvert, mettez à jour :
pkg update && pkg upgrade -y

# installez curl (si manquant) :
pkg install curl`} />
      <Callout type="warn" title="ne pas utiliser le play store">
        la version play store de termux ne reçoit plus de mises à jour et casse
        sur les android récents. f-droid uniquement.
      </Callout>

      <H2>étape 2 — installer pocketmcp</H2>
      <P>
        une seule commande. le script installe node.js et bun si manquants,
        clone le repo, installe les dépendances npm, et configure le PATH.
      </P>
      <CodeBlock lang="bash" code={`bash <(curl -fsSL https://pmcp.space-z.ai/api/install.sh)

# ça installe :
#   - node 18+ (si manquant)
#   - bun 1.3+ (si manquant)
#   - clone le repo dans ~/pocketmcp
#   - bun install (dépendances npm)
#   - configure le PATH dans ~/.bashrc
# durée typique : 3 à 5 minutes selon votre connexion`} />
      <Callout type="info" title="si bun install échoue">
        si le script affiche "échec bun install", lancez-le manuellement :<br/>
        <Code>cd ~/pocketmcp && bun install</Code><br/>
        ça peut arriver si le réseau est instable pendant le téléchargement des dépendances.
      </Callout>

      <H2>étape 3 — démarrer le serveur</H2>
      <CodeBlock lang="bash" code={`cd ~/pocketmcp
bun run index.min.js

# serveur live sur http://localhost:16384
# dashboard: http://localhost:16384
# mcp endpoint: http://localhost:16384/mcp
# bridge auto-servi sur /script.luau`} />
      <Callout type="info" title="garder termux ouvert">
        si vous fermez termux, le serveur s'arrête. pour le background :<br/>
        <Code>tmux new -s mcp</Code> puis <Code>bun run index.min.js</Code>, détachez avec <Code>Ctrl+B D</Code>.<br/>
        reprenez plus tard avec <Code>tmux attach -t mcp</Code>.
      </Callout>

      <H2>étape 4 — connecter roblox</H2>
      <P>
        dans votre exécuteur mobile (delta, hydrogen, krnl), lancez n'importe quel jeu roblox,
        ouvrez la console et collez :
      </P>
      <CodeBlock lang="lua" code={`-- dans votre executeur mobile :
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()

-- si websocket casse (cas sur mobile) :
getgenv().DisableWebSocket = true
loadstring(game:HttpGet("http://localhost:16384/script.luau"))()`} />
      <P>
        vous devriez voir dans les logs termux : <Code>client connecté: votrepseudo (cli_xxxx)</Code>.
        ouvrez <Code>http://localhost:16384</Code> dans chrome mobile pour voir votre client dans le dashboard.
      </P>

      <H2>étape 5 — configurer votre client ia</H2>
      <P>
        ajoutez pocketmcp à la config mcp de votre client ia. le routeur mc propage
        ensuite le serveur à tous vos clients (codex, claude, anyclaw...).
      </P>
      <CodeBlock lang="json" code={`{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}`} />
      <P>
        redémarrez votre client ia après la modification pour qu'il détecte le serveur.
        vous pouvez maintenant demander à votre ia d'exécuter du code lua dans roblox.
      </P>

      <Callout type="success" title="test rapide">
        demandez à votre ia : <Code>"liste les clients connectés à pocketmcp"</Code><br/>
        elle devrait répondre avec votre pseudo roblox et l'id du client.
      </Callout>

      <H2>installation sur pc (windows / mac / linux)</H2>
      <P>
        pocketmcp marche aussi sur pc. pas besoin de termux — téléchargez le serveur
        depuis le site, installez node.js 18+ et bun.
      </P>
      <CodeBlock lang="bash" code={`# 1. installez node.js 18+ depuis nodejs.org (si manquant)
# 2. installez bun :
curl -fsSL https://bun.sh/install | bash

# 3. téléchargez le serveur depuis le site :
mkdir ~/pocketmcp && cd ~/pocketmcp
curl -sL https://pmcp.space-z.ai/api/server-bundle -o server.tar.gz
tar xzf server.tar.gz && mv pocketmcp-server/* . && rm -rf pocketmcp-server server.tar.gz

# 4. installez les dépendances et démarrez :
bun install
bun run index.min.js`} />
      <P>
        ensuite, même chose : collez le bridge dans votre exécuteur pc (synapse, script-ware, krnl),
        et configurez votre client ia avec <Code>http://localhost:16384/mcp</Code>.
      </P>
      <Callout type="success" title="features bonus sur pc">
        sur pc, le bridge détecte automatiquement des capacités supplémentaires :<br/>
        - <strong>websocket</strong> fonctionne (bascule auto depuis http polling → réactivité maximale)<br/>
        - <strong>decompile()</strong> natif sur synapse / script-ware<br/>
        - <strong>screenshot</strong> via screenshotworkspace()
      </Callout>
    </div>
  );
}

/* ─── API ─── */
function ApiSection() {
  const endpoints = [
    { method: "GET", path: "/", desc: "dashboard html live (clients + logs + outils)" },
    { method: "GET", path: "/health", desc: "health check json : {ok, port, clients, uptime}" },
    { method: "GET", path: "/script.luau", desc: "bridge lua auto-servi (à coller dans roblox)" },
    { method: "POST", path: "/api/register", desc: "enregistrement initial du client roblox" },
    { method: "POST", path: "/api/poll", desc: "client récupère ses commandes en attente" },
    { method: "POST", path: "/api/result", desc: "client envoie le résultat d'exécution" },
    { method: "POST", path: "/api/heartbeat", desc: "heartbeat 1s (timeout client 10s)" },
    { method: "GET", path: "/api/clients", desc: "liste des clients connectés + leurs supports" },
    { method: "GET", path: "/api/logs", desc: "logs serveur récents (?limit=100)" },
    { method: "POST", path: "/api/execute", desc: "exécute du lua directement via http (sans mcp)" },
    { method: "POST", path: "/mcp", desc: "endpoint mcp json-rpc 2.0 (initialize, tools/list, tools/call)" },
  ];

  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">API REFERENCE</div>
      <H1>endpoints http + mcp</H1>
      <P>
        le serveur expose 11 endpoints. les 8 premiers sont utilisés par le bridge lua
        en interne. <Code>/api/execute</Code> et <Code>/mcp</Code> sont pour vous (curl, client ia).
      </P>

      <H2>liste des endpoints</H2>
      <div className="space-y-1.5">
        {endpoints.map((e, i) => (
          <div key={i} className="flex items-start gap-3 p-2.5 rounded-md border border-border/40 bg-card hover:border-border transition-colors">
            <span className={`shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
              e.method === "GET" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              {e.method}
            </span>
            <div className="min-w-0 flex-1">
              <code className="text-[12px] sm:text-[13px] font-mono text-foreground break-all">{e.path}</code>
              <p className="text-[11px] text-foreground/60 mt-0.5">{e.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H2>exemple : exécuter du lua via curl</H2>
      <P>pour tester sans client ia, vous pouvez appeler l'api directement :</P>
      <CodeBlock lang="bash" code={`curl -X POST http://localhost:16384/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "print(\\"hello from pocketmcp\\")\\nprint(\\"player: \\" .. game.Players.LocalPlayer.Name)"
  }'`} />
      <P>réponse :</P>
      <CodeBlock lang="json" code={`{
  "ok": true,
  "result": {
    "ok": true,
    "result": "executed",
    "logs": ["hello from pocketmcp", "player: PixelWarrior_88"]
  }
}`} />

      <H2>exemple : appel mcp tools/call</H2>
      <P>le protocole mcp utilise json-rpc 2.0. voici comment appeler <Code>execute_code</Code> :</P>
      <CodeBlock lang="bash" code={`curl -X POST http://localhost:16384/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "execute_code",
      "arguments": {
        "code": "print(\\"via mcp\\")"
      }
    }
  }'`} />
      <P>réponse json-rpc :</P>
      <CodeBlock lang="json" code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "── logs ──\\nvia mcp\\n── résultat ──\\nok: true"
    }],
    "isError": false
  }
}`} />

      <H2>workflow complet d'une session mcp</H2>
      <CodeBlock lang="bash" code={`# 1. initialize (récupère le session id)
curl -X POST http://localhost:16384/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# 2. lister les outils disponibles
curl -X POST http://localhost:16384/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 3. appeler un outil
curl -X POST http://localhost:16384/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_clients","arguments":{}}}'`} />
    </div>
  );
}

/* ─── CONFIG ─── */
function ConfigSection() {
  const configs = [
    {
      name: "BridgeURL",
      default: '"localhost:16384"',
      desc: "url du serveur pocketmcp. changez si vous lancez le serveur sur un autre port ou machine.",
      example: 'getgenv().BridgeURL = "192.168.1.42:16384"  -- partager sur lan',
    },
    {
      name: "DisableWebSocket",
      default: "false",
      desc: "force le http polling dès le départ. utile si websocket est cassé (cas sur mobile).",
      example: 'getgenv().DisableWebSocket = true',
    },
    {
      name: "EnableWebSocket",
      default: "false",
      desc: "force websocket même si l'auto-détection dit non. pour tester sur pc.",
      example: 'getgenv().EnableWebSocket = true',
    },
    {
      name: "EnableRemoteSpy",
      default: "false",
      desc: "active le hook des remoteevents dès le démarrage du bridge.",
      example: 'getgenv().EnableRemoteSpy = true',
    },
  ];

  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">CONFIGURATION</div>
      <H1>variables + clients ia</H1>
      <P>
        le bridge lua expose 4 variables <Code>getgenv()</Code> à définir avant le <Code>loadstring()</Code>.
        aucune n'est obligatoire, les valeurs par défaut marchent pour 99% des cas.
      </P>

      <H2>variables getgenv() du bridge</H2>
      <div className="space-y-3">
        {configs.map((c) => (
          <div key={c.name} className="rounded-lg border border-border/40 bg-card p-3.5">
            <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
              <code className="text-[13px] font-mono font-semibold text-foreground">{c.name}</code>
              <span className="text-[10px] text-foreground/50 font-mono">défaut: {c.default}</span>
            </div>
            <p className="text-[12px] text-foreground/70 leading-relaxed mb-2.5">{c.desc}</p>
            <CodeBlock lang="lua" code={c.example} />
          </div>
        ))}
      </div>

      <H2>configuration client ia</H2>
      <P>
        chaque client ia a son propre fichier de config. voici les emplacements courants :
      </P>
      <div className="space-y-2 mb-4">
        {[
          { client: "opencode", path: "~/.config/opencode/mcp.json" },
          { client: "codex cli", path: "~/.codex/config.json" },
          { client: "claude code", path: "via: claude mcp add pocketmcp --transport http http://localhost:16384/mcp" },
          { client: "claude desktop", path: "~/Library/Application Support/Claude/claude_desktop_config.json (mac) ou %APPDATA%/Claude/claude_desktop_config.json (win)" },
          { client: "anyclaw", path: "config intégrée dans l'app" },
        ].map((c) => (
          <div key={c.client} className="flex items-start gap-3 p-2.5 rounded-md border border-border/40 bg-card">
            <span className="text-[12px] font-mono font-semibold text-primary shrink-0 w-24">{c.client}</span>
            <code className="text-[11px] font-mono text-foreground/70 break-all">{c.path}</code>
          </div>
        ))}
      </div>
      <P>contenu à ajouter :</P>
      <CodeBlock lang="json" code={`{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://localhost:16384/mcp",
      "transport": "http"
    }
  }
}`} />

      <H2>partager sur lan (wifi)</H2>
      <P>
        par défaut le serveur écoute sur <Code>0.0.0.0</Code> (toutes les interfaces).
        pour piloter roblox sur votre tél depuis votre pc sur le même wifi :
      </P>
      <CodeBlock lang="bash" code={`# sur le tél : récupérez l'ip
ip addr show wlan0 | grep inet
# → inet 192.168.1.42/24

# sur le pc : testez la connexion
curl http://192.168.1.42:16384/health

# sur le pc : config client ia
{
  "mcpServers": {
    "pocketmcp": {
      "url": "http://192.168.1.42:16384/mcp",
      "transport": "http"
    }
  }
}`} />
      <Callout type="danger" title="sécurité">
        authentification obligatoire sur le port 16384 (code admin hashé + codes temporaires). bind localhost par défaut — utilisez --host 0.0.0.0 uniquement sur un réseau de confiance
        (wifi maison, hotspot perso). ne exposez jamais ce port sur internet sans vpn/ssh tunnel.
      </Callout>
    </div>
  );
}

/* ─── EXAMPLES ─── */
function ExamplesSection() {
  const examples = [
    {
      title: "lire le nom du joueur local",
      desc: "premier test simple pour vérifier que la connexion marche",
      code: `print("player: " .. game.Players.LocalPlayer.Name)
print("userId: " .. game.Players.LocalPlayer.UserId)
print("placeId: " .. game.PlaceId)`,
    },
    {
      title: "changer la vitesse de marche",
      desc: "modifie walkspeed du personnage local",
      code: `local char = game.Players.LocalPlayer.Character
local hum = char and char:FindFirstChildOfClass("Humanoid")
if hum then
  hum.WalkSpeed = 60
  print("walkspeed = 60")
else
  print("character not loaded")
end`,
    },
    {
      title: "lister tous les players",
      desc: "parcourt la liste des joueurs connectés au serveur",
      code: `local Players = game:GetService("Players")
for _, p in ipairs(Players:GetPlayers()) do
  print("- " .. p.Name .. " (id: " .. p.UserId .. ")")
end`,
    },
    {
      title: "téléporter le joueur",
      desc: "déplace le humanoodrootpart à une position",
      code: `local char = game.Players.LocalPlayer.Character
local hrp = char and char:FindFirstChild("HumanoidRootPart")
if hrp then
  hrp.CFrame = CFrame.new(0, 100, 0)
  print("téléporté en (0, 100, 0)")
end`,
    },
    {
      title: "espionner les remotes en live",
      desc: "via l'outil mcp spy_remotes, pas besoin de coder",
      code: `-- étape 1 : activer le spy
-- (via ia : "active le spy des remotes")
-- tool: spy_remotes { enabled: true }

-- étape 2 : jouez normalement, le bridge log les fireserver

-- étape 3 : récupérer le résumé
-- tool: list_remotes {}
-- retourne :
--   summary:
--     BuyItem: 14x
--     SendMessage: 8x
--     ReportPlayer: 2x
--   recent: [...]`,
    },
    {
      title: "décompiler un module script",
      desc: "récupère le source d'un module du jeu",
      code: `-- via l'outil mcp decompile_script
-- path: "ReplicatedStorage.Modules.Shop"

-- retourne le source lua complet du module
-- utile pour comprendre la logique serveur
-- nécessite un exécuteur avec decompile()`,
    },
    {
      title: "cliquer sur un bouton in-game",
      desc: "automatise un achat via firesignal",
      code: `-- via l'outil mcp click_gui
-- path: "StarterGui.ScreenGui.Frame.BuyButton"

-- retourne :
-- { ok: true, clicked: "BuyButton" }
-- utilise firebuttonclick() si disponible, sinon firesignal()`,
    },
    {
      title: "récupérer les infos d'un joueur",
      desc: "health, position, walkspeed, team",
      code: `-- via l'outil mcp get_player_info
-- sans argument : retourne le joueur local
-- avec playerName : retourne le joueur spécifié

-- retourne :
-- {
--   name: "PixelWarrior_88",
--   health: 100,
--   walkSpeed: 16,
--   position: { x: 12.4, y: 58.2, z: -3.1 },
--   team: "Blue",
--   characterLoaded: true
-- }`,
    },
  ];

  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">EXEMPLES</div>
      <H1>snippets lua prêts à l'emploi</H1>
      <P>
        ces exemples sont à utiliser avec l'outil <Code>execute_code</Code> (ou comme inspiration
        pour vos propres scripts). les exemples marqués "via l'outil mcp" utilisent les tools
        dédiés plutôt que execute_code.
      </P>

      <div className="space-y-3">
        {examples.map((ex, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-card p-3.5">
            <h3 className="text-[13px] font-mono font-semibold text-foreground mb-1">{ex.title}</h3>
            <p className="text-[11px] text-foreground/60 mb-2.5 leading-relaxed">{ex.desc}</p>
            <CodeBlock lang="lua" code={ex.code} />
          </div>
        ))}
      </div>

      <Callout type="info" title="astuce">
        pour les scripts longs, utilisez <Code>writefile()</Code> dans roblox pour sauvegarder
        votre code dans un fichier, puis <Code>loadfile()</Code> pour l'exécuter. ça évite de
        renvoyer tout le code à chaque test.
      </Callout>

      <H2>screenshot : pc only</H2>
      <P>
        l'outil <Code>screenshot</Code> utilise <Code>ScreenshotWorkspace()</Code> de l'exécuteur.
        cette fonctionnalité n'existe que sur les exécuteurs pc (synapse x, script-ware).
        sur mobile (delta, hydrogen, krnl mobile), elle n'est pas disponible.
      </P>
      <Callout type="info" title="comportement intelligent">
        le serveur vérifie <Code>supports.screenshot</Code> du client avant d'envoyer la commande.
        si non supporté, il répond instantanément à l'ia avec un message + alternatives,
        au lieu d'attendre un timeout de 30s.
      </Callout>
      <P>réponse typique sur mobile :</P>
      <CodeBlock lang="text" code={`screenshot non disponible sur ce client (Delta ne supporte pas ScreenshotWorkspace).

alternatives possibles :
- get_instances avec selector "game.StarterGui.*" pour inspecter le GUI
- decompile_script pour lire le code source des scripts
- execute_code avec un script qui retourne les propriétés des éléments visuels

note : screenshot fonctionne sur pc (synapse, script-ware) avec ScreenshotWorkspace().`} />

      <H3>alternative : inspecter le gui sans screenshot</H3>
      <P>
        si vous voulez "voir" l'interface roblox sans capture d'écran, utilisez :
      </P>
      <CodeBlock lang="lua" code={`-- lister tous les elements gui visibles
local sg = game:GetService("StarterGui")
for _, gui in ipairs(sg:GetChildren()) do
  print("── " .. gui.Name .. " ──")
  for _, el in ipairs(gui:GetDescendants()) do
    if el:IsA("TextLabel") or el:IsA("TextButton") or el:IsA("ImageButton") then
      print("  " .. el.ClassName .. ": " .. el.Name)
      if el.Text then print("    text: " .. el.Text) end
      if el.Visible ~= nil then print("    visible: " .. tostring(el.Visible)) end
    end
  end
end`} />
    </div>
  );
}

/* ─── TROUBLESHOOT ─── */
function TroubleshootSection() {
  const [open, setOpen] = useState<number | null>(0);
  const issues = [
    {
      q: "le serveur ne démarre pas dans termux",
      a: `vérifiez que node 18+ est installé :
  node -v
si absent : pkg install nodejs

vérifiez que le port 16384 est libre :
  lsof -i :16384
si occupé : kill -9 $(lsof -t -i :16384)

vérifiez que vous êtes dans le bon dossier :
  cd ~/pocketmcp
  ls
  → doit contenir index.ts et bridge.lua`,
    },
    {
      q: "le bridge ne se connecte pas au serveur",
      a: `1. vérifiez que le serveur répond :
  curl http://localhost:16384/health
  → doit retourner {"ok":true,...}

2. vérifiez que votre exécuteur supporte loadstring + httpget
  (delta, hydrogen, krnl mobile le supportent)

3. forcez le http polling :
  getgenv().DisableWebSocket = true
  loadstring(game:HttpGet("http://localhost:16384/script.luau"))()

4. regardez les logs termux — vous devriez voir "register" arriver
  si rien n'arrive, le problème vient de l'exécuteur (httpget bloqué ?)`,
    },
    {
      q: "l'ia ne voit pas le serveur mcp",
      a: `1. vérifiez que /mcp répond :
  curl -X POST http://localhost:16384/mcp \\
    -H "Content-Type: application/json" \\
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
  → doit retourner la liste des 10 outils

2. vérifiez votre config client ia (url + transport)

3. redémarrez votre client ia après modification de config
  (la plupart des clients ne rechargent pas la config à chaud)`,
    },
    {
      q: "websocket ne marche pas sur mobile",
      a: `c'est normal. testé sur delta mobile : l'api WebSocket est présente
mais ne se connecte pas (timeout ou erreur silencieuse).

le bridge détecte automatiquement l'échec après 3s et bascule
sur http polling 100ms. pas besoin de configurer quoi que ce soit.

sur pc (synapse, script-ware) le websocket fonctionne normalement.`,
    },
    {
      q: "execute_code timeout (30s)",
      a: `ça arrive si le client roblox est idle ou lag.
vérifiez que roblox est bien en premier plan (pas en background).

réduisez la complexité du code exécuté.
le serveur logge les timeouts dans /api/logs.

si ça persiste, augmentez le timeout côté client ia
(voir la doc de votre client pour le paramètre timeout).`,
    },
    {
      q: "decompile_script échoue",
      a: `vérifiez que votre exécuteur supporte decompile() :
  appelez list_clients → regardez supports.decompile
  si false : votre exécuteur n'a pas decompile()

essayez synapse, script-ware ou krnl (pc) qui l'ont par défaut.

si decompile existe mais échoue : le script cible est peut-être
protégé par --[[ wrapped ]] ou utilise des techniques anti-decompile.`,
    },
    {
      q: "je veux partager le serveur avec mon pc",
      a: `le serveur écoute déjà sur 0.0.0.0 par défaut.

récupérez l'ip du tél :
  ip addr show wlan0 | grep inet
  → inet 192.168.1.42/24

sur le pc, testez :
  curl http://192.168.1.42:16384/health

puis configurez votre client ia avec cette url.

⚠ auth obligatoire (code admin + whitelist). bind localhost par défaut. réseau de confiance uniquement si --host 0.0.0.0.`,
    },
    {
      q: "le serveur consomme beaucoup de batterie",
      a: `node + bun sur termux = ~2-5% batterie/heure en idle.
~8-12% quand l'ia exécute du code en boucle.

astuces :
  - tmux new -s mcp, lancez bun run index.min.js, détachez avec Ctrl+B D
  - fermez le dashboard chrome si vous ne l'utilisez pas
  - réduisez le poll interval si vous n'avez pas besoin de réactivité
    (mais c'est dans le code, pas une variable getgenv)`,
    },
    {
      q: "comment arrêter proprement le serveur",
      a: `dans termux : Ctrl+C (envoie SIGINT, le serveur se ferme proprement).

si vous êtes en tmux :
  tmux attach -t mcp
  Ctrl+C
  tmux kill-session -t mcp

les clients roblox connectés vont timeout après 10s
et disparaîtront du dashboard automatiquement.`,
    },
  ];

  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">DÉPANNAGE</div>
      <H1>problèmes courants</H1>
      <P>
        90% des problèmes viennent d'un prérequis manquant (termux play store, exécuteur sans loadstring,
        client ia mal configuré). lisez d'abord la section installation avant de chercher ici.
      </P>

      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div
            key={i}
            className={`rounded-lg border bg-card overflow-hidden transition-all ${
              open === i ? "border-primary/40" : "border-border/40"
            }`}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-2 p-3 sm:p-3.5 text-left hover:bg-secondary/30 transition-colors"
            >
              <span className="text-[12px] sm:text-[13px] font-mono text-foreground/90">{issue.q}</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 text-foreground/50 transition-transform shrink-0 ${open === i ? "rotate-180" : ""}`}
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
              <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5">
                <CodeBlock lang="text" code={issue.a} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SECURITY ─── */
function SecuritySection({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">SÉCURITÉ</div>
      <H1>risques + bonnes pratiques</H1>
      <P>
        pocketmcp permet l'exécution de code arbitraire dans roblox. c'est puissant,
        mais ça vient avec des responsabilités. lisez cette section attentivement.
      </P>

      <Callout type="danger" title="risque de ban roblox">
        tout exploit roblox comporte un risque de ban. le bridge lui-même est discret
        (juste http + json), mais les actions que vous exécutez (walkspeed, esp, etc)
        peuvent être détectées par les anti-cheats des jeux.
        <br/><br/>
        utilisez un compte secondaire. jamais votre compte principal.
      </Callout>

      <H2>bonnes pratiques</H2>
      <div className="space-y-2.5">
        {[
          { t: "compte secondaire", d: "créez un compte roblox dédié pour tester. jamais votre compte principal avec vos items." },
          { t: "auth + localhost", d: "le port 16384 a une authentification obligatoire (code admin hashé + whitelist). bind localhost par défaut. utilisez --host 0.0.0.0 uniquement sur wifi de confiance." },
          { t: "client ia de confiance", d: "le serveur exécute ce que l'ia envoie. n'utilisez que des clients ia que vous contrôlez." },
          { t: "scripts audités", d: "si vous exécutez du code trouvé sur internet, lisez-le avant. loadstring peut faire n'importe quoi." },
          { t: "déconnexion propre", d: "coupez le serveur quand vous ne l'utilisez pas. Ctrl+C dans termux." },
        ].map((p, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card">
            <span className="text-primary shrink-0 mt-0.5">✓</span>
            <div>
              <div className="text-[13px] font-mono font-semibold text-foreground">{p.t}</div>
              <div className="text-[11px] text-foreground/60 mt-0.5 font-mono leading-relaxed">{p.d}</div>
            </div>
          </div>
        ))}
      </div>

      <H2>ce que pocketmcp ne fait pas</H2>
      <Callout type="info" title="transparence">
        - pocketmcp ne contourne pas l'anti-cheat de roblox. c'est à vous de coder vos scripts en conséquence.<br/>
        - pocketmcp ne vole pas vos identifiants. le bridge ne fait que http + json avec localhost.<br/>
        - pocketmcp n'envoie aucune donnée à un serveur externe. tout est local.<br/>
        - pocketmcp ne modifie pas l'app roblox. il utilise les api de l'exécuteur, pas de patch.
      </Callout>

      <H2>si vous êtes ban</H2>
      <P>
        roblox peut ban votre compte pour exploitation. ça arrive. si c'est le cas :
      </P>
      <div className="space-y-2 mb-4">
        {[
          "vérifiez si c'est un ban temporaire (1-7 jours) ou définitif",
          "ne contestez pas en disant que vous utilisiez un mcp — ils s'en foutent",
          "créez un nouveau compte secondaire",
          "attendez que le jeu que vous exploitiez mette à jour son anti-cheat",
          "réessayez avec un script plus discret",
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2.5 text-[12px] font-mono text-foreground/70">
            <span className="text-foreground/40 shrink-0">{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <Callout type="warn" title="en résumé">
        pocketmcp est un outil puissant pour les développeurs. utilisez-le de façon responsable,
        sur un compte secondaire, sur un réseau de confiance. vous êtes seul responsable de
        ce que vous faites avec.
      </Callout>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[13px] font-mono text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          retour à l'accueil
        </button>
      </div>
    </div>
  );
}
