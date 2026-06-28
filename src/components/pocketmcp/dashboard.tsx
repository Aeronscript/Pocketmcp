"use client";

import { useState, useEffect, useRef } from "react";
import { connectedClients, liveLogs, remoteEvents, instanceTree, type LogEntry } from "@/lib/data";

type Tab = "clients" | "console" | "execute" | "spy" | "tree";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "clients", label: "clients", icon: "▣" },
  { id: "console", label: "console", icon: "≡" },
  { id: "execute", label: "execute", icon: "▶" },
  { id: "spy", label: "remote spy", icon: "◈" },
  { id: "tree", label: "instances", icon: "▤" },
];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("clients");
  const [logs, setLogs] = useState<LogEntry[]>(liveLogs);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Simulate live log streaming
  useEffect(() => {
    const samples: Omit<LogEntry, "time">[] = [
      { level: "info", source: "mcp", message: "tool get_instances() → 247 results" },
      { level: "lua", source: "spy", message: "InvokeServer: GetInventory() returned 12 items" },
      { level: "success", source: "bridge", message: "heartbeat from cli_01 (42ms)" },
      { level: "warn", source: "bridge", message: "cli_02 polling slower than 200ms threshold" },
      { level: "lua", source: "exec", message: "game.Players.LocalPlayer.Character.Humanoid.WalkSpeed = 60" },
      { level: "info", source: "stdout", message: "WalkSpeed set to 60" },
    ];
    const interval = setInterval(() => {
      const sample = samples[Math.floor(Math.random() * samples.length)];
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setLogs((prev) => [...prev.slice(-50), { ...sample, time }]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, tab]);

  return (
    <section id="dashboard" className="py-12 sm:py-24 scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <span className="h-px w-8 bg-primary/40" />
            DASHBOARD · LIVE DEMO
          </div>
          <h2 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
            <span className="text-muted-foreground">$</span> pocketmcp status
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-mono">
            {"// preview statique du dashboard live sur localhost:16384"}
          </p>
        </div>

        {/* Terminal frame */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-primary/5">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary/70" />
              </div>
              <span className="ml-1 sm:ml-3 text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate">
                pocketmcp — localhost:16384
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-mono shrink-0">
              <span className="flex items-center gap-1 text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-green" />
                2 clients
              </span>
              <span className="text-muted-foreground hidden sm:inline">uptime 4m</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-2 border-b border-border/40 bg-background/50 overflow-x-auto scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-mono transition-colors border-b-2 ${
                  tab === t.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                <span className="text-[9px] sm:text-[10px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[360px] sm:min-h-[420px] max-h-[520px] overflow-auto p-3 sm:p-5">
            {tab === "clients" && <ClientsTab />}
            {tab === "console" && <ConsoleTab logs={logs} ref={consoleRef} />}
            {tab === "execute" && <ExecuteTab />}
            {tab === "spy" && <SpyTab />}
            {tab === "tree" && <TreeTab />}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── CLIENTS ───────────────── */
function ClientsTab() {
  return (
    <div className="space-y-3">
      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-mono mb-2">
        {"// "}{connectedClients.length} client(s) connecté(s)
      </div>
      {connectedClients.map((c) => (
        <div key={c.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 sm:p-4 hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`h-2 w-2 rounded-full shrink-0 ${c.status === "online" ? "bg-primary pulse-green" : "bg-muted-foreground"}`} />
                <span className="text-[13px] sm:text-sm font-mono font-semibold text-foreground truncate">{c.name}</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {c.executor}
                </span>
              </div>
              <div className="text-[11px] sm:text-[12px] text-muted-foreground font-mono truncate">
                <span className="text-foreground/80">{c.game}</span>
                <span className="mx-1 text-border">·</span>
                placeId: <span className="text-foreground/80">{c.placeId}</span>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono shrink-0">
              {c.connectedAt}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
            <div className="rounded-md bg-background/50 py-1.5 sm:py-2">
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono uppercase">ping</div>
              <div className="text-[12px] sm:text-sm font-mono tabular-nums text-foreground">{c.ping}<span className="text-muted-foreground text-[10px]">ms</span></div>
            </div>
            <div className="rounded-md bg-background/50 py-1.5 sm:py-2">
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono uppercase">fps</div>
              <div className={`text-[12px] sm:text-sm font-mono tabular-nums ${c.fps >= 50 ? "text-primary" : "text-amber-400"}`}>{c.fps}</div>
            </div>
            <div className="rounded-md bg-background/50 py-1.5 sm:py-2">
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono uppercase">transport</div>
              <div className="text-[9px] sm:text-[10px] font-mono text-foreground/80 leading-tight">{c.transport}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────── CONSOLE ───────────────── */
const ConsoleTab = ({ logs, ref: consoleRef }: { logs: LogEntry[]; ref: React.Ref<HTMLDivElement> }) => {
  const colors: Record<LogEntry["level"], string> = {
    info: "text-sky-400",
    warn: "text-amber-400",
    error: "text-rose-400",
    success: "text-primary",
    lua: "text-violet-400",
  };
  return (
    <div ref={consoleRef} className="font-mono text-[10px] sm:text-[12px] space-y-0.5 h-full overflow-auto">
      {logs.map((log, i) => (
        <div key={i} className="flex items-start gap-1.5 sm:gap-2 leading-relaxed hover:bg-secondary/20 px-1 -mx-1 rounded">
          <span className="text-muted-foreground/60 tabular-nums shrink-0 text-[9px] sm:text-[10px]">{log.time}</span>
          <span className={`${colors[log.level]} shrink-0 uppercase text-[9px] sm:text-[10px] mt-0.5`}>
            [{log.level}]
          </span>
          <span className="text-muted-foreground shrink-0 text-[9px] sm:text-[11px] hidden sm:inline">
            {log.source}:
          </span>
          <span className="text-foreground/90 break-all">{log.message}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 text-primary">
        <span className="text-muted-foreground">$</span>
        <span className="cursor-blink"></span>
      </div>
    </div>
  );
};

/* ───────────────── EXECUTE ───────────────── */
function ExecuteTab() {
  const [code, setCode] = useState(`-- execute lua dans roblox
-- variables exposes: game, workspace, Players

local Players = game:GetService("Players")
local lp = Players.LocalPlayer

print("hello from pocketmcp")
print("player: " .. lp.Name)

-- change walkspeed
local char = lp.Character
if char then
  local hum = char:FindFirstChildOfClass("Humanoid")
  if hum then
    hum.WalkSpeed = 60
    print("walkspeed = 60")
  end
end`);

  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setOutput([]);
    setTimeout(() => {
      setOutput([
        "> executing on cli_01 (PixelWarrior_88 · Brookhaven RP)",
        "hello from pocketmcp",
        "player: PixelWarrior_88",
        "walkspeed = 60",
        "> execution completed in 3.2ms",
      ]);
      setRunning(false);
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">{"// input.lua"}</span>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[10px] sm:text-[11px] font-mono text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {running ? "running..." : "▶ run"}
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 min-h-[200px] sm:min-h-[300px] rounded-lg border border-border/40 bg-background/60 p-2.5 sm:p-3 text-[11px] sm:text-[12px] font-mono text-foreground/90 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono mb-2">{"// stdout"}</span>
        <div className="flex-1 min-h-[200px] sm:min-h-[300px] rounded-lg border border-border/40 bg-background/60 p-2.5 sm:p-3 font-mono text-[11px] sm:text-[12px] overflow-auto">
          {output.length === 0 ? (
            <span className="text-muted-foreground/60">{"// en attente d'exécution"}</span>
          ) : (
            output.map((line, i) => (
              <div key={i} className={`leading-relaxed ${line.startsWith(">") ? "text-primary" : line.startsWith("hello") || line.startsWith("player") || line.startsWith("walkspeed") ? "text-foreground/90" : "text-muted-foreground"}`}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── REMOTE SPY ───────────────── */
function SpyTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">{"// "}{remoteEvents.length} remotes interceptés</span>
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono">
          <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">● recording</span>
          <span className="px-2 py-1 rounded bg-secondary/60 text-muted-foreground">clear</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {remoteEvents.map((r, i) => (
          <div key={i} className="rounded-md border border-border/40 bg-secondary/20 p-2.5 sm:p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  r.kind === "RemoteEvent" ? "bg-sky-500/10 text-sky-400" : "bg-violet-500/10 text-violet-400"
                }`}>
                  {r.kind === "RemoteEvent" ? "EVT" : "FN"}
                </span>
                <span className="text-[12px] sm:text-[13px] font-mono font-semibold text-foreground truncate">{r.name}</span>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                ×{r.fires}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">{r.path}</div>
            <div className="text-[10px] sm:text-[11px] font-mono text-amber-400/80 mt-1 truncate">
              args: <span className="text-foreground/80">{r.lastArgs}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── INSTANCE TREE ───────────────── */
function TreeTab() {
  const renderNode = (node: typeof instanceTree, depth = 0): React.ReactNode => (
    <div key={node.name + depth}>
      <div
        className="flex items-center gap-2 py-1 px-1 hover:bg-secondary/30 rounded font-mono text-[11px] sm:text-[12px] cursor-pointer"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <span className="text-muted-foreground/50">
          {node.children ? "▸" : "·"}
        </span>
        <span className="text-foreground/90">{node.name}</span>
        <span className="text-[10px] text-muted-foreground/60">: {node.class}</span>
      </div>
      {node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );
  return (
    <div>
      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-mono mb-3 break-all">
        {"// selecteur css-like: "}<span className="text-primary">game.ReplicatedStorage.Remotes.*</span>
      </div>
      <div className="rounded-lg border border-border/40 bg-background/40 p-2 overflow-auto">
        {renderNode(instanceTree)}
      </div>
    </div>
  );
}
