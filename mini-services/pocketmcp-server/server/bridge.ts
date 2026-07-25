// server/bridge.ts
// Gestion des clients bridge Roblox (register / poll / result / heartbeat)
// + envoi de commandes au client actif (sendCommand).
import {
  clients, pendingCommands, log, Client, consumePairCode, getPairCode, fetchGameInfo, markPairConsumedBy,
} from "./state.ts";
import { deriveSessionKey, encryptPayload, decryptPayload } from "./crypto.ts";
import { randomBytes } from "crypto";

const CMD_TIMEOUT = 300000;

/** Client le plus récent (heartbeat récent). */
export function activeClientId(): string | null {
  const now = Date.now();
  let best: string | null = null;
  let bestT = 0;
  for (const [id, c] of clients) {
    if (now - c.lastHeartbeat < 10000 && c.lastHeartbeat > bestT) {
      bestT = c.lastHeartbeat;
      best = id;
    }
  }
  return best;
}

export function listClients() {
  const now = Date.now();
  return Array.from(clients.values())
    .filter((c) => now - c.lastHeartbeat < 10000)
    .map((c) => ({
      clientId: c.clientId,
      playerName: c.playerName,
      placeId: c.placeId,
      online: true,
    }));
}

// ─── Endpoints bridge ────────────────────────────────────────────
// Map des commandes "en vol" : envoyées au bridge mais pas encore de résultat.
// Le Promise (resolve/reject) reste vivant ici jusqu'à /api/result ou timeout.
export const inflightCommands = new Map<string, PendingCommand>();

export async function handleRegister(body: any) {
  // Appairage : le bridge doit fournir le pairCode affiché dans le dashboard.
  // VULN-006 fix : si le pairCode est invalide, on NE LEAK PAS le code actif.
  // On renvoie juste l'info "expiré/invalide" + le TTL restant (sans la valeur).
  const validPairCode = consumePairCode(body.pairCode);
  if (!validPairCode) {
    const p = getPairCode();
    log("warn", "bridge", `Register refusé (pairCode invalide/expire) depuis ${body.playerName || "?"}`);
    return {
      ok: false,
      error: "pairing_required",
      message: "Code d'appairage invalide, expiré ou déjà utilisé. Récupère un nouveau pairCode dans le dashboard.",
      // VULN-006 fix : on expose juste l'info "est-ce qu'un pairCode existe"
      // et le TTL restant, mais JAMAIS la valeur du code.
      pairCodeExists: !!p,
      pairCodeExpiresIn: p ? Math.max(0, Math.floor((p.expiresAt - Date.now()) / 1000)) : 0,
    };
  }
  const gameInfo = body.placeId ? await fetchGameInfo(body.placeId) : { name: "Inconnu", thumb: "", playing: 0 };
  // P0 #1 fix : dérive la clé de session à partir du pairCode (jamais stockée sur disque).
  // Si le bridge supporte le chiffrement (body.supports.crypto = true), on l'active.
  const supportsCrypto = body.supports?.crypto === true;
  const sessionKey = supportsCrypto ? deriveSessionKey(validPairCode) : undefined;
  const client: Client = {
    clientId: body.clientId,
    playerName: body.playerName || "?",
    userId: body.userId || "",
    placeId: body.placeId || "",
    jobId: body.jobId || "",
    transport: body.transport || "HTTP Polling",
    executor: body.executor || "Unknown",
    httpMode: body.httpMode || "request",
    supports: body.supports || {},
    connectedAt: Date.now(),
    lastHeartbeat: Date.now(),
    gameName: gameInfo.name,
    gameThumb: gameInfo.thumb,
    playing: gameInfo.playing,
    sessionKey,
    lastNonce: 0n,
  };
  clients.set(client.clientId, client);
  // VULN-006 fix : audit trail — marque qui a consommé le pairCode
  markPairConsumedBy(client.clientId);
  log("success", "bridge", `Client appairé: ${client.playerName} (${client.executor}) → ${client.gameName}` + (supportsCrypto ? " [crypto ON]" : " [crypto OFF]"));
  return { ok: true, paired: true, crypto: supportsCrypto };
}

export function handlePoll(body: any) {
  const id = body.clientId;
  const c = clients.get(id);
  if (!c) return { commands: [] };
  c.lastHeartbeat = Date.now();
  // BUG FIX : on renvoie les commandes en attente PUIS on les retire du pendingCommands
  // pour ne pas les renvoyer au prochain poll.
  // Le Promise (resolve/reject) reste attaché à la commande via son ID, enregistré
  // dans une Map séparée (inflightCommands) jusqu'à ce que /api/result le resolve
  // ou que le timeout le reject.
  const cmds: any[] = [];
  const consumed: string[] = [];
  for (const [cmdId, pc] of pendingCommands) {
    if (pc.clientId === id) {
      // P0 #1 fix : si le client a une sessionKey, on chiffre la commande.
      let cmdToSend = pc.command;
      if (c.sessionKey) {
        const plaintext = JSON.stringify(pc.command);
        const encrypted = encryptPayload(plaintext, c.sessionKey);
        cmdToSend = { encrypted: "enc:" + encrypted };
      }
      cmds.push(cmdToSend);
      consumed.push(cmdId);
      // Déplace la commande vers inflight (avec son Promise toujours vivant)
      inflightCommands.set(cmdId, pc);
    }
  }
  // Retire du pending (la commande a été envoyée au bridge, on ne la renverra plus)
  for (const cmdId of consumed) {
    pendingCommands.delete(cmdId);
  }
  return { commands: cmds };
}

export function handleResult(body: any) {
  // BUG FIX : on cherche dans inflightCommands (pas pendingCommands) car
  // handlePoll déplace la commande de pending → inflight après envoi au bridge.
  const pc = inflightCommands.get(body.commandId);
  if (!pc) return { ok: false, error: "commande inconnue" };
  inflightCommands.delete(body.commandId);
  if (pc.timer) clearTimeout(pc.timer);
  // P0 #1 fix : si le client a une sessionKey, le résultat reçu est chiffré.
  // On le déchiffre avant de resolve.
  const client = clients.get(pc.clientId);
  let result = body.result;
  if (client?.sessionKey && typeof result === "string" && result.startsWith("enc:")) {
    const encrypted = result.slice(4);
    const dec = decryptPayload(encrypted, client.sessionKey, client.lastNonce);
    if (!dec.ok) {
      pc.reject(new Error(`decrypt result failed: ${dec.error}`));
      return { ok: false, error: "decrypt_failed" };
    }
    // Met à jour le dernier nonce vu (anti-replay)
    client.lastNonce = dec.nonce;
    try {
      result = JSON.parse(dec.plaintext);
    } catch {
      result = dec.plaintext;
    }
  }
  pc.resolve(result);
  return { ok: true };
}

export function handleHeartbeat(body: any) {
  const c = clients.get(body.clientId);
  if (c) {
    c.lastHeartbeat = Date.now();
    if (body.httpMode) c.httpMode = body.httpMode;
    if (body.transport) c.transport = body.transport;
  }
  return { ok: true };
}

// ─── Envoi d'une commande au client actif et attente du résultat ─
export function sendCommand(type: string, args: Record<string, any> = {}, timeoutMs = CMD_TIMEOUT): Promise<any> {
  const clientId = activeClientId();
  if (!clientId) return Promise.reject(new Error("Aucun client bridge connecté"));
  const commandId = "cmd_" + randomBytes(6).toString("hex");
  const command = { id: commandId, type, ...args };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // BUG FIX : nettoyer les deux maps au timeout (pending OU inflight)
      pendingCommands.delete(commandId);
      inflightCommands.delete(commandId);
      reject(new Error(`Timeout commande ${type} après ${timeoutMs}ms`));
    }, timeoutMs);
    pendingCommands.set(commandId, { clientId, command, createdAt: Date.now(), resolve, reject, timer });
    log("info", "bridge", `Commande envoyée -> ${type} (${commandId})`);
  });
}
