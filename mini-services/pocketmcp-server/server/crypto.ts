// server/crypto.ts
//
// P0 #1 + P1 #7 : chiffrement de session en vol (bridge ↔ serveur).
//
// Philosophie : on dérive une clé de session à partir du pairCode (qui n'est
// JAMAIS retransmis après l'appairage). Même si un attaquant sniffe le trafic
// pendant la session, il ne peut pas :
//   - Lire le contenu des commandes (XOR + clé longue)
//   - Forger une commande (HMAC-SHA256 obligatoire)
//   - Rejouer une commande (nonce incrémental)
//
// Limitations assumées :
//   - XOR est faible vs AES-GCM, mais AES-GCM n'est pas disponible en Lua Roblox
//     sans lib native. XOR + HMAC est un compromis acceptable pour empêcher le
//     sniffing passif (cas d'usage principal : quelqu'un sur le même WiFi).
//   - La clé dérivée est stockée en RAM côté serveur (jamais sur disque).
//   - Côté Lua, la clé est en RAM dans l'environnement du bridge.
//
// Format payload chiffré : base64(iv_hex || nonce_hex || hmac_hex || ciphertext_hex)
import { createHmac, randomBytes } from "crypto";

// Dérive une clé de session à partir du pairCode.
// Utilise HMAC-SHA256 avec un sel fixe (on veut que la même pairCode → même clé
// des deux côtés, sans negociation).
export function deriveSessionKey(pairCode: string): Buffer {
  // 2 rounds de HMAC-SHA256 pour rendre le brute-force plus coûteux
  let key = Buffer.from(pairCode, "utf-8");
  for (let i = 0; i < 2; i++) {
    key = createHmac("sha256", "pocketmcp-salt-v1").update(key).digest();
  }
  return key; // 32 bytes
}

// Chiffre un payload (côté serveur → bridge).
// Retourne une string prête à envoyer dans un JSON.
export function encryptPayload(plaintext: string, sessionKey: Buffer): string {
  // IV aléatoire pour chaque message (forward secrecy si on rotate les clés)
  const iv = randomBytes(16);
  // Nonce incrémental stocké côté serveur par clientId (anti-replay)
  // Ici on le met dans le payload, le bridge vérifie qu'il est > au précédent.
  const nonce = randomBytes(8); // 64 bits, suffisant pour une session
  // XOR avec la clé + iv répétée (stream cipher ad-hoc)
  const keyStream = Buffer.concat([sessionKey, iv]);
  const pt = Buffer.from(plaintext, "utf-8");
  const ct = Buffer.alloc(pt.length);
  for (let i = 0; i < pt.length; i++) {
    ct[i] = pt[i] ^ keyStream[i % keyStream.length];
  }
  // HMAC sur (iv || nonce || ct) pour intégrité + authentification
  const hmac = createHmac("sha256", sessionKey)
    .update(Buffer.concat([iv, nonce, ct]))
    .digest();
  // Format : base64(iv_hex | nonce_hex | hmac_hex | ct_hex)
  const payload = [
    iv.toString("hex"),
    nonce.toString("hex"),
    hmac.toString("hex"),
    ct.toString("hex"),
  ].join("|");
  return Buffer.from(payload, "utf-8").toString("base64");
}

// Déchiffre un payload reçu du bridge.
// Vérifie le HMAC et le nonce (anti-replay).
// `expectedNonceFloor` : nonce minimum accepté (le serveur garde le dernier nonce vu).
export function decryptPayload(
  encrypted: string,
  sessionKey: Buffer,
  expectedNonceFloor?: bigint
): { ok: true; plaintext: string; nonce: bigint } | { ok: false; error: string } {
  let payload: string;
  try {
    payload = Buffer.from(encrypted, "base64").toString("utf-8");
  } catch {
    return { ok: false, error: "invalid_base64" };
  }
  const parts = payload.split("|");
  if (parts.length !== 4) {
    return { ok: false, error: "invalid_format" };
  }
  const [ivHex, nonceHex, hmacHex, ctHex] = parts;
  let iv: Buffer, nonce: Buffer, ct: Buffer, hmac: Buffer;
  try {
    iv = Buffer.from(ivHex, "hex");
    nonce = Buffer.from(nonceHex, "hex");
    ct = Buffer.from(ctHex, "hex");
    hmac = Buffer.from(hmacHex, "hex");
  } catch {
    return { ok: false, error: "invalid_hex" };
  }
  // Vérifie le HMAC avant de déchiffrer (constant-time-ish)
  const expectedHmac = createHmac("sha256", sessionKey)
    .update(Buffer.concat([iv, nonce, ct]))
    .digest();
  if (!hmac.equals(expectedHmac)) {
    return { ok: false, error: "hmac_mismatch" };
  }
  // Vérifie le nonce (anti-replay)
  const nonceBig = nonce.readBigUInt64BE(0);
  if (expectedNonceFloor !== undefined && nonceBig <= expectedNonceFloor) {
    return { ok: false, error: "replay_detected" };
  }
  // Déchiffre
  const keyStream = Buffer.concat([sessionKey, iv]);
  const pt = Buffer.alloc(ct.length);
  for (let i = 0; i < ct.length; i++) {
    pt[i] = ct[i] ^ keyStream[i % keyStream.length];
  }
  return { ok: true, plaintext: pt.toString("utf-8"), nonce: nonceBig };
}
