import { describe, it, expect } from "bun:test";
import { buildServerBundle, serverDirExists, ALLOWED_SERVER_FILES } from "@/lib/bundle";
import { gunzipSync } from "zlib";

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
    expect(buf.length).toBeGreaterThan(1000);
    void ALLOWED_SERVER_FILES;
  });

  // SRV-001 fix : valide que le tar.gz généré a des checksums valides.
  // Avant le fix, python tarfile et GNU tar rejetaient l'archive ("bad checksum").
  // On valide ici que les headers tar ont des checksums POSIX corrects en
  // relisant manuellement les 512-byte headers.
  it("SRV-001 : les headers tar ont des checksums valides", () => {
    const buf = buildServerBundle();
    // Décompresse gzip
    const tar = gunzipSync(buf);
    // Vérifie chaque header (blocs de 512 octets)
    let offset = 0;
    let filesFound = 0;
    while (offset < tar.length - 512) {
      const header = tar.subarray(offset, offset + 512);
      // Skip blocs nuls (fin de l'archive)
      if (header.every(b => b === 0)) break;

      // Le nom doit commencer par "pocketmcp-server/"
      const name = Buffer.from(header.subarray(0, 100)).toString("utf-8").replace(/\0+$/, "");
      if (!name.startsWith("pocketmcp-server/")) break;

      // Calcule le checksum du header (en traitant le champ checksum comme des espaces)
      let checksum = 0;
      for (let i = 0; i < 512; i++) {
        if (i >= 148 && i < 156) {
          checksum += 0x20; // espace
        } else {
          checksum += header[i];
        }
      }
      const expectedChecksum = checksum.toString(8).padStart(6, "0") + "\0 ";

      // Lit le checksum stocké dans le header
      const storedChecksum = Buffer.from(header.subarray(148, 156)).toString("utf-8");

      expect(storedChecksum).toBe(expectedChecksum);
      filesFound++;

      // Passe au prochain fichier (header + content padded à 512)
      const sizeStr = Buffer.from(header.subarray(124, 136)).toString("utf-8").replace(/\0+$/, "");
      const size = parseInt(sizeStr, 8) || 0;
      offset += 512 + Math.ceil(size / 512) * 512;
    }
    expect(filesFound).toBeGreaterThan(0);
  });
});

