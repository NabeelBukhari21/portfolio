import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Vault crypto + session helpers (server only).
 *
 * Files live in /vault as AES-256-GCM ciphertext (format: 12-byte IV | 16-byte tag | data),
 * encrypted with VAULT_KEY by `npm run vault:pack`. The repo is public, so nothing readable is
 * ever committed — not the files, not their names (the manifest is encrypted too).
 * A correct password earns a short-lived, HMAC-signed, httpOnly cookie scoped to /api/vault.
 */

export type VaultDoc = { id: string; name: string; type: string; ext: string; size: number; added: string; category: string };

export const VAULT_DIR = path.join(process.cwd(), "vault");
export const COOKIE = "vault_session";
export const SESSION_SECONDS = 60 * 60; // 1 hour

function masterKey() {
  const raw = process.env.VAULT_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function vaultPassword() {
  return process.env.VAULT_PASSWORD || process.env.CONTACT_PASSWORD || "";
}

export function passwordMatches(input: string) {
  const expected = vaultPassword();
  if (!expected) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(input.trim()), h(expected));
}

export function decrypt(buf: Buffer) {
  const key = masterKey();
  if (!key) throw new Error("VAULT_KEY missing");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

export function encrypt(data: Buffer, key: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(data), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}

export async function readManifest(): Promise<VaultDoc[]> {
  if (!masterKey()) return [];
  try {
    const buf = await readFile(path.join(VAULT_DIR, "manifest.bin"));
    return JSON.parse(decrypt(buf).toString("utf8")) as VaultDoc[];
  } catch {
    return [];
  }
}

/* ---------- sessions ---------- */

function sessionKey() {
  // derived from VAULT_KEY (or the password if no key yet) so there's no extra secret to manage
  const seed = masterKey() ?? Buffer.from(vaultPassword() || randomBytes(32).toString("hex"));
  // the password is mixed in, so changing VAULT_PASSWORD instantly logs every open session out
  const salt = createHash("sha256").update(vaultPassword()).digest();
  return Buffer.from(hkdfSync("sha256", seed, salt, "vault-session-v2", 32));
}

export function makeSession() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const sig = createHmac("sha256", sessionKey()).update(String(exp)).digest("base64url");
  return { value: `${exp}.${sig}`, exp };
}

export function readSession(req: Request): number | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [expStr, sig] = decodeURIComponent(m[1]).split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return null;
  const good = createHmac("sha256", sessionKey()).update(expStr).digest();
  const given = Buffer.from(sig, "base64url");
  return given.length === good.length && timingSafeEqual(given, good) ? exp : null;
}

export function sessionCookie(value: string, maxAge: number) {
  return `${COOKIE}=${value}; Path=/api/vault; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function contactDetails() {
  return {
    phone: process.env.CONTACT_PHONE || null,
    address: process.env.CONTACT_ADDRESS || null,
    note: process.env.CONTACT_NOTE || null,
  };
}

export const noStore = { "Cache-Control": "private, no-store, max-age=0" };
