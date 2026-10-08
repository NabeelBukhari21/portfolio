import { buildSystemPrompt } from "@/lib/aiContext";
import { clientIp, rateLimit } from "@/lib/rateLimit";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = buildSystemPrompt();

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: "The AI assistant isn't configured yet (missing GEMINI_API_KEY)." }, { status: 503 });
  }

  const rl = rateLimit(`ask:${clientIp(req)}`, 12, 10 * 60 * 1000);
  if (!rl.ok) {
    return Response.json({ error: `Rate limit reached — try again in ${rl.retryAfter}s.` }, { status: 429 });
  }

  let messages: Msg[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  messages = messages
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }

  // Primary model first, then a lighter backup. Google's "-latest" aliases
  // always point at the current generation, so these don't go stale.
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-flash-lite-latest"])];
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    // Newer Gemini models "think" before answering and those tokens count here,
    // so leave headroom or replies come back empty.
    generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
  });

  let lastStatus = 0;
  for (const model of models) {
    // Overloaded (503) / rate-limited (429): retry once after a short pause, then fall back.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body,
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          const data = await res.json();
          const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
            .filter((p: { thought?: boolean }) => !p.thought)
            .map((p: { text?: string }) => p.text ?? "")
            .join("")
            .trim();
          return Response.json({
            reply: text || "I couldn't come up with an answer — try rephrasing, or email Nabeel directly.",
          });
        }
        lastStatus = res.status;
        console.error("Gemini error", res.status, model, await res.text());
        if (res.status === 400 || res.status === 401) break; // bad key: no point retrying
        if (res.status !== 503 && res.status !== 429 && res.status !== 500) break; // try next model
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        console.error("Gemini fetch failed", model, e);
        lastStatus = 0;
      }
    }
    if (lastStatus === 400 || lastStatus === 401) break;
  }

  // Visitors get a friendly message; the exact cause is in Vercel → Logs.
  const hint =
    lastStatus === 404 || lastStatus === 403
      ? " (model unavailable — check GEMINI_MODEL)"
      : lastStatus === 400 || lastStatus === 401
        ? " (API key rejected — check GEMINI_API_KEY)"
        : lastStatus === 429
          ? " (Gemini quota reached)"
          : lastStatus === 503
            ? " (Google's servers are busy)"
            : "";
  return Response.json({ error: `The AI is taking a nap. Try again in a moment.${hint}` }, { status: 502 });
}
