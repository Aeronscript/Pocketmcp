// formatage des résultats d’outils MCP

function formatResult(r: any, toolName: string): string {
  if (!r) return "Pas de résultat";
  if (toolName === "execute_code") {
    let text = "";
    if (r.logs && r.logs.length > 0) {
      text += "── logs ──────────────\n";
      text += r.logs.join("\n");
      text += "\n";
    }
    text += "── résultat ──────────\n";
    text += `ok: ${r.ok}\n`;
    if (r.result) text += `result: ${r.result}\n`;
    if (r.error) text += `error: ${r.error}\n`;
    return text;
  }
  if (toolName === "decompile_script") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return `── source (${r.lines} lignes) ──\n${r.source}`;
  }
  if (toolName === "get_instances") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return `${r.count} instance(s):\n${JSON.stringify(r.instances, null, 2)}`;
  }
  if (toolName === "list_remotes") {
    if (!r.ok) return `Erreur: ${r.error}`;
    let text = `── summary (${r.totalUnique} unique, ${r.totalFires} total) ──\n`;
    text += r.summary.map((s: any) => `  ${s.name}: ${s.count}x`).join("\n");
    text += `\n\n── recent events ──\n`;
    text += r.recent.map((e: any) =>
      `  [${new Date(e.time * 1000).toLocaleTimeString()}] ${e.kind} ${e.name} (${e.argsCount} args)`
    ).join("\n");
    return text;
  }
  if (toolName === "get_player_info") {
    if (!r.ok) return `Erreur: ${r.error}`;
    return JSON.stringify(r.info, null, 2);
  }
  return JSON.stringify(r, null, 2);
}

