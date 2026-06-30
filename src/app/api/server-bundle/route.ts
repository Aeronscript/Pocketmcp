import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// GET /api/server-bundle?code=xxx
// Protégé : nécessite un code valide

const DATA_FILE = join(process.cwd(), "data", "auth-codes.json");
const SERVER_DIR = join(process.cwd(), "mini-services", "pocketmcp-server");

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isValidCode(code: string): boolean {
  if (!code) return false;
  try {
    if (!existsSync(DATA_FILE)) return false;
    const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    if (hashCode(code) === data.adminHash) return true;
    const temp = (data.tempCodes || []).find((t: any) => t.code === code && t.claimed);
    return !!temp;
  } catch { return false; }
}

const ALLOWED_FILES = ["index.min.js", "bridge.lua", "package.json"];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || req.headers.get("Authorization")?.replace("Bearer ", "") || "";
  if (!isValidCode(code)) {
    return NextResponse.json({ ok: false, error: "code d'accès requis" }, { status: 403 });
  }

  try {
    let entries;
    try { entries = readdirSync(SERVER_DIR); } catch {
      return NextResponse.json({ error: "serveur introuvable" }, { status: 500 });
    }

    const chunks: Buffer[] = [];

    function pad512(buf: Buffer): Buffer {
      const r = buf.length % 512;
      return r === 0 ? buf : Buffer.concat([buf, Buffer.alloc(512 - r)]);
    }

    function makeHeader(filename: string, size: number, mode: number): Buffer {
      const header = Buffer.alloc(512, 0);
      header.write(`pocketmcp-server/${filename}`, 0, "ascii");
      header.write(mode.toString(8).padStart(7, "0") + "\0", 100, "ascii");
      header.write("0001000\0", 108, "ascii");
      header.write("0001000\0", 116, "ascii");
      header.write(size.toString(8).padStart(11, "0") + "\0", 124, "ascii");
      header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0", 136, "ascii");
      header.write("0", 156, "ascii");
      header.write("ustar\0", 257, "ascii");
      header.write("00", 263, "ascii");
      header.write("        ", 148, "ascii");
      let checksum = 0;
      for (let i = 0; i < 512; i++) checksum += header[i];
      header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
      return header;
    }

    for (const filename of ALLOWED_FILES) {
      try {
        const content = readFileSync(join(SERVER_DIR, filename));
        chunks.push(makeHeader(filename, content.length, 0o644));
        chunks.push(pad512(content));
      } catch {}
    }

    chunks.push(Buffer.alloc(1024, 0));
    const tarBuffer = Buffer.concat(chunks);
    const { gzipSync } = await import("zlib");
    const gzBuffer = gzipSync(tarBuffer);

    return new NextResponse(gzBuffer, {
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
