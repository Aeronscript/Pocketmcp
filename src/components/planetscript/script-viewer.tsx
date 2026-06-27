"use client";

import { useState, useEffect, useMemo } from "react";
import type { RobloxScript, Category } from "@/lib/scripts-data";
import { categoryMeta } from "@/lib/scripts-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const platformMeta = {
  mobile: {
    label: "Mobile",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
    ),
    classes: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  pc: {
    label: "PC",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    classes: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  universal: {
    label: "Universel",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

const difficultyColor: Record<string, { dot: string; text: string }> = {
  Débutant: { dot: "bg-emerald-500", text: "text-emerald-400" },
  Intermédiaire: { dot: "bg-amber-500", text: "text-amber-400" },
  Avancé: { dot: "bg-orange-500", text: "text-orange-400" },
  Expert: { dot: "bg-rose-500", text: "text-rose-400" },
};

interface Props {
  script: RobloxScript | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ScriptViewer({ script, open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "details">("code");

  // Reset states when modal closes or script changes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setCopied(false);
        setActiveTab("code");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const charCount = useMemo(
    () => (script ? script.code.length : 0),
    [script]
  );

  if (!script) return null;

  const cat = categoryMeta[script.category as Category];
  const pm = platformMeta[script.platform];
  const dc = difficultyColor[script.difficulty];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script.code);
      setCopied(true);
      toast.success("Code copié", {
        description: `${script.name} · ${script.lines} lignes · ${charCount.toLocaleString("fr-FR")} caractères`,
      });
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = script.code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("Code copié", {
          description: `${script.name} · ${script.lines} lignes`,
        });
        setTimeout(() => setCopied(false), 2400);
      } catch {
        toast.error("Échec de la copie");
      }
      document.body.removeChild(ta);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([script.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.id}.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Téléchargement", {
      description: `${script.id}.lua téléchargé`,
    });
  };

  const codeLines = script.code.split("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 gap-0 overflow-hidden border-border/60 bg-card">
        {/* ─── Header ───────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 bg-gradient-to-b from-secondary/40 to-transparent">
          <div className="flex items-start gap-4 pr-8">
            {/* Script icon */}
            <div className="relative h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
              <span className="font-mono text-[13px] font-bold text-emerald-300">
                {script.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${pm.classes}`}>
                  {pm.icon}
                  {pm.label}
                </span>
                <span className="inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {cat.short}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] ${dc.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dc.dot}`} />
                  {script.difficulty}
                </span>
              </div>

              <DialogTitle className="text-xl font-semibold tracking-tight leading-tight">
                {script.name}
              </DialogTitle>
              <p className="text-[13px] text-muted-foreground mt-1 italic">
                {script.tagline}
              </p>
            </div>

            {/* Rating block */}
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-amber-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {script.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {script.downloads.toLocaleString("fr-FR")} downloads
              </span>
            </div>
          </div>

          <DialogDescription className="text-[11px] mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              par <span className="text-foreground/80 font-medium">{script.author}</span>
            </span>
            <span className="text-border">·</span>
            <span>MAJ {script.updated}</span>
            <span className="text-border">·</span>
            <span className="font-mono">{script.lines} lignes</span>
            <span className="text-border">·</span>
            <span className="font-mono">{charCount.toLocaleString("fr-FR")} car.</span>
          </DialogDescription>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-1">
            <button
              onClick={() => setActiveTab("code")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-t-md transition-colors ${
                activeTab === "code"
                  ? "text-foreground bg-card border-t border-x border-border/50 -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Code source
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-t-md transition-colors ${
                activeTab === "details"
                  ? "text-foreground bg-card border-t border-x border-border/50 -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Détails & features
            </button>
          </div>
        </DialogHeader>

        {/* ─── Body ─────────────────────────────────── */}
        {activeTab === "code" ? (
          <div className="flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/50 bg-[#0d1117]">
              <div className="flex items-center gap-3 text-[11px] text-[#8b949e] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                  <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                </span>
                <span className="text-[#6e7681]">~/{script.id}.lua</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                  aria-label="Télécharger en .lua"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="hidden sm:inline">.lua</span>
                </button>

                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm shadow-emerald-500/20"
                  }`}
                  aria-label="Copier le code"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copié !
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copier le code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code with line numbers */}
            <div className="relative bg-[#0d1117] flex-1 min-h-0">
              <div className="max-h-[55vh] overflow-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {codeLines.map((line, idx) => (
                      <tr key={idx} className="leading-[1.65]">
                        <td className="select-none text-right align-top px-3 py-0 w-12 sticky left-0 bg-[#0d1117] border-r border-[#21262d] text-[#6e7681] text-[11px] font-mono tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-0 text-[12.5px] font-mono whitespace-pre text-[#c9d1d9]">
                          {highlightLuaLine(line) || "\u00A0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#21262d] bg-[#161b22] text-[10px] font-mono text-[#6e7681]">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400">● Lua</span>
                  <span>UTF-8</span>
                  <span>LF</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{codeLines.length} lignes</span>
                  <span>{charCount.toLocaleString("fr-FR")} caractères</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Details tab ─── */
          <div className="px-6 py-6 max-h-[60vh] overflow-auto">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Description */}
              <div className="md:col-span-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Description
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {script.description}
                </p>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Fonctionnalités
                </h4>
                <ul className="space-y-2">
                  {script.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meta */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Informations
                </h4>
                <dl className="space-y-2 text-[13px]">
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Plateforme</dt>
                    <dd className="font-medium">{pm.label}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Catégorie</dt>
                    <dd className="font-medium">{cat.label}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Difficulté</dt>
                    <dd className={`font-medium ${dc.text}`}>{script.difficulty}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Lignes</dt>
                    <dd className="font-mono tabular-nums">{script.lines}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Caractères</dt>
                    <dd className="font-mono tabular-nums">{charCount.toLocaleString("fr-FR")}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Auteur</dt>
                    <dd className="font-medium">{script.author}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5">
                    <dt className="text-muted-foreground">Dernière MAJ</dt>
                    <dd className="font-mono">{script.updated}</dd>
                  </div>
                </dl>
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {script.tags.map((t) => (
                    <span key={t} className="rounded-md bg-secondary/60 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Per-line Lua highlighter
function highlightLuaLine(line: string): React.ReactNode {
  const keywords = new Set([
    "local", "function", "end", "if", "then", "else", "elseif",
    "for", "while", "do", "return", "and", "or", "not", "nil",
    "true", "false", "in", "repeat", "until", "break", "continue",
  ]);

  const globals = new Set([
    "game", "workspace", "script", "print", "warn", "tostring",
    "tonumber", "pcall", "task", "string", "table", "math", "os",
    "Instance", "Vector2", "Vector3", "CFrame", "Color3", "UDim2",
    "UDim", "Enum", "Drawing", "TweenInfo", "require", "ipairs",
    "pairs", "type", "setmetatable", "getmetatable", "typeof",
    "next", "select", "error", "assert", "tick", "wait",
  ]);

  // Find comment start (not inside string)
  let codePart = line;
  let comment = "";
  const commentIdx = findCommentStart(line);
  if (commentIdx >= 0) {
    codePart = line.slice(0, commentIdx);
    comment = line.slice(commentIdx);
  }

  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[\[(?:[^\]]|\](?!\]))*\]\]|\b\d+\.?\d*\b|\b\w+\b|[^\s\w])/g;
  let m: RegExpExecArray | null;
  let lastIdx = 0;
  const parts: React.ReactNode[] = [];
  let key = 0;

  while ((m = regex.exec(codePart)) !== null) {
    if (m.index > lastIdx) {
      parts.push(<span key={key++}>{codePart.slice(lastIdx, m.index)}</span>);
    }
    const tok = m[0];
    if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith("[[")) {
      parts.push(<span key={key++} style={{ color: "#a5d6ff" }}>{tok}</span>);
    } else if (/^\d/.test(tok)) {
      parts.push(<span key={key++} style={{ color: "#79c0ff" }}>{tok}</span>);
    } else if (keywords.has(tok)) {
      parts.push(<span key={key++} style={{ color: "#ff7b72" }}>{tok}</span>);
    } else if (globals.has(tok)) {
      parts.push(<span key={key++} style={{ color: "#d2a8ff" }}>{tok}</span>);
    } else if (/^[A-Z]\w*$/.test(tok)) {
      parts.push(<span key={key++} style={{ color: "#ffa657" }}>{tok}</span>);
    } else if (tok === "(" || tok === ")" || tok === "{" || tok === "}" || tok === "[" || tok === "]") {
      parts.push(<span key={key++} style={{ color: "#8b949e" }}>{tok}</span>);
    } else if (tok === "=" || tok === "." || tok === ":" || tok === "," || tok === ";") {
      parts.push(<span key={key++} style={{ color: "#8b949e" }}>{tok}</span>);
    } else {
      parts.push(<span key={key++} style={{ color: "#c9d1d9" }}>{tok}</span>);
    }
    lastIdx = m.index + tok.length;
  }
  if (lastIdx < codePart.length) {
    parts.push(<span key={key++}>{codePart.slice(lastIdx)}</span>);
  }

  return (
    <>
      {parts}
      {comment && <span style={{ color: "#8b949e", fontStyle: "italic" }}>{comment}</span>}
    </>
  );
}

function findCommentStart(line: string): number {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
    } else {
      if (c === '"' || c === "'") inStr = c;
      else if (c === "-" && line[i + 1] === "-") return i;
    }
  }
  return -1;
}
