import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { isValidCode, extractCode } from "@/lib/auth-codes";
import { buildServerBundle, serverDirExists } from "@/lib/bundle";

const FILES: Record<string, { path: string; contentType: string; filename: string }> = {
  setup: {
    path: "pocketmcp-setup.sh",
    contentType: "text/x-shellscript; charset=utf-8",
    filename: "pocketmcp-setup.sh",
  },
  bridge: {
    path: "pocketmcp-bridge.luau",
    contentType: "text/plain; charset=utf-8",
    filename: "pocketmcp-bridge.luau",
  },
  guide: {
    path: "POCKETMCP-GUIDE.md",
    contentType: "text/markdown; charset=utf-8",
    filename: "POCKETMCP-GUIDE.md",
  },
};

const DOWNLOAD_DIR = join(process.cwd(), "download");

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  // type=server → bundle tar.gz (PROTÉGÉ : nécessite un code valide)
  // Anti-fuite du serveur minifié : tout comme /api/server-bundle, on exige un code.
  if (type === "server") {
    const code = extractCode(
      req.nextUrl.searchParams,
      req.headers.get("Authorization")
    );
    if (!isValidCode(code)) {
      return NextResponse.json(
        { ok: false, error: "code d'accès requis — ajoutez ?code=VOTRE_CODE ou header Authorization: Bearer VOTRE_CODE" },
        { status: 403 }
      );
    }
    try {
      if (!serverDirExists()) {
        return NextResponse.json({ error: "serveur introuvable" }, { status: 500 });
      }
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
      return NextResponse.json({ error: "erreur bundle" }, { status: 500 });
    }
  }

  if (!type || !FILES[type]) {
    return NextResponse.json(
      { error: "Type invalide. Types valides: setup, bridge, guide, server" },
      { status: 400 }
    );
  }

  const file = FILES[type];
  const filePath = join(DOWNLOAD_DIR, file.path);

  try {
    const content = readFileSync(filePath);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Fichier introuvable" },
      { status: 404 }
    );
  }
}
