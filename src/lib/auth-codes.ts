import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Chemin du fichier d'auth. Surchargeable via POCKETMCP_AUTH_FILE (utile pour
// les tests isolés afin de ne pas écraser le vrai data/auth-codes.json).
// Résolu paresseusement (lazy) pour prendre en compte l'env au moment de l'appel.
function getDataFile(): string {
  return process.env.POCKETMCP_AUTH_FILE
    ? join(process.cwd(), process.env.POCKETMCP_AUTH_FILE)
    : join(process.cwd(), "data", "auth-codes.json");
}

export interface TempCode {
  code: string;
  createdAt: number;
  claimed: boolean;
  claimedAt?: number;
  label?: string;
}

export interface AuthData {
  adminHash: string;
  tempCodes: TempCode[];
}

// Validation manuelle (pas de dépendance zod) — robuste et légère.
function isValidTempCode(v: any): v is TempCode {
  return (
    v &&
    typeof v.code === "string" &&
    typeof v.createdAt === "number" &&
    typeof v.claimed === "boolean"
  );
}

function isValidAuthData(v: any): v is AuthData {
  return (
    v &&
    typeof v.adminHash === "string" &&
    Array.isArray(v.tempCodes) &&
    v.tempCodes.every(isValidTempCode)
  );
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function loadAuth(): AuthData {
  try {
    if (existsSync(getDataFile())) {
      const parsed = JSON.parse(readFileSync(getDataFile(), "utf-8"));
      if (isValidAuthData(parsed)) return parsed;
    }
  } catch {}
  return { adminHash: "", tempCodes: [] };
}

export function saveAuth(data: AuthData): void {
  try {
    writeFileSync(getDataFile(), JSON.stringify(data, null, 2));
  } catch {}
}

export function isValidCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const data = loadAuth();
  if (hashCode(code) === data.adminHash) return true;
  const temp = data.tempCodes.find((t) => t.code === code && t.claimed);
  return !!temp;
}

export function extractCode(
  searchParams: URLSearchParams,
  authHeader: string | null
): string {
  const fromQuery = searchParams.get("code");
  if (fromQuery) return fromQuery;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return "";
}

// Génère le fichier auth-codes.json s'il est absent (cas d'un repo fraîchement cloné
// où data/auth-codes.json est gitignoré). Le code admin est affiché une seule fois
// dans la sortie de la route /login et doit être noté par l'utilisateur.
// JAMAIS loggé en clair (ancien comportement supprimé pour éviter la fuite via logs).
export function ensureAuthFile(): void {
  if (existsSync(getDataFile())) return;
  const adminCode = "Robloxmcp-" + randomBytes(8).toString("hex");
  const data: AuthData = { adminHash: hashCode(adminCode), tempCodes: [] };
  saveAuth(data);
}
