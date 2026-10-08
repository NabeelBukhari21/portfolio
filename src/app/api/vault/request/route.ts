import { randomBytes } from "node:crypto";
import { site } from "@/content/profile";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * "Request a key" — a visitor without the vault key leaves their name, email and reason;
 * Nabeel gets notified and can reply with the key. Nothing is stored on the server.
 *
 * Notification channels (set any of them in Vercel → Environment Variables):
 *   RESEND_API_KEY (+ optional NOTIFY_EMAIL, defaults to the email in profile.ts) — email via resend.com
 *   NTFY_TOPIC                                   — instant phone push via the free ntfy app (ntfy.sh)
 *   DISCORD_WEBHOOK_URL                          — a message in a Discord channel
 */

const REASONS = ["Hiring / recruiting", "Collaboration", "Friend / family", "Other"];
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  const resend = process.env.RESEND_API_KEY;
  const ntfy = process.env.NTFY_TOPIC;
  const discord = process.env.DISCORD_WEBHOOK_URL;
  if (!resend && !ntfy && !discord) {
    return Response.json({ error: `Requests aren't switched on yet — email ${site.email} instead.` }, { status: 503 });
  }

  const rl = rateLimit(`vault-req:${clientIp(req)}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return Response.json({ error: `Too many requests — try again in ${Math.ceil(rl.retryAfter / 60)} min.` }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  // bots fill the invisible field
  if (clean(body.website, 100)) return Response.json({ ok: true, ticket: randomBytes(3).toString("hex").toUpperCase() });

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const org = clean(body.org, 100);
  const reason = REASONS.includes(clean(body.reason, 40)) ? clean(body.reason, 40) : "Other";
  const message = clean(typeof body.message === "string" ? body.message.replace(/\r?\n/g, " ") : "", 600);
  if (name.length < 2) return Response.json({ error: "Tell me your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
  if (message.length < 5) return Response.json({ error: "Add a line about why you need access." }, { status: 400 });

  const ticket = randomBytes(3).toString("hex").toUpperCase();
  const subject = `Vault key request #${ticket} — ${name}${org ? ` (${org})` : ""}`;
  const text = `${name} <${email}>${org ? `\n${org}` : ""}\nReason: ${reason}\n\n${message}\n\nReply to this email with the vault key if you want to let them in.`;

  const jobs: Promise<Response>[] = [];
  if (resend)
    jobs.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM || "Nabeel.OS Vault <onboarding@resend.dev>",
          to: [process.env.NOTIFY_EMAIL || site.email],
          reply_to: email,
          subject,
          text,
          html: `<div style="font-family:ui-monospace,monospace;background:#06050c;color:#e9e7f5;padding:24px">
<div style="color:#00f0ff;letter-spacing:.2em;font-size:12px">NABEEL.OS // VAULT KEY REQUEST #${ticket}</div>
<h2 style="margin:12px 0 4px">${esc(name)}</h2>
<div><a style="color:#ff2bd6" href="mailto:${esc(email)}">${esc(email)}</a>${org ? ` · ${esc(org)}` : ""}</div>
<div style="margin-top:8px;color:#8f8bab">Reason: ${esc(reason)}</div>
<p style="margin-top:16px;line-height:1.6">${esc(message)}</p>
<p style="margin-top:20px;color:#8f8bab;font-size:12px">Hit reply to send them the key.</p></div>`,
        }),
      }),
    );
  if (ntfy)
    jobs.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(ntfy)}`, {
        method: "POST",
        headers: { Title: `Vault key request — ${name}`.replace(/[^\x20-\x7e]/g, ""), Tags: "key", Click: `mailto:${email}`, Priority: "high" },
        body: text,
      }),
    );
  if (discord)
    jobs.push(
      fetch(discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Nabeel.OS Vault", content: `🔑 **${subject}**\n${text}`.slice(0, 1900), allowed_mentions: { parse: [] } }),
      }),
    );

  const results = await Promise.allSettled(jobs);
  const delivered = results.some((r) => r.status === "fulfilled" && r.value.ok);
  if (!delivered) return Response.json({ error: `Couldn't deliver the request — email ${site.email} instead.` }, { status: 502 });
  return Response.json({ ok: true, ticket });
}
