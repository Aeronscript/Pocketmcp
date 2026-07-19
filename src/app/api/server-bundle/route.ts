import { NextRequest, NextResponse } from "next/server";
import { isValidCode, extractCode } from "@/lib/auth-codes";
import { buildServerBundle, serverDirExists } from "@/lib/bundle";

// GET /api/server-bundle?code=xxx
// Protégé : nécessite un code valide

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = extractCode(url.searchParams, req.headers.get("Authorization"));
  if (!isValidCode(code)) {
    return NextResponse.json({ ok: false, error: "code d'accès requis" }, { status: 403 });
  }

  if (!serverDirExists()) {
    return NextResponse.json({ error: "serveur introuvable" }, { status: 500 });
  }

  try {
    const gzBuffer = buildServerBundle();
    return new NextResponse(new Blob([gzBuffer as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": 'attachment; filename="pocketmcp-server.tar.gz"',
        "Content-Length": String(gzBuffer.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "erreur" }, { status: 500 });
  }
}
