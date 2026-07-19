import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { gzipSync } from "zlib";

export const SERVER_DIR = join(process.cwd(), "mini-services", "pocketmcp-server");
export const ALLOWED_SERVER_FILES = ["index.min.js", "bridge.lua", "package.json"];

function pad512(buf: Uint8Array): Uint8Array {
  const r = buf.length % 512;
  if (r === 0) return buf;
  const padded = new Uint8Array(buf.length + (512 - r));
  padded.set(buf);
  return padded;
}

function concatBytes(list: Uint8Array[]): Uint8Array {
  const total = list.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of list) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

function makeHeader(filename: string, size: number, mode: number): Uint8Array {
  const header = new Uint8Array(512);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length && offset + i < 512; i++) {
      header[offset + i] = str.charCodeAt(i) & 0xff;
    }
  };
  write(0, `pocketmcp-server/${filename}`);
  write(100, mode.toString(8).padStart(7, "0") + "\0");
  write(108, "0001000\0");
  write(116, "0001000\0");
  write(124, size.toString(8).padStart(11, "0") + "\0");
  write(136, Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0");
  write(156, "0");
  write(257, "ustar\0");
  write(263, "00");
  // checksum placeholder (offset 148, 8 bytes space)
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  write(148, checksum.toString(8).padStart(6, "0") + "\0 ");
  return header;
}

export function buildServerBundle(): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const filename of ALLOWED_SERVER_FILES) {
    try {
      const content = new Uint8Array(readFileSync(join(SERVER_DIR, filename)) as unknown as Uint8Array);
      chunks.push(makeHeader(filename, content.length, 0o644));
      chunks.push(pad512(content));
    } catch {}
  }
  chunks.push(new Uint8Array(1024)); // deux blocs de fin (zero)
  return gzipSync(Buffer.from(concatBytes(chunks)));
}

export function serverDirExists(): boolean {
  try {
    readdirSync(SERVER_DIR);
    return true;
  } catch {
    return false;
  }
}
