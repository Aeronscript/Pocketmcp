"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface Props {
  serverUrl?: string;
}

interface LogEntry {
  time: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
}

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[38;2;74;222;128m",
  amber: "\x1b[38;2;251;191;36m",
  red: "\x1b[38;2;248;113;113m",
  sky: "\x1b[38;2;56;189;248m",
  violet: "\x1b[38;2;167;139;250m",
  dim: "\x1b[38;2;139;148;158m",
  white: "\x1b[38;2;201;209;217m",
  bold: "\x1b[1m",
};

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  info: COLORS.sky,
  warn: COLORS.amber,
  error: COLORS.red,
  success: COLORS.green,
};

export function LiveTerminal({ serverUrl = "http://localhost:16384" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const seenLogsRef = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<{ clients: number; uptime: number } | null>(null);

  // Boot animation + setup terminal
  useEffect(() => {
    if (!containerRef.current) return;
    if (termRef.current) return; // déjà initialisé

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Menlo', monospace",
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      theme: {
        background: "#0a0d12",
        foreground: "#c9d1d9",
        cursor: "#4ade80",
        cursorAccent: "#0a0d12",
        selectionBackground: "#4ade8033",
        black: "#0a0d12",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#c9d1d9",
        brightBlack: "#6e7681",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowTransparency: true,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // Resize handler
    const onResize = () => {
      try {
        fit.fit();
      } catch {}
    };
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(containerRef.current);

    // Boot sequence
    const bootSequence = async () => {
      const lines = [
        { text: "pocketmcp terminal v0.3.0", color: COLORS.green, delay: 50 },
        { text: "by aeronscript (mohamed amine)", color: COLORS.dim, delay: 30 },
        { text: "", color: COLORS.reset, delay: 50 },
        { text: "→ initializing terminal...", color: COLORS.dim, delay: 80 },
        { text: "→ connecting to localhost:16384...", color: COLORS.dim, delay: 120 },
      ];
      for (const line of lines) {
        await typeLine(term, line.text + "\r\n", line.color, line.delay);
      }

      // Try to connect
      try {
        const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          await typeLine(term, `✓ connected · ${data.clients} client(s) · uptime ${Math.floor(data.uptime)}s\r\n`, COLORS.green, 40);
          setConnected(true);
          setStats({ clients: data.clients, uptime: Math.floor(data.uptime) });
        } else {
          throw new Error("not ok");
        }
      } catch {
        await typeLine(term, "✗ serveur pocketmcp injoignable sur localhost:16384\r\n", COLORS.red, 40);
        await typeLine(term, "  démarrez-le avec: cd ~/pocketmcp && bun run index.min.js\r\n", COLORS.dim, 30);
        await typeLine(term, "  (le terminal affichera les logs en direct une fois connecté)\r\n", COLORS.dim, 30);
      }

      await typeLine(term, "", COLORS.reset, 50);
      await typeLine(term, 'tapez "help" pour voir les commandes disponibles\r\n', COLORS.dim, 30);
      await typeLine(term, "", COLORS.reset, 50);
      term.write(`${COLORS.green}pocketmcp${COLORS.reset}> `);
    };

    bootSequence();

    // Input handler
    let currentLine = "";
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter
      if (data === "\r") {
        term.write("\r\n");
        handleCommand(term, currentLine.trim());
        currentLine = "";
        inputBufferRef.current = "";
        term.write(`${COLORS.green}pocketmcp${COLORS.reset}> `);
      }
      // Backspace
      else if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write("\b \b");
        }
      }
      // Arrow up (history)
      else if (data === "\x1b[A") {
        if (historyRef.current.length > 0) {
          if (historyIdxRef.current === -1) {
            historyIdxRef.current = historyRef.current.length - 1;
          } else if (historyIdxRef.current > 0) {
            historyIdxRef.current--;
          }
          const cmd = historyRef.current[historyIdxRef.current];
          // Clear current line
          while (currentLine.length > 0) {
            term.write("\b \b");
            currentLine = currentLine.slice(0, -1);
          }
          currentLine = cmd;
          term.write(cmd);
        }
      }
      // Arrow down (history)
      else if (data === "\x1b[B") {
        if (historyRef.current.length > 0 && historyIdxRef.current !== -1) {
          if (historyIdxRef.current < historyRef.current.length - 1) {
            historyIdxRef.current++;
            const cmd = historyRef.current[historyIdxRef.current];
            while (currentLine.length > 0) {
              term.write("\b \b");
              currentLine = currentLine.slice(0, -1);
            }
            currentLine = cmd;
            term.write(cmd);
          } else {
            historyIdxRef.current = -1;
            while (currentLine.length > 0) {
              term.write("\b \b");
              currentLine = currentLine.slice(0, -1);
            }
          }
        }
      }
      // Ctrl+L (clear)
      else if (data === "\x0c") {
        term.clear();
      }
      // Ctrl+C
      else if (data === "\x03") {
        term.write("^C\r\n");
        currentLine = "";
        term.write(`${COLORS.green}pocketmcp${COLORS.reset}> `);
      }
      // Regular char
      else if (code >= 32 && code < 127) {
        currentLine += data;
        term.write(data);
      }
    });

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [serverUrl]);

  // Poll logs en temps réel
  useEffect(() => {
    if (!connected || !termRef.current) return;
    const term = termRef.current;

    const pollLogs = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/logs?limit=50`);
        if (!res.ok) return;
        const data = await res.json();
        const logs: LogEntry[] = data.logs || [];

        for (const log of logs) {
          const logId = `${log.time}-${log.source}-${log.message}`;
          if (seenLogsRef.current.has(logId)) continue;
          seenLogsRef.current.add(logId);

          const color = LEVEL_COLORS[log.level] || COLORS.white;
          // Efface la ligne de prompt, écrit le log, remet le prompt
          term.write("\r");
          term.write(`${COLORS.dim}${log.time}${COLORS.reset} `);
          term.write(`${color}[${log.level.toUpperCase().padEnd(7)}]${COLORS.reset} `);
          term.write(`${COLORS.violet}${log.source}${COLORS.reset}: `);
          term.write(`${COLORS.white}${log.message}\r\n`);
          term.write(`${COLORS.green}pocketmcp${COLORS.reset}> `);
        }
      } catch {}
    };

    pollLogs();
    const interval = setInterval(pollLogs, 1500);
    return () => clearInterval(interval);
  }, [connected, serverUrl]);

  // Poll health pour stats
  useEffect(() => {
    if (!connected) return;
    const poll = async () => {
      try {
        const res = await fetch(`${serverUrl}/health`);
        if (res.ok) {
          const data = await res.json();
          setStats({ clients: data.clients, uptime: Math.floor(data.uptime) });
        }
      } catch {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [connected, serverUrl]);

  async function handleCommand(term: Terminal, cmd: string) {
    if (!cmd) return;
    historyRef.current.push(cmd);
    historyIdxRef.current = -1;

    const [cmdName, ...args] = cmd.split(/\s+/);

    if (cmdName === "help") {
      const help = [
        `${COLORS.bold}commandes disponibles${COLORS.reset}:`,
        `  ${COLORS.green}help${COLORS.reset}              affiche cette aide`,
        `  ${COLORS.green}clients${COLORS.reset}           liste les clients roblox connectés`,
        `  ${COLORS.green}health${COLORS.reset}            health check du serveur`,
        `  ${COLORS.green}logs${COLORS.reset}              récupère les 20 derniers logs`,
        `  ${COLORS.green}execute <code>${COLORS.reset}    exécute du lua dans roblox (ex: execute print("hello"))`,
        `  ${COLORS.green}clear${COLORS.reset}             efface le terminal (ctrl+l aussi)`,
        `  ${COLORS.green}exit${COLORS.reset}              ferme le terminal`,
        "",
      ];
      for (const line of help) {
        term.write(line + "\r\n");
      }
    } else if (cmdName === "clear") {
      term.clear();
    } else if (cmdName === "health") {
      term.write(`${COLORS.dim}→ checking server health...${COLORS.reset}\r\n`);
      try {
        const res = await fetch(`${serverUrl}/health`);
        const data = await res.json();
        term.write(`${COLORS.green}✓${COLORS.reset} ok: ${data.ok} · port: ${data.port} · clients: ${data.clients} · uptime: ${Math.floor(data.uptime)}s\r\n`);
      } catch {
        term.write(`${COLORS.red}✗${COLORS.reset} serveur injoignable\r\n`);
      }
    } else if (cmdName === "clients") {
      term.write(`${COLORS.dim}→ fetching clients...${COLORS.reset}\r\n`);
      try {
        const res = await fetch(`${serverUrl}/api/clients`);
        const data = await res.json();
        const online = (data.clients || []).filter((c: any) => c.online);
        if (online.length === 0) {
          term.write(`${COLORS.amber}⚠${COLORS.reset} aucun client connecté. lancez le bridge dans roblox.\r\n`);
        } else {
          term.write(`${COLORS.green}✓${COLORS.reset} ${online.length} client(s) connecté(s):\r\n`);
          for (const c of online) {
            term.write(`  ${COLORS.green}●${COLORS.reset} ${COLORS.bold}${c.playerName}${COLORS.reset} `);
            term.write(`${COLORS.dim}(${c.clientId})${COLORS.reset} · ${c.executor} · ${c.transport}\r\n`);
          }
        }
      } catch {
        term.write(`${COLORS.red}✗${COLORS.reset} erreur lors du fetch\r\n`);
      }
    } else if (cmdName === "logs") {
      term.write(`${COLORS.dim}→ fetching logs...${COLORS.reset}\r\n`);
      try {
        const res = await fetch(`${serverUrl}/api/logs?limit=20`);
        const data = await res.json();
        const logs: LogEntry[] = data.logs || [];
        if (logs.length === 0) {
          term.write(`${COLORS.dim}aucun log${COLORS.reset}\r\n`);
        } else {
          for (const log of logs.slice(-20)) {
            const color = LEVEL_COLORS[log.level] || COLORS.white;
            term.write(`${COLORS.dim}${log.time}${COLORS.reset} `);
            term.write(`${color}[${log.level.toUpperCase().padEnd(7)}]${COLORS.reset} `);
            term.write(`${COLORS.violet}${log.source}${COLORS.reset}: `);
            term.write(`${COLORS.white}${log.message}\r\n`);
          }
        }
      } catch {
        term.write(`${COLORS.red}✗${COLORS.reset} erreur lors du fetch\r\n`);
      }
    } else if (cmdName === "execute") {
      const code = args.join(" ");
      if (!code) {
        term.write(`${COLORS.amber}usage: execute <code lua>${COLORS.reset}\r\n`);
        term.write(`${COLORS.dim}exemple: execute print("hello from terminal")${COLORS.reset}\r\n`);
        return;
      }
      term.write(`${COLORS.dim}→ executing lua in roblox...${COLORS.reset}\r\n`);
      try {
        const res = await fetch(`${serverUrl}/api/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.ok && data.result?.ok) {
          term.write(`${COLORS.green}✓${COLORS.reset} exécuté en ${Date.now() % 1000}ms\r\n`);
          if (data.result.logs && data.result.logs.length > 0) {
            term.write(`${COLORS.dim}── logs ──${COLORS.reset}\r\n`);
            for (const l of data.result.logs) {
              term.write(`  ${COLORS.white}${l}${COLORS.reset}\r\n`);
            }
          }
        } else {
          term.write(`${COLORS.red}✗${COLORS.reset} échec: ${data.result?.error || data.error || "unknown"}\r\n`);
        }
      } catch (e: any) {
        term.write(`${COLORS.red}✗${COLORS.reset} erreur: ${e.message}\r\n`);
      }
    } else if (cmdName === "exit") {
      term.write(`${COLORS.dim}au revoir 👋${COLORS.reset}\r\n`);
    } else {
      term.write(`${COLORS.red}commande inconnue: ${cmdName}${COLORS.reset}\r\n`);
      term.write(`${COLORS.dim}tapez "help" pour voir les commandes${COLORS.reset}\r\n`);
    }
  }

  return (
    <div className="relative rounded-xl border border-border/60 bg-[#0a0d12] overflow-hidden shadow-2xl shadow-primary/5">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-secondary/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
          </div>
          <span className="ml-2 text-[11px] text-foreground/60 font-mono truncate">
            pocketmcp@localhost — bash
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-green" />
                live
              </span>
              {stats && (
                <span className="text-[10px] font-mono text-foreground/50 hidden sm:inline">
                  {stats.clients}c · {stats.uptime}s
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-foreground/40">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              offline
            </span>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={containerRef}
        className="h-[320px] sm:h-[420px] p-2 scanlines"
        style={{ background: "#0a0d12" }}
      />

      {/* Bottom hint bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-secondary/30 text-[10px] font-mono text-foreground/40">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-secondary/60 border border-border/40">tab</kbd> complete</span>
          <span><kbd className="px-1 py-0.5 rounded bg-secondary/60 border border-border/40">↑↓</kbd> history</span>
          <span className="hidden sm:inline"><kbd className="px-1 py-0.5 rounded bg-secondary/60 border border-border/40">ctrl+l</kbd> clear</span>
        </div>
        <span className="hidden sm:inline">{connected ? "tapez help" : "en attente du serveur"}</span>
      </div>
    </div>
  );
}

// Helper: type text char by char
async function typeLine(term: Terminal, text: string, color: string, delay: number) {
  term.write(color);
  for (const char of text) {
    term.write(char);
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay / text.length));
    }
  }
  term.write(COLORS.reset);
}
