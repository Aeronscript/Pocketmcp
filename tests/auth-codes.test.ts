import { describe, it, expect, beforeEach } from "bun:test";
import { rmSync } from "fs";
import {
  hashCode,
  isValidCode,
  extractCode,
  loadAuth,
  saveAuth,
  ensureAuthFile,
} from "@/lib/auth-codes";

// Les tests utilisent un fichier isolé dans /tmp pour ne pas écraser le vrai
// data/auth-codes.json (gitignoré). DATA_FILE est résolu paresseusement, donc
// set l'env avant les appels suffit.
process.env.POCKETMCP_AUTH_FILE = "data/auth-codes.test.json";

describe("auth-codes", () => {
  beforeEach(() => {
    try { rmSync("data/auth-codes.test.json", { force: true }); } catch {}
  });

  it("hashCode est déterministe et SHA-256", () => {
    const a = hashCode("Robloxmcp-test");
    const b = hashCode("Robloxmcp-test");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashCode diffère pour des codes différents", () => {
    expect(hashCode("a")).not.toBe(hashCode("b"));
  });

  it("isValidCode rejette un code vide/null/undefined", () => {
    expect(isValidCode("")).toBe(false);
    expect(isValidCode(null)).toBe(false);
    expect(isValidCode(undefined)).toBe(false);
  });

  it("extractCode lit le query param en priorité", () => {
    const url = new URL("http://x/?code=abc");
    expect(extractCode(url.searchParams, null)).toBe("abc");
  });

  it("extractCode lit le header Authorization Bearer", () => {
    const url = new URL("http://x/");
    expect(extractCode(url.searchParams, "Bearer tok123")).toBe("tok123");
  });

  it("extractCode préfère le query au header", () => {
    const url = new URL("http://x/?code=q");
    expect(extractCode(url.searchParams, "Bearer h")).toBe("q");
  });

  it("isValidCode valide le hash admin", () => {
    const code = "Robloxmcp-admin-xyz";
    const data = { adminHash: hashCode(code), tempCodes: [] };
    saveAuth(data);
    expect(isValidCode(code)).toBe(true);
  });

  it("isValidCode valide un temp code claimé, rejette un non-claimé", () => {
    const code = "pmcp_abc123";
    const data = {
      adminHash: "",
      tempCodes: [
        { code, createdAt: Date.now(), claimed: true },
        { code: "pmcp_other", createdAt: Date.now(), claimed: false },
      ],
    };
    saveAuth(data);
    expect(isValidCode(code)).toBe(true);
    expect(isValidCode("pmcp_other")).toBe(false);
  });

  it("loadAuth retourne un schéma vide si fichier absent", () => {
    const data = loadAuth();
    expect(data).toHaveProperty("adminHash");
    expect(Array.isArray(data.tempCodes)).toBe(true);
  });

  it("ensureAuthFile crée un fichier valide avec un adminHash", () => {
    ensureAuthFile();
    const data = loadAuth();
    expect(data.adminHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
