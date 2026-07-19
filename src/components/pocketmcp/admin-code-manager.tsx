"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface TempCode { code: string; createdAt: number; claimed: boolean; claimedAt?: number; label?: string; }
interface AccessRequest { id: string; email: string; name: string; message: string; createdAt: number; status: "pending" | "approved" | "rejected"; generatedCode?: string; }

interface Props { adminCode: string; }

export function AdminCodeManager({ adminCode }: Props) {
  const [codes, setCodes] = useState<TempCode[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  const fetchCodes = useCallback(async () => {
    try { const res = await fetch("/api/site-auth/codes", { headers: { Authorization: `Bearer ${adminCode}` } }); const data = await res.json(); if (data.ok) setCodes(data.codes); } catch {}
  }, [adminCode]);

  const fetchRequests = useCallback(async () => {
    try { const res = await fetch("/api/site-auth/requests", { headers: { Authorization: `Bearer ${adminCode}` } }); const data = await res.json(); if (data.ok) setRequests(data.requests); } catch {}
  }, [adminCode]);

  useEffect(() => { fetchCodes(); fetchRequests(); const i = setInterval(() => { fetchCodes(); fetchRequests(); }, 5000); return () => clearInterval(i); }, []);

  const generate = async () => {
    setLoading(true);
    try { const res = await fetch("/api/site-auth/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminCode}` }, body: JSON.stringify({ label: label.trim() || undefined }) }); const data = await res.json(); if (data.ok) { setLastGenerated(data.code); setLabel(""); toast.success("code généré"); fetchCodes(); } else toast.error(data.error || "échec"); } catch { toast.error("erreur"); }
    setLoading(false);
  };

  const revoke = async (code: string) => { try { await fetch("/api/site-auth/revoke", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminCode}` }, body: JSON.stringify({ code }) }); toast.success("code révoqué"); fetchCodes(); } catch { toast.error("erreur"); } };

  const approveRequest = async (requestId: string) => {
    try { const res = await fetch("/api/site-auth/requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminCode}` }, body: JSON.stringify({ action: "approve", requestId }) }); const data = await res.json(); if (data.ok) { toast.success("demande approuvée"); if (data.mailtoUrl) window.open(data.mailtoUrl, "_blank"); fetchRequests(); fetchCodes(); } } catch { toast.error("erreur"); }
  };

  const rejectRequest = async (requestId: string) => {
    try { await fetch("/api/site-auth/requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminCode}` }, body: JSON.stringify({ action: "reject", requestId }) }); toast.success("demande refusée"); fetchRequests(); } catch { toast.error("erreur"); }
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("code copié"); };
  const unclaimed = codes.filter(c => !c.claimed);
  const claimed = codes.filter(c => c.claimed);

  return (
    <div>
      <div className="text-[11px] font-mono text-primary mb-2 tracking-wider">CODES D'ACCÈS · ADMIN</div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono mb-3">gestion des codes</h1>
      <p className="text-[13px] sm:text-[14px] text-foreground/70 leading-relaxed mb-6 font-mono">générez des codes d'accès à usage unique. chaque code ne peut être utilisé qu'une seule fois par une seule personne.</p>
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 mb-6">
        <h3 className="text-[13px] font-mono font-semibold text-primary mb-3">générer un nouveau code</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label optionnel (ex: 'pote1')" className="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-[12px] font-mono text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30" />
          <button onClick={generate} disabled={loading} className="shrink-0 rounded-md bg-primary px-4 py-2 text-[12px] font-mono font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{loading ? "..." : "générer"}</button>
        </div>
        {lastGenerated && (<div className="rounded-lg border border-primary/40 bg-[#0d1117] p-3 sm:p-4"><div className="text-[10px] font-mono text-foreground/50 mb-1">dernier code généré :</div><div className="flex items-center gap-2"><code className="flex-1 text-[14px] sm:text-[16px] font-mono font-semibold text-primary break-all">{lastGenerated}</code><button onClick={() => copyCode(lastGenerated)} className="shrink-0 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-[10px] font-mono hover:bg-secondary/60 transition-colors">copier</button></div></div>)}
      </div>
      <h2 className="text-[14px] font-mono font-semibold text-foreground mb-3">codes non utilisés ({unclaimed.length})</h2>
      {unclaimed.length === 0 ? (<div className="text-[12px] text-foreground/40 font-mono italic mb-6">aucun code en attente</div>) : (<div className="space-y-2 mb-6">{unclaimed.map((c) => (<div key={c.code} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3"><div className="flex-1 min-w-0"><code className="text-[12px] sm:text-[13px] font-mono text-primary break-all">{c.code}</code><div className="text-[10px] font-mono text-foreground/40 mt-0.5">créé: {new Date(c.createdAt).toLocaleString("fr-FR")}{c.label ? ` · ${c.label}` : ""}</div></div><button onClick={() => copyCode(c.code)} className="shrink-0 rounded-md border border-border bg-secondary/40 px-2 py-1 text-[10px] font-mono hover:bg-secondary/60 transition-colors">copier</button><button onClick={() => revoke(c.code)} className="shrink-0 rounded-md border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-[10px] font-mono text-rose-400 hover:bg-rose-500/10 transition-colors">révoquer</button></div>))}</div>)}
      <h2 className="text-[14px] font-mono font-semibold text-foreground mb-3">codes utilisés ({claimed.length})</h2>
      {claimed.length === 0 ? (<div className="text-[12px] text-foreground/40 font-mono italic">aucun code utilisé</div>) : (<div className="space-y-2">{claimed.map((c) => (<div key={c.code} className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/20 p-3 opacity-60"><div className="flex-1 min-w-0"><code className="text-[12px] font-mono text-foreground/60 break-all">{c.code}</code><div className="text-[10px] font-mono text-foreground/40 mt-0.5">utilisé: {c.claimedAt ? new Date(c.claimedAt).toLocaleString("fr-FR") : "?"}{c.label ? ` · ${c.label}` : ""}</div></div><span className="shrink-0 text-[10px] font-mono text-amber-400/60">● utilisé</span></div>))}</div>)}
      <h2 className="text-[14px] font-mono font-semibold text-foreground mt-8 mb-3">demandes d'accès ({requests.filter(r => r.status === "pending").length} en attente)</h2>
      {requests.length === 0 ? (<div className="text-[12px] text-foreground/40 font-mono italic">aucune demande d'accès</div>) : (<div className="space-y-2">{requests.sort((a, b) => b.createdAt - a.createdAt).map((r) => (<div key={r.id} className={`rounded-lg border p-3 ${r.status === "pending" ? "border-primary/30 bg-primary/5" : r.status === "approved" ? "border-emerald-500/20 bg-emerald-500/5 opacity-70" : "border-rose-500/20 bg-rose-500/5 opacity-50"}`}><div className="flex items-start justify-between gap-3 mb-2"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] font-mono font-semibold text-foreground">{r.name}</span><span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${r.status === "pending" ? "bg-primary/10 text-primary" : r.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{r.status === "pending" ? "● en attente" : r.status === "approved" ? "✓ approuvé" : "✗ refusé"}</span></div><div className="text-[11px] font-mono text-foreground/60 mt-1">{r.email}</div>{r.message && (<div className="text-[11px] font-mono text-foreground/50 mt-1.5 p-2 rounded bg-secondary/30">"{r.message}"</div>)}</div>{r.status === "pending" && (<div className="flex flex-col gap-1.5 shrink-0"><button onClick={() => approveRequest(r.id)} className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-mono font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">✓ approuver</button><button onClick={() => rejectRequest(r.id)} className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 transition-colors">✗ refuser</button></div>)}</div></div>))}</div>)}
    </div>
  );
}
