import { clientIp, rateLimit } from "@/lib/rateLimit";
import { contactDetails, makeSession, noStore, passwordMatches, readManifest, SESSION_SECONDS, sessionCookie, vaultPassword } from "@/lib/vault/server";

/** POST { password } → signed session cookie + vault index. Wrong guesses are rate-limited. */
export async function POST(req: Request) {
  if (!vaultPassword()) return Response.json({ error: "Vault not configured." }, { status: 503, headers: noStore });

  const rl = rateLimit(`vault:${clientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return Response.json({ error: `Too many attempts. Locked for ${rl.retryAfter}s.` }, { status: 429, headers: noStore });

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400, headers: noStore });
  }
  if (!passwordMatches(password)) return Response.json({ error: "ACCESS DENIED" }, { status: 401, headers: noStore });

  const s = makeSession();
  return Response.json(
    { docs: await readManifest(), contact: contactDetails(), expires: s.exp },
    { headers: { ...noStore, "Set-Cookie": sessionCookie(s.value, SESSION_SECONDS) } },
  );
}
