import { createHash, randomBytes } from "crypto";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: LOGIN_LIMIT - 1 };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    attempts.delete(ip);
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: LOGIN_LIMIT - 1 };
  }

  if (now - record.firstAttempt > LOGIN_WINDOW) {
    attempts.delete(ip);
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: LOGIN_LIMIT - 1 };
  }

  record.count++;

  if (record.count > LOGIN_LIMIT) {
    record.lockedUntil = now + LOGIN_WINDOW;
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(LOGIN_WINDOW / 1000) };
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
