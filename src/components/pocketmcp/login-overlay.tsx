"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  onLogin: (code: string) => Promise<{ ok: boolean; error?: string }>;
}

export function LoginOverlay({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "request">("login");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reqEmail, setReqEmail] = useState("");
  const [reqName, setReqName] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [reqSent, setReqSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    const result = await onLogin(code.trim());
    if (!result.ok) { setError(result.error || "code invalide"); setLoading(false); }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmail.trim() || !reqEmail.includes("@")) { setError("email valide requis"); return; }
    Promise.resolve().then(() => { setLoading(true); setError(""); });
    try {
      const res = await fetch("/api/site-auth/request-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reqEmail.trim(), name: reqName.trim(), message: reqMessage.trim() }),
      });
      const data = await res.json();
      if (data.ok) { setReqSent(true); if (data.mailtoUrl) window.open(data.mailtoUrl, "_blank"); }
      else setError(data.error || "échec de l'envoi");
    } catch { setError("erreur de connexion"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center px-4 overflow-y-auto py-8">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="relative w-full max-w-sm my-auto">
        <div className="flex justify-center mb-6">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20">
            <Image src="/pocketmcp-logo-optimized.png" alt="pocketmcp" width={80} height={80} className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]" priority />
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-primary/5">
          {mode === "login" ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg sm:text-xl font-mono font-semibold tracking-tight">pocket<span className="text-primary">mcp</span></h1>
                <p className="text-[11px] text-foreground/50 font-mono mt-1">accès restreint · entrez votre code</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="votre code d'accès" autoFocus disabled={loading} className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3 text-[13px] font-mono text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition disabled:opacity-50" />
                {error && (<div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] font-mono text-rose-400">✗ {error}</div>)}
                <button type="submit" disabled={loading || !code.trim()} className="w-full rounded-lg bg-primary px-4 py-3 text-[13px] font-mono font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">{loading ? "connexion..." : "se connecter"}</button>
              </form>
              <div className="mt-6 pt-4 border-t border-border/40 text-center">
                <button onClick={() => { setMode("request"); setError(""); }} className="text-[11px] font-mono text-foreground/40 hover:text-primary transition-colors">pas de code ? demandez l'accès →</button>
              </div>
            </>
          ) : reqSent ? (
            <>
              <div className="text-center mb-4">
                <div className="text-3xl mb-3">✓</div>
                <h2 className="text-[15px] font-mono font-semibold text-primary mb-2">demande envoyée</h2>
                <p className="text-[12px] text-foreground/60 leading-relaxed font-mono">votre demande a été transmise à l'administrateur. un email pré-rempli a été ouvert — envoyez-le pour confirmer. vous recevrez votre code d'accès par email une fois approuvé.</p>
              </div>
              <button onClick={() => { setMode("login"); setReqSent(false); setError(""); }} className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-[12px] font-mono text-foreground/70 hover:bg-secondary/60 transition-colors">← retour à la connexion</button>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-[15px] font-mono font-semibold text-primary mb-1">demande d'accès</h2>
                <p className="text-[11px] text-foreground/50 font-mono">l'admin validera votre demande manuellement</p>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 mb-4">
                <div className="text-[10px] font-mono text-amber-300/90 leading-relaxed">⚠ utilisez votre <strong>vrai compte gmail</strong>. les fausses adresses et les demandes sans message sérieux seront rejetées.</div>
              </div>
              <form onSubmit={handleRequest} className="space-y-3">
                <div><label className="text-[10px] font-mono text-foreground/40 uppercase tracking-wider mb-1 block">votre nom *</label><input type="text" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="ex: Mohamed Ali" required minLength={2} disabled={loading} className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-[13px] font-mono text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition disabled:opacity-50" /></div>
                <div><label className="text-[10px] font-mono text-foreground/40 uppercase tracking-wider mb-1 block">votre gmail * <span className="text-amber-400/60">(vrai compte — sera vérifié)</span></label><input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} placeholder="votre.vrai.compte@gmail.com" required pattern="[a-z0-9.]+@gmail\.com" disabled={loading} className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-[13px] font-mono text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition disabled:opacity-50" /></div>
                <div><label className="text-[10px] font-mono text-foreground/40 uppercase tracking-wider mb-1 block">pourquoi voulez-vous l'accès ? * <span className="text-foreground/30">(min 20 caractères)</span></label><textarea value={reqMessage} onChange={(e) => setReqMessage(e.target.value)} placeholder="expliquez qui vous êtes, pourquoi vous voulez utiliser pocketmcp..." rows={4} required minLength={20} disabled={loading} className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-[12px] font-mono text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition disabled:opacity-50 resize-none" /><div className="text-right text-[10px] font-mono text-foreground/30 mt-0.5">{reqMessage.length} caractères</div></div>
                {error && (<div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] font-mono text-rose-400">✗ {error}</div>)}
                <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-4 py-3 text-[13px] font-mono font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">{loading ? "envoi..." : "envoyer la demande"}</button>
              </form>
              <div className="mt-4 pt-4 border-t border-border/40 text-center"><button onClick={() => { setMode("login"); setError(""); }} className="text-[11px] font-mono text-foreground/40 hover:text-foreground transition-colors">← j'ai déjà un code</button></div>
            </>
          )}
        </div>
        <div className="mt-4 text-center"><span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-foreground/30"><span className="h-1 w-1 rounded-full bg-primary" />v0.3.0 · by aeronscript</span></div>
      </div>
    </div>
  );
}
