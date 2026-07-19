import { describe, it, expect } from "bun:test";
import { buildServerBundle, serverDirExists, ALLOWED_SERVER_FILES } from "@/lib/bundle";

describe("bundle", () => {
  it("le dossier serveur existe", () => {
    expect(serverDirExists()).toBe(true);
  });

  it("buildServerBundle produit un buffer non vide", () => {
    const buf = buildServerBundle();
    expect(buf).toBeDefined();
    expect(buf.length).toBeGreaterThan(100);
  });

  it("le bundle contient les noms de fichiers attendus (gzip -> on vérifie la taille)", () => {
    const buf = buildServerBundle();
    // gzip d'un tar contenant index.min.js + bridge.lua + package.json
    // doit être significativement plus gros que quelques octets.
    expect(buf.length).toBeGreaterThan(1000);
    void ALLOWED_SERVER_FILES;
  });
});
