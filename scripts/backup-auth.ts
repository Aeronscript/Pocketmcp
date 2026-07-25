// scripts/backup-auth.ts
//
// Backup automatique de data/auth-codes.json avec timestamp.
// À lancer périodiquement (cron, GitHub Actions, ou manuellement).
//
// Usage :
//   bun scripts/backup-auth.ts                  # backup simple
//   bun scripts/backup-auth.ts --keep 10        # garde les 10 derniers backups
//
// Les backups sont stockés dans backups/auth-codes-<timestamp>.json
// Le fichier original data/auth-codes.json n'est jamais modifié.
//
// Sécurité : les backups contiennent le HASH SHA-256 (pas le code en clair).
// Ils peuvent être commités sur GitHub sans risque.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUTH_FILE = join(ROOT, "data", "auth-codes.json");
const BACKUP_DIR = join(ROOT, "backups");

// Parse args
const args = process.argv.slice(2);
const keepArgIdx = args.indexOf("--keep");
const KEEP_COUNT = keepArgIdx >= 0 ? parseInt(args[keepArgIdx + 1] || "10", 10) : 10;

function log(msg: string) {
  const time = new Date().toISOString();
  console.log(`[${time}] ${msg}`);
}

function main() {
  if (!existsSync(AUTH_FILE)) {
    log("❌ data/auth-codes.json introuvable");
    process.exit(1);
  }

  // Crée le dossier backups/
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Lit le fichier actuel
  const content = readFileSync(AUTH_FILE, "utf-8");

  // Valide que c'est du JSON correct
  try {
    JSON.parse(content);
  } catch (e: any) {
    log(`❌ data/auth-codes.json n'est pas du JSON valide: ${e.message}`);
    process.exit(1);
  }

  // Crée le backup avec timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = join(BACKUP_DIR, `auth-codes-${timestamp}.json`);
  writeFileSync(backupFile, content, { mode: 0o644 });
  log(`✅ Backup créé: ${backupFile} (${content.length} bytes)`);

  // Nettoyage : garde seulement KEEP_COUNT backups les plus récents
  if (KEEP_COUNT > 0) {
    const backups = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("auth-codes-") && f.endsWith(".json"))
      .map(f => ({ name: f, path: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (backups.length > KEEP_COUNT) {
      log(`🧹 Nettoyage : ${backups.length - KEEP_COUNT} backup(s) à supprimer (garde ${KEEP_COUNT})`);
      for (let i = KEEP_COUNT; i < backups.length; i++) {
        unlinkSync(backups[i].path);
        log(`   supprimé: ${backups[i].name}`);
      }
    }
  }

  // Affiche le résumé
  const remaining = readdirSync(BACKUP_DIR).filter(f => f.startsWith("auth-codes-")).length;
  log(`📊 Total backups restants: ${remaining}`);
}

main();
