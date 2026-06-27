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
    classes: "bg-sky-500/10 text-sky-600 border-sky-500/20",
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
    classes: "bg-violet-500/10 text-violet-600 border-violet-500/20",
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
    classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
};

const difficultyColor: Record<string, string> = {
  Débutant: "text-emerald-600",
  Intermédiaire: "text-amber-600",
  Avancé: "text-rose-600",
};

interface Props {
  script: RobloxScript;
}

export function ScriptCard({ script }: Props) {
  const [open, setOpen] = useState(false);
  const cat = categoryMeta[script.category as Category];
  const pm = platformMeta[script.platform];

  const copyCode = () => {
    navigator.clipboard.writeText(script.code);
    toast.success("Code copié dans le presse-papier");
  };

  return (
    <>
      <article
        id={script.id}
        className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-5 hover:border-border hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`gap-1 font-medium ${pm.classes}`}
            >
              {pm.icon}
              {pm.label}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {cat.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {script.lines} lignes
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-lg font-semibold tracking-tight">
          {script.name}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {script.description}
        </p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {script.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Meta footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              <span className={difficultyColor[script.difficulty]}>
                ●
              </span>{" "}
              {script.difficulty}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {script.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {(script.downloads / 1000).toFixed(1)}k
            </span>
          </div>
          <span className="text-muted-foreground tabular-nums">
            {script.updated}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => setOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 mr-1"
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
            className="group/btn"
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
      </article>

      {/* Code dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle className="text-base font-semibold">
                {script.name}
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`gap-1 ${pm.classes}`}
                >
                  {pm.icon}
                  {pm.label}
                </Badge>
                <Badge variant="secondary">{cat.label}</Badge>
              </div>
            </div>
            <DialogDescription className="text-xs">
              par {script.author} · mis à jour le {script.updated} ·{" "}
              {script.lines} lignes · difficulté {script.difficulty.toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copyCode}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 mr-1"
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
            <pre className="max-h-[60vh] overflow-auto bg-[#0d1117] text-[#c9d1d9] p-5 pt-12 text-[12.5px] leading-relaxed font-mono">
              <code>{highlightLua(script.code)}</code>
            </pre>
          </div>

          <div className="border-t border-border/60 px-5 py-3 bg-muted/30 flex items-center justify-between text-xs">
            <div className="flex flex-wrap gap-1.5">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground tabular-nums">
              {(script.downloads / 1000).toFixed(1)}k downloads · ⭐{" "}
              {script.rating.toFixed(1)}
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

  lines.forEach((line, lineIdx) => {
    // Comment detection
    const commentMatch = line.match(/^(.*?)(--.*)$/);
    let codePart = line;
    let comment = "";

    if (commentMatch && !line.includes('"--')) {
      codePart = commentMatch[1];
      comment = commentMatch[2];
    }

    // Tokenize code part
    const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+\.?\d*\b|\b\w+\b|[^\s\w])/g;
    let m: RegExpExecArray | null;
    let lastIdx = 0;
    const parts: React.ReactNode[] = [];
    let key = 0;

    while ((m = regex.exec(codePart)) !== null) {
      if (m.index > lastIdx) {
        parts.push(<span key={key++}>{codePart.slice(lastIdx, m.index)}</span>);
      }
      const tok = m[0];
      if (tok.startsWith('"') || tok.startsWith("'")) {
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
      } else if (/^[A-Z]\w*$/.test(tok)) {
        // Global / class-like
        parts.push(
          <span key={key++} style={{ color: "#ffa657" }}>{tok}</span>
        );
      } else if (tok === "(" || tok === ")" || tok === "{" || tok === "}" || tok === "[" || tok === "]") {
        parts.push(
          <span key={key++} style={{ color: "#8b949e" }}>{tok}</span>
        );
      } else {
        parts.push(<span key={key++}>{tok}</span>);
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
