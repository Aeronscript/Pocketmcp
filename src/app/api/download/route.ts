import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

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

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (!type || !FILES[type]) {
    return NextResponse.json(
      { error: "Type invalide. Types valides: setup, bridge, guide" },
      { status: 400 }
    );
  }

  const file = FILES[type];
  const filePath = join(process.cwd(), "download", file.path);

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
