import { createHash, randomBytes } from "crypto";

// ─── Rate limiting site web (login) ───────────────────────────
// BÊTA : 500 essais/10min = ~50/min avant blocage.
// Confortable pour les users légitimes (typos, tests de codes multiples),
// tout en cassant le brute-force. Les codes font 128 bits d'entropie
// (impossible à brute-forcer de toute façon).
//
// Backoff intelligent (progressif) :
// - 1re fois bloqué : 2 min
// - 2e fois bloqué : 5 min
// - 3e fois et + : 15 min
// L'IP doit être "sage" pendant 1h pour reset le compteur de blocages.
const LOGIN_LIMIT = 500;
const LOGIN_WINDOW = 10 * 60 * 1000; // 10 min
const LOGIN_BLOCK_LEVELS = [2 * 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000]; // 2min, 5min, 15min
const LOGIN_BLOCK_RESET = 60 * 60 * 1000; // reset level après 1h sans spam

interface Attempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
  blockLevel?: number;
  lastBlockAt?: number;
}
const attempts = new Map<string, Attempt>();

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  let record = attempts.get(ip);

  // Si bloqué, vérifie si le blocage est encore actif
  if (record?.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Si le blocage est terminé
  if (record?.lockedUntil && now >= record.lockedUntil) {
    // Si le dernier blocage remonte à plus d'1h, reset le level
    if (record.lastBlockAt && (now - record.lastBlockAt) > LOGIN_BLOCK_RESET) {
      attempts.delete(ip);
      record = undefined;
    } else {
      // Sinon on garde le record mais reset le compteur
      record.count = 0;
      record.firstAttempt = now;
      record.lockedUntil = undefined;
    }
  }

  // Nouvelle fenêtre
  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    attempts.set(ip, {
      count: 1,
      firstAttempt: now,
      blockLevel: record?.blockLevel || 0,
      lastBlockAt: record?.lastBlockAt,
    });
    return { allowed: true, remaining: LOGIN_LIMIT - 1 };
  }

  record.count++;

  if (record.count > LOGIN_LIMIT) {
    // Backoff progressif : niveau 0 (2min) → 1 (5min) → 2 (15min)
    const level = Math.min((record.blockLevel || 0), LOGIN_BLOCK_LEVELS.length - 1);
    const blockDuration = LOGIN_BLOCK_LEVELS[level];
    record.lockedUntil = now + blockDuration;
    record.lastBlockAt = now;
    record.blockLevel = Math.min(level + 1, LOGIN_BLOCK_LEVELS.length - 1);
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(blockDuration / 1000) };
  }

  return { allowed: true, remaining: LOGIN_LIMIT - record.count };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.firstAttempt > LOGIN_WINDOW * 2) {
      attempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);
