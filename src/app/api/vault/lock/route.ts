import { noStore, sessionCookie } from "@/lib/vault/server";

export async function POST() {
  return Response.json({ ok: true }, { headers: { ...noStore, "Set-Cookie": sessionCookie("", 0) } });
}
