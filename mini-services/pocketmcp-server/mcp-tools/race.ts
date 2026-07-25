// mcp-tools/race.ts
// Scan des race conditions / mass-fire (serveur qui ne déduplique pas les bursts).
import { ToolDefinition } from "./types.ts";

export const raceTool: ToolDefinition = {
  name: "scan_race",
  description: "Scanne les race conditions / mass-fire (serveur qui ne déduplique pas les bursts).",
  inputSchema: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote à tester (path CSS-like, ex: ReplicatedStorage.Remotes.Buy)" },
      burst: { type: "number", description: "Nombre de fires par burst (défaut: 50)" },
      rounds: { type: "number", description: "Nombre de rounds (défaut: 5)" },
    },
  },
  async run(ctx, args) {
    const remote = (args.remote as string) || "";
    const burst = (args.burst as number) || 50;
    const rounds = (args.rounds as number) || 5;
    if (!remote) {
      return { ok: false, error: "remote requis (ex: ReplicatedStorage.Remotes.Buy)" };
    }
    ctx.log("info", "scan", `scan_race sur ${remote} (burst=${burst}, rounds=${rounds})`);
    const res = await ctx.send("scan_race", { remote, burst, rounds }, 60000);
    ctx.log("success", "scan", `scan_race terminé`);
    return res;
  },
};
