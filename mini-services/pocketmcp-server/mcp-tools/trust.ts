// mcp-tools/trust.ts
// Scan de la confiance du client (payloads bizarres acceptés sans validation serveur).
import { ToolDefinition } from "./types.ts";

export const trustTool: ToolDefinition = {
  name: "scan_trust",
  description: "Scanne la confiance du client (payloads bizarres acceptés sans validation serveur).",
  inputSchema: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote à tester (path CSS-like)" },
      payloads: { type: "array", items: { type: "string" }, description: "Payloads à envoyer (défaut: liste intégrée)" },
    },
  },
  async run(ctx, args) {
    const remote = (args.remote as string) || "";
    const payloads = (args.payloads as string[]) || [
      "../../etc/passwd", "../../../windows/system32",
      "<script>alert(1)</script>", "'; DROP TABLE users; --",
      "{{7*7}}", "${7*7}", "null", "undefined", "NaN",
      "true", "false", "0", "-1", "1e309",
      "a".repeat(10000), "\\\\n".repeat(100),
    ];
    if (!remote) {
      return { ok: false, error: "remote requis" };
    }
    ctx.log("info", "scan", `scan_trust sur ${remote} (${payloads.length} payloads)`);
    const res = await ctx.send("scan_trust", { remote, payloads }, 120000);
    ctx.log("success", "scan", `scan_trust terminé`);
    return res;
  },
};
