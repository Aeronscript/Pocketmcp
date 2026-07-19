// Déclarations minimals pour les modules Node utilisés par les routes API
// (fs, crypto, path, zlib). On évite la dépendance @types/node qui est
// corrompue dans le cache bun de cet environnement.
declare module "fs" {
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string, options?: { mode?: number }): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
}
declare module "path" {
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}
declare module "crypto" {
  export function createHash(algorithm: string): { update(data: string): any; digest(encoding: string): string };
  export function randomBytes(size: number): { toString(encoding: string): string };
}
declare module "zlib" {
  export function gzipSync(buffer: Buffer): Buffer;
}
declare module "url" {
  export class URL {
    constructor(url: string, base?: string);
    searchParams: URLSearchParams;
    href: string;
    pathname: string;
    origin: string;
  }
  export class URLSearchParams {
    get(name: string): string | null;
    set(name: string, value: string): void;
    has(name: string): boolean;
  }
}
declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  uptime(): number;
  exit(code?: number): void;
  on(event: string, cb: (...args: any[]) => void): void;
  signal?: { addEventListener?: (event: string, cb: () => void) => void };
  argv: string[];
};
declare const __dirname: string;
