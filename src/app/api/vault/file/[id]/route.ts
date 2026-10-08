import { readFile } from "node:fs/promises";
import path from "node:path";
import { decrypt, noStore, readManifest, readSession, VAULT_DIR } from "@/lib/vault/server";

// types a browser may render inline; everything else is forced to download
const INLINE = /^(image\/(png|jpeg|webp|gif|avif)|application\/pdf|video\/(mp4|webm)|audio\/(mpeg|mp4|wav|ogg)|text\/plain)$/;

/** GET /api/vault/file/:id[?dl=1] → decrypted file, only with a valid session. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(req)) return new Response("Locked.", { status: 401, headers: noStore });
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response("Not found.", { status: 404, headers: noStore });
  const doc = (await readManifest()).find((d) => d.id === id);
  if (!doc) return new Response("Not found.", { status: 404, headers: noStore });

  let data: Buffer;
  try {
    data = decrypt(await readFile(path.join(VAULT_DIR, `${id}.bin`)));
  } catch {
    return new Response("Unavailable.", { status: 500, headers: noStore });
  }
  const inline = INLINE.test(doc.type) && new URL(req.url).searchParams.get("dl") !== "1";
  const safeName = encodeURIComponent(doc.name);
  return new Response(new Uint8Array(data), {
    headers: {
      ...noStore,
      "Content-Type": INLINE.test(doc.type) ? doc.type : "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safeName}`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
