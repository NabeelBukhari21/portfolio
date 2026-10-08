import { contactDetails, noStore, readManifest, readSession } from "@/lib/vault/server";

/** GET → vault index, only with a valid session (used to restore an open vault after a refresh). */
export async function GET(req: Request) {
  const exp = readSession(req);
  if (!exp) return Response.json({ error: "Locked." }, { status: 401, headers: noStore });
  return Response.json({ docs: await readManifest(), contact: contactDetails(), expires: exp }, { headers: noStore });
}
