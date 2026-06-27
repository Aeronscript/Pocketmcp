"use client";

import { useState } from "react";
import type { RobloxScript, Category } from "@/lib/scripts-data";
import { categoryMeta } from "@/lib/scripts-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const platformMeta = {
  mobile: {
    label: "Mobile",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
    ),
    classes: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  pc: {
    label: "PC",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
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
    classes: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    dot: "bg-violet-500",
  },
  universal: {
    label: "Universel",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
};

const difficultyColor: Record<
  string,
  { dot: string; text: string }
> = {
  Débutant: { dot: "bg-emerald-500", text: "text-emerald-400" },
  Intermédiaire: { dot: "bg-amber-500", text: "text-amber-400" },
  Avancé: { dot: "bg-orange-500", text: "text-orange-400" },
  Expert: { dot: "bg-rose-500", text: "text-rose-400" },
};

const accentByCategory: Record<Category, string> = {
  visual: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  remote: "from-amber-500/20 via-amber-500/5 to-transparent",
  detection: "from-rose-500/20 via-rose-500/5 to-transparent",
  utility: "from-violet-500/20 via-violet-500/5 to-transparent",
  "mobile-ui": "from-sky-500/20 via-sky-500/5 to-transparent",
};

interface Props {
  script: RobloxScript;
}

export function ScriptCard({ script }: Props) {
  const [open, setOpen] = useState(false);
  const cat = categoryMeta[script.category as Category];
  const pm = platformMeta[script.platform];
  const dc = difficultyColor[script.difficulty];

  const copyCode = () => {
    navigator.clipboard.writeText(script.code);
    toast.success("Code copié", {
      description: `${script.name} · ${script.lines} lignes`,
    });
  };

  return (
    <>
      <article
        id={script.id}
        className="group relative flex flex-col rounded-2xl border border-border/60 bg-card hover:border-border hover:bg-card/80 transition-all duration-200 overflow-hidden"
      >
        {/* Top accent line */}
        <div className={`h-px w-full bg-gradient-to-r ${accentByCategory[script.category]}`} />

        <div className="p-5 flex flex-col flex-1">
          {/* Top row: badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`gap-1 font-medium border ${pm.classes}`}
              >
                {pm.icon}
                {pm.label}
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-border/60"
              >
                {cat.short}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">
              {script.lines}L
            </span>
          </div>

          {/* Title */}
          <h3 className="mt-3.5 text-[17px] font-semibold tracking-tight leading-tight">
            {script.name}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground italic leading-relaxed">
            {script.tagline}
          </p>

          {/* Description */}
          <p className="mt-2.5 text-[13px] text-muted-foreground/90 leading-relaxed line-clamp-3">
            {script.description}
          </p>

          {/* Features list */}
          <ul className="mt-4 space-y-1.5">
            {script.features.slice(0, 3).map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-[11px] text-muted-foreground/80"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {/* Meta footer */}
          <div className="mt-5 pt-3.5 border-t border-border/40 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 ${dc.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dc.dot}`} />
                {script.difficulty}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 text-amber-400"
                  fill="currentColor"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="tabular-nums">{script.rating.toFixed(1)}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {(script.downloads / 1000).toFixed(1)}k
              </span>
            </div>
            <span className="text-muted-foreground font-mono tabular-nums">
              {script.updated.slice(5)}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 h-9"
              onClick={() => setOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 mr-1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Voir le code
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyCode}
              className="h-9 w-9 p-0"
              aria-label="Copier le code"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </Button>
          </div>
        </div>
      </article>

      {/* Code dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden border-border/60 bg-card">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 bg-secondary/20">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`gap-1 ${pm.classes}`}
                  >
                    {pm.icon}
                    {pm.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {cat.short}
                  </Badge>
                  <span className={`flex items-center gap-1 text-[11px] ${dc.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dc.dot}`} />
                    {script.difficulty}
                  </span>
                </div>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {script.name}
                </DialogTitle>
                <p className="text-[13px] text-muted-foreground mt-0.5 italic">
                  {script.tagline}
                </p>
              </div>
            </div>
            <DialogDescription className="text-[11px] mt-2 flex items-center gap-3 flex-wrap">
              <span>par <span className="text-foreground/80">{script.author}</span></span>
              <span className="text-border">·</span>
              <span>{script.lines} lignes</span>
              <span className="text-border">·</span>
              <span>mis à jour le {script.updated}</span>
              <span className="text-border">·</span>
              <span>{(script.downloads / 1000).toFixed(1)}k downloads</span>
              <span className="text-border">·</span>
              <span className="text-amber-400">★ {script.rating.toFixed(1)}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Features row */}
          <div className="px-6 py-3 border-b border-border/50 bg-secondary/10 flex flex-wrap gap-1.5">
            {script.features.map((f) => (
              <span
                key={f}
                className="rounded-md bg-secondary/60 px-2 py-1 text-[10px] text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Code viewer */}
          <div className="relative flex-1 overflow-hidden bg-[#0d1117]">
            <div className="absolute right-3 top-3 z-10">
              <Button
                size="sm"
                variant="secondary"
                onClick={copyCode}
                className="bg-secondary/80 backdrop-blur-sm"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copier
              </Button>
            </div>
            <pre className="max-h-[55vh] overflow-auto p-5 text-[12.5px] leading-[1.65] font-mono">
              <code className="text-[#c9d1d9]">{highlightLua(script.code)}</code>
            </pre>
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-6 py-3 bg-secondary/20 flex items-center justify-between text-[11px]">
            <div className="flex flex-wrap gap-1.5">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-secondary/60 px-1.5 py-0.5 font-mono text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground font-mono">
              Lua · Roblox executor
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Minimal Lua syntax highlighter
function highlightLua(code: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const lines = code.split("\n");

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

  lines.forEach((line, lineIdx) => {
    // Comment detection (basic — avoids matching -- inside strings)
    let codePart = line;
    let comment = "";
    const inString = false;
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
        parts.push(
          <span key={key++} style={{ color: "#a5d6ff" }}>{tok}</span>
        );
      } else if (/^\d/.test(tok)) {
        parts.push(
          <span key={key++} style={{ color: "#79c0ff" }}>{tok}</span>
        );
      } else if (keywords.has(tok)) {
        parts.push(
          <span key={key++} style={{ color: "#ff7b72" }}>{tok}</span>
        );
      } else if (globals.has(tok)) {
        parts.push(
          <span key={key++} style={{ color: "#d2a8ff" }}>{tok}</span>
        );
      } else if (/^[A-Z]\w*$/.test(tok)) {
        parts.push(
          <span key={key++} style={{ color: "#ffa657" }}>{tok}</span>
        );
      } else if (tok === "(" || tok === ")" || tok === "{" || tok === "}" || tok === "[" || tok === "]") {
        parts.push(
          <span key={key++} style={{ color: "#8b949e" }}>{tok}</span>
        );
      } else if (tok === "=" || tok === "." || tok === ":" || tok === "," || tok === ";") {
        parts.push(
          <span key={key++} style={{ color: "#8b949e" }}>{tok}</span>
        );
      } else {
        parts.push(<span key={key++} style={{ color: "#c9d1d9" }}>{tok}</span>);
      }
      lastIdx = m.index + tok.length;
    }
    if (lastIdx < codePart.length) {
      parts.push(<span key={key++}>{codePart.slice(lastIdx)}</span>);
    }

    tokens.push(
      <span key={`l${lineIdx}`}>
        {parts}
        {comment && (
          <span style={{ color: "#8b949e", fontStyle: "italic" }}>{comment}</span>
        )}
        {lineIdx < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });

  return tokens;
}

// Find the index where a comment starts (-- not inside a string)
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
