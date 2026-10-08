#!/usr/bin/env node
/**
 * Encrypts everything in ./vault-src (git-ignored) into ./vault (safe to commit — ciphertext only).
 *
 *   npm run vault:pack           encrypt / re-encrypt all files
 *   npm run vault:pack -- --init create VAULT_KEY in .env.local if it's missing
 *
 * Sub-folders of vault-src become categories (e.g. vault-src/documents/resume.pdf → "documents").
 * The same VAULT_KEY must be set on Vercel (Project → Settings → Environment Variables).
 */
import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const SRC = path.join(root, "vault-src");
const OUT = path.join(root, "vault");
const ENV = path.join(root, ".env.local");
const MAX = 4 * 1024 * 1024; // Vercel functions can't return much more than ~4.5 MB

function envKey() {
  if (process.env.VAULT_KEY) return process.env.VAULT_KEY;
  if (!existsSync(ENV)) return "";
  const m = readFileSync(ENV, "utf8").match(/^VAULT_KEY=(.*)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

let keyB64 = envKey();
if (process.argv.includes("--init") && !keyB64) {
  keyB64 = randomBytes(32).toString("base64");
  appendFileSync(ENV, `\n# --- Vault file encryption key (also add to Vercel). Losing it = files can't be decrypted. ---\nVAULT_KEY=${keyB64}\n`);
  console.log("✓ Created VAULT_KEY in .env.local — add the same value on Vercel.");
}
const key = Buffer.from(keyB64, "base64");
if (key.length !== 32) {
  console.error("✗ VAULT_KEY missing or invalid. Run: npm run vault:pack -- --init");
  process.exit(1);
}

const MIME = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif",
  mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", txt: "text/plain", md: "text/plain",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", heic: "image/heic", mov: "video/quicktime",
};

const enc = (buf) => {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n.startsWith(".")) continue;
    const p = path.join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

mkdirSync(SRC, { recursive: true });
mkdirSync(OUT, { recursive: true });
const files = walk(SRC);
const manifest = [];
const keep = new Set(["manifest.bin"]);
for (const f of files) {
  const rel = path.relative(SRC, f);
  const st = statSync(f);
  if (st.size > MAX) {
    console.warn(`! skipped ${rel} (${(st.size / 1048576).toFixed(1)} MB) — keep files under 4 MB (compress PDFs/images or split them).`);
    continue;
  }
  const id = createHmac("sha256", key).update(rel).digest("hex").slice(0, 24); // stable id per path
  const ext = path.extname(f).slice(1).toLowerCase();
  const parts = rel.split(path.sep);
  manifest.push({
    id,
    name: path.basename(f),
    type: MIME[ext] ?? "application/octet-stream",
    ext,
    size: st.size,
    added: st.mtime.toISOString(),
    category: parts.length > 1 ? parts[0] : "general",
  });
  writeFileSync(path.join(OUT, `${id}.bin`), enc(readFileSync(f)));
  keep.add(`${id}.bin`);
  console.log(`✓ ${rel}`);
}
manifest.sort((a, b) => b.added.localeCompare(a.added));
writeFileSync(path.join(OUT, "manifest.bin"), enc(Buffer.from(JSON.stringify(manifest))));
for (const n of readdirSync(OUT)) if (!keep.has(n)) rmSync(path.join(OUT, n)); // drop files you removed
console.log(`\n${manifest.length} file(s) encrypted into ./vault — commit ./vault, never ./vault-src.`);
