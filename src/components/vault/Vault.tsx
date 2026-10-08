"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { site } from "@/content/profile";
import { FileGlyph, Sentinel, VaultSigil } from "./Sigils";
import { Fae, Iris } from "./Fae";
import { manifestOf } from "@/lib/vault/manifest";
import { UnlockSequence, type UnlockPhase } from "./UnlockSequence";
import { INLINE_CATEGORIES, vaultStore } from "@/lib/vault/client";

type Doc = { id: string; name: string; type: string; ext: string; size: number; added: string; category: string };
type Contact = { phone: string | null; address: string | null; note: string | null };
type Session = { docs: Doc[]; contact: Contact; expires: number };
type LogLine = { t: number; text: string; tone?: "ok" | "info" | "warn" };

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const fmtTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const kindOf = (d: Doc) =>
  d.type.startsWith("image/") ? "images" : d.type === "application/pdf" ? "pdf" : d.type.startsWith("video/") ? "video" : d.type.startsWith("audio/") ? "audio" : "docs";


const RED = "#ff3b5c";
const cut = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;

function Panel({ children, className = "", edge = "rgba(255,255,255,0.14)", n = 16 }: { children: ReactNode; className?: string; edge?: string; n?: number }) {
  return (
    <div className={`p-px ${className}`} style={{ clipPath: cut(n), background: edge }}>
      <div className="relative h-full bg-[#07051a]/92" style={{ clipPath: cut(n) }}>
        {children}
      </div>
    </div>
  );
}

/** FAE guards the iris: three parallax planes (rim + petals, guardian, dust) that tilt with the pointer */
function FaeGate({ state, tiltX, tiltY, px, py }: { state: "locked" | "busy" | "open" | "deny"; tiltX: MotionValue<number>; tiltY: MotionValue<number>; px: MotionValue<number>; py: MotionValue<number> }) {
  const open = state === "open";
  const tone = state === "open" ? "#3dff9a" : state === "busy" ? "#f2ff3c" : state === "deny" ? RED : "#00f0ff";
  const fx = useTransform(px, (v) => v * 2.2), fy = useTransform(py, (v) => v * -1.6);
  const dx = useTransform(px, (v) => v * 3.5), dy = useTransform(py, (v) => v * -2.6);
  return (
    <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }} className="relative aspect-square w-full max-w-[520px]">
      {/* back plane: the iris */}
      <div className="absolute inset-[6%]" style={{ transform: "translateZ(-40px)" }}>
        <Iris open={open} tone={tone} size="100%" spin={state === "busy"} />
      </div>
      {/* label ring text */}
      <div className="pointer-events-none absolute inset-x-0 top-0 text-center font-mono text-[9px] tracking-[0.5em] text-dim" style={{ transform: "translateZ(10px)" }}>
        立入禁止 · RESTRICTED · AES-256
      </div>
      {/* mid plane: FAE */}
      <motion.div style={{ x: fx, y: fy, transform: "translateZ(90px)" }} className="pointer-events-none absolute inset-x-0 bottom-[-6%] flex justify-center">
        <motion.div animate={open ? { y: -260, scale: 1.3, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }} transition={{ duration: 1, ease: [0.5, 0, 0.75, 0] }}>
          <Fae mood={state === "busy" ? "scan" : state === "deny" ? "deny" : open ? "grant" : "idle"} size={185} />
        </motion.div>
      </motion.div>
      {/* front plane: drifting data motes */}
      <motion.div style={{ x: dx, y: dy, transform: "translateZ(140px)" }} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }, (_, k) => (
          <span key={k} className="vs-dot absolute left-1/2 top-1/2 h-1 w-1 rounded-full" style={{ background: k % 2 ? "#ff2bd6" : tone, ["--r" as string]: `${150 + (k % 4) * 30}px`, animationDelay: `${-k * 0.8}s`, animationDuration: `${9 + (k % 5)}s` }} />
        ))}
      </motion.div>
    </motion.div>
  );
}

/** "request a key" terminal: name, email, reason → Nabeel gets notified */
function RequestAccess() {
  const [f, setF] = useState({ name: "", email: "", org: "", reason: "Hiring / recruiting", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [ticket, setTicket] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMsg("");
    const started = Date.now();
    try {
      const r = await fetch("/api/vault/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      await new Promise((res) => setTimeout(res, Math.max(0, 1400 - (Date.now() - started))));
      if (!r.ok) {
        setState("error");
        setMsg(j.error ?? "Transmission failed.");
        return;
      }
      setTicket(j.ticket);
      setState("sent");
    } catch {
      setState("error");
      setMsg("Connection lost.");
    }
  }

  const field = "w-full border border-white/15 bg-[#05040c]/80 px-3 py-2.5 font-mono text-sm outline-none transition placeholder:text-dim/50 focus:border-cyan focus:shadow-[0_0_20px_-8px_#00f0ff]";
  if (state === "sent")
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
        <Sentinel mood="grant" size={70} />
        <div className="mt-4 font-mono text-[11px] tracking-[0.3em] text-ok">REQUEST TRANSMITTED</div>
        <div className="mt-2 font-display text-3xl font-bold">TICKET #{ticket}</div>
        <p className="mx-auto mt-3 max-w-sm text-sm text-dim">
          Nabeel has been pinged. If it checks out, the key lands in <span className="text-ink">{f.email}</span>.
        </p>
      </motion.div>
    );
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={f.name} onChange={set("name")} placeholder="your name" aria-label="Your name" maxLength={80} className={field} />
        <input required type="email" value={f.email} onChange={set("email")} placeholder="work email" aria-label="Your email" maxLength={120} className={field} />
        <input value={f.org} onChange={set("org")} placeholder="company / role (optional)" aria-label="Company or role" maxLength={100} className={field} />
        <select value={f.reason} onChange={set("reason")} aria-label="Reason" className={field}>
          {["Hiring / recruiting", "Collaboration", "Friend / family", "Other"].map((r) => (
            <option key={r} className="bg-[#07051a]">
              {r}
            </option>
          ))}
        </select>
      </div>
      <textarea required value={f.message} onChange={set("message")} placeholder="why do you need access?" aria-label="Why do you need access?" maxLength={600} rows={3} className={`${field} resize-none`} />
      {/* honeypot */}
      <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} className="hidden" aria-hidden />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className="relative overflow-hidden bg-[#ff3b5c] px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:shadow-[0_0_30px_-4px_#ff3b5c] disabled:opacity-70"
          style={{ clipPath: cut(12) }}
        >
          {state === "sending" ? "Transmitting…" : "Request a key ▸"}
          {state === "sending" && <motion.span className="absolute inset-y-0 left-0 bg-white/30" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.3 }} />}
        </button>
        <span className="font-mono text-[10px] text-dim">your details go straight to Nabeel · nothing is stored</span>
      </div>
      {state === "error" && <div className="font-mono text-xs text-[#ff3b5c]">✕ {msg}</div>}
    </form>
  );
}

export function Vault() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<UnlockPhase | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<Session | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<Doc | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // share the open session with the rest of the site (e.g. Character Select's classified training photos)
  useEffect(() => vaultStore.set(session), [session]);

  const push = useCallback((text: string, tone: LogLine["tone"] = "info") => setLog((l) => [{ t: Date.now(), text, tone }, ...l].slice(0, 40)), []);

  // restore an open session after a refresh (no cinematic)
  useEffect(() => {
    fetch("/api/vault/docs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Session | null) => {
        if (s) {
          setSession(s);
          push("SESSION RESUMED", "ok");
        }
      })
      .catch(() => {});
  }, [push]);

  // session countdown → auto-seal when it expires
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n / 1000 > session.expires) {
        setSession(null);
        setOpen(null);
        push("SESSION EXPIRED · VAULT SEALED", "warn");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [session, push]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || phase) return;
    setErr(null);
    setPhase("verify");
    const started = Date.now();
    try {
      const res = await fetch("/api/vault/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const data = await res.json();
      await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started)))); // let the scan read
      if (!res.ok) {
        setErr(data.error ?? "ACCESS DENIED");
        setPhase(res.status === 401 ? "deny" : null);
        return;
      }
      setPending(data);
      setPhase("grant");
      setPw("");
    } catch {
      setErr("Connection lost.");
      setPhase(null);
    }
  }

  const finish = useCallback(() => {
    if (phase === "grant" && pending) {
      setSession(pending);
      setLog([]);
      const n = pending.docs.length;
      setTimeout(() => {
        push("ACCESS GRANTED", "ok");
        push("AUTHENTICATION VERIFIED", "ok");
        push("VAULT INITIALIZED", "ok");
        push(`DOCUMENTS DECRYPTED · ${n} FILE${n === 1 ? "" : "S"}`, "ok");
        if (pending.contact.phone || pending.contact.address) push("DIRECT LINE RECORD OPENED", "info");
        if (pending.docs.some((d) => INLINE_CATEGORIES.has(d.category))) push("CLASSIFIED PHOTOS UNSEALED → CHARACTER SELECT", "info");
      }, 50);
      setPending(null);
      document.getElementById("vault")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setPhase(null);
  }, [phase, pending, push]);

  async function lock() {
    await fetch("/api/vault/lock", { method: "POST" }).catch(() => {});
    setSession(null);
    setOpen(null);
    setLog([]);
  }

  const docs = useMemo(() => (session?.docs ?? []).filter((d) => !INLINE_CATEGORIES.has(d.category)), [session]);
  const cats = useMemo(() => ["all", ...Array.from(new Set(docs.map((d) => d.category)))], [docs]);
  const shown = docs.filter((d) => (cat === "all" || d.category === cat) && d.name.toLowerCase().includes(q.toLowerCase()));
  const pendingManifest = useMemo(() => manifestOf(pending), [pending]);
  const openManifest = useMemo(() => manifestOf(session), [session]);
  const remaining = session ? Math.max(0, session.expires - Math.floor(now / 1000)) : 0;

  const view = (d: Doc) => {
    setOpen(d);
    push(`OPENED · ${d.name}`, "info");
  };

  /* --- 3D / parallax rig --- */
  const reduce = useReducedMotion();
  const R = reduce ? 0 : 1;
  const sec = useRef<HTMLElement>(null);
  const { scrollYProgress: sp } = useScroll({ target: sec, offset: ["start end", "end start"] });
  const titleL = useTransform(sp, [0, 1], ["-6%", "4%"]);
  const titleR = useTransform(sp, [0, 1], ["6%", "-4%"]);
  const kanjiY = useTransform(sp, [0, 1], [180 * R, -260 * R]);
  const { scrollYProgress: ep } = useScroll({ target: sec, offset: ["start end", "start 0.25"] });
  const e = useSpring(ep, { stiffness: 120, damping: 24 });
  const doorRX = useTransform(e, [0, 1], [38 * R, 0]);
  const px = useMotionValue(0), py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 90, damping: 16 }), spy = useSpring(py, { stiffness: 90, damping: 16 });
  const tiltX = useTransform([doorRX, spy] as MotionValue<number>[], ([a, b]: number[]) => a + b);
  const onMove = (ev: RPointerEvent<HTMLDivElement>) => {
    if (reduce || ev.pointerType !== "mouse") return;
    const r = ev.currentTarget.getBoundingClientRect();
    px.set(((ev.clientX - r.left) / r.width - 0.5) * 18);
    py.set((0.5 - (ev.clientY - r.top) / r.height) * 12);
  };
  const [mode, setMode] = useState<"key" | "request">("key");
  const doorState = phase === "grant" ? "open" : phase === "verify" ? "busy" : err || phase === "deny" ? "deny" : "locked";

  return (
    <section data-covers-face id="vault" ref={sec} className="relative scroll-mt-16 overflow-clip py-24">
      {/* world: floor grid, red horizon, kanji */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(6,5,12,0.88)_12%,rgba(6,5,12,0.88)_88%,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_55%,rgba(255,59,92,0.12),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(0,240,255,0.08),transparent_50%)]" />
        <div className="absolute inset-x-[-40%] bottom-0 h-[45%] opacity-60 [perspective:520px]">
          <div className="cs-floor h-full w-full origin-bottom [transform:rotateX(74deg)]" />
        </div>
        <motion.div style={{ y: kanjiY }} className="absolute right-[3%] top-[10%] font-jp text-[clamp(5rem,11vw,11rem)] font-bold leading-none text-[#ff3b5c]/[0.06] [writing-mode:vertical-rl]">
          金庫・機密
        </motion.div>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)]" />
      </div>

      <div className="relative px-4 md:px-10 2xl:px-16">
        {/* giant split title */}
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.35em]" style={{ color: RED }}>
          <span className="h-px w-10" style={{ background: RED }} />
          07 {"//"} <span className="font-jp">金庫</span>
          <span className="ml-auto hidden tracking-[0.2em] text-dim md:inline">CLASSIFIED STORAGE · KEY HOLDERS ONLY</span>
        </div>
        <h2 className="mt-3 font-display font-bold uppercase leading-[0.8] tracking-tight">
          <motion.span style={{ x: titleL }} className="block whitespace-nowrap text-[clamp(3rem,12vw,14rem)] text-transparent [-webkit-text-stroke:1.5px_rgba(255,59,92,0.7)]">
            The
          </motion.span>
          <motion.span style={{ x: titleR }} className="block text-right">
            <span className="glitch inline-block text-[clamp(3rem,12vw,14rem)] text-ink drop-shadow-[0_0_40px_rgba(255,59,92,0.4)]" data-text="Vault">
              Vault
            </span>
          </motion.span>
        </h2>

        <AnimatePresence mode="wait">
          {!session ? (
            /* ================= LOCKED ================= */
            <motion.div key="locked" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, filter: "blur(10px)" }} className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              {/* door */}
              <div className="flex justify-center" style={{ perspective: 1400 }} onPointerMove={onMove} onPointerLeave={() => (px.set(0), py.set(0))}>
                <FaeGate state={doorState} tiltX={tiltX} tiltY={spx} px={spx} py={spy} />
              </div>

              {/* auth terminal */}
              <Panel edge={`linear-gradient(135deg, ${RED}, rgba(255,255,255,0.1) 40%, rgba(0,240,255,0.6))`} n={20}>
                <div className="p-5 md:p-7">
                  <div className="flex items-center gap-3">
                    <Sentinel mood={err ? "deny" : phase ? "scan" : "idle"} size={54} />
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.3em] text-cyan">FAE · VAULT GUARDIAN</div>
                      <div className="font-mono text-xs text-ink/80">
                        {mode === "request" ? "No key? Leave your details — I'll pass them to Nabeel." : err ? "Key rejected. Try again." : "State your access key, operator."}
                      </div>
                    </div>
                  </div>

                  {/* mode tabs */}
                  <div className="mt-6 grid grid-cols-2 gap-1 font-mono text-[11px] tracking-[0.2em]">
                    {(
                      [
                        ["key", "▸ ENTER KEY"],
                        ["request", "▸ REQUEST KEY"],
                      ] as const
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setMode(k)}
                        className={`relative py-2.5 transition ${mode === k ? "text-void" : "bg-white/[0.03] text-dim hover:text-ink"}`}
                        style={{ clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)" }}
                      >
                        {mode === k && <motion.span layoutId="vault-tab" className="absolute inset-0" style={{ background: k === "key" ? "#00f0ff" : RED }} />}
                        <span className="relative">{l}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {mode === "key" ? (
                      <motion.div key="key" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <h3 className="mt-6 font-display text-3xl font-bold uppercase md:text-4xl">Authenticate</h3>
                        <p className="mt-2 text-sm text-dim">Recruiters: the access key is on my resume — or request one. Everything inside is AES-256 encrypted and served only to an authenticated session.</p>
                        <form onSubmit={unlock} className="mt-5">
                          <label className="font-mono text-[10px] tracking-[0.3em] text-dim" htmlFor="vault-key">
                            ACCESS KEY
                          </label>
                          <div className="mt-1.5 flex overflow-hidden border border-white/15 bg-[#05040c]/80 transition focus-within:border-cyan focus-within:shadow-[0_0_24px_-6px_rgba(0,240,255,0.7)]" style={{ clipPath: cut(10) }}>
                            <span className="flex items-center pl-3 font-mono text-cyan">&gt;</span>
                            <input
                              id="vault-key"
                              type="password"
                              value={pw}
                              onChange={(ev) => setPw(ev.target.value)}
                              placeholder="••••••••••"
                              autoComplete="off"
                              className="flex-1 bg-transparent px-3 py-3 font-mono text-base tracking-widest outline-none placeholder:text-dim/50"
                            />
                            <button type="submit" disabled={!!phase || !pw} className="bg-cyan px-5 font-display text-sm font-semibold uppercase tracking-wider text-void transition hover:bg-white disabled:opacity-40">
                              Unlock
                            </button>
                          </div>
                          {err && (
                            <motion.div initial={{ x: -6 }} animate={{ x: [6, -4, 2, 0] }} className="mt-2 font-mono text-xs text-[#ff3b5c]">
                              ✕ {err}
                            </motion.div>
                          )}
                        </form>
                        <button onClick={() => setMode("request")} className="mt-4 font-mono text-[11px] text-[#ff3b5c] hover:underline">
                          no key? request one →
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="request" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6">
                        <RequestAccess />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-6 grid grid-cols-3 gap-2 font-mono text-[10px] text-dim">
                    {[
                      ["CIPHER", "AES-256-GCM"],
                      ["SESSION", "1 HOUR"],
                      ["ATTEMPTS", "5 / 10 MIN"],
                    ].map(([k, v]) => (
                      <div key={k} className="border-l-2 border-cyan/50 bg-white/[0.03] px-2 py-1.5">
                        <div>{k}</div>
                        <div className="text-ink">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </motion.div>
          ) : (
            /* ================= UNLOCKED ================= */
            <motion.div key="open" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10 space-y-5">
              {/* status bar */}
              <Panel edge="linear-gradient(90deg, rgba(61,255,154,0.8), rgba(255,255,255,0.1) 40%, rgba(0,240,255,0.5))" n={14}>
                <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <VaultSigil size={44} state="open" />
                  <div className="flex-1">
                    <div className="font-mono text-[10px] tracking-[0.3em] text-ok">● VAULT OPEN · SESSION ACTIVE</div>
                    <div className="font-mono text-xs text-dim">
                      auto-seal in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} · {docs.length} encrypted file{docs.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="hidden h-1.5 w-48 overflow-hidden bg-white/10 md:block">
                    <div className="h-full bg-ok shadow-[0_0_10px_#3dff9a]" style={{ width: `${Math.min(100, (remaining / 3600) * 100)}%` }} />
                  </div>
                  <button onClick={lock} className="border border-pink/60 px-4 py-1.5 font-mono text-xs text-pink transition hover:bg-pink hover:text-void" style={{ clipPath: cut(8) }}>
                    🔒 seal vault
                  </button>
                </div>
              </Panel>

              {/* what this key unlocked across the site */}
              <Panel edge="linear-gradient(90deg, rgba(61,255,154,0.6), rgba(255,255,255,0.08) 50%, rgba(255,43,214,0.5))" n={14}>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.3em]">
                    <span className="text-ok">ACCESS MANIFEST · WHAT YOUR KEY OPENED</span>
                    <span className="text-dim">
                      {openManifest.length} SECTOR{openManifest.length === 1 ? "" : "S"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" style={{ perspective: 800 }}>
                    {openManifest.map((r, k) => (
                      <motion.a
                        key={r.key}
                        href={r.href}
                        initial={{ opacity: 0, rotateY: -50, x: -10 }}
                        animate={{ opacity: 1, rotateY: 0, x: 0 }}
                        transition={{ delay: 0.1 + k * 0.08, type: "spring", stiffness: 140, damping: 18 }}
                        whileHover={{ y: -3 }}
                        className="group block border-l-2 bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
                        style={{ borderColor: r.color }}
                      >
                        <div className="flex items-center gap-2 font-mono text-[12px]">
                          <span style={{ color: r.color }}>{r.icon}</span>
                          <span className="text-ink">{r.label}</span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-dim">{r.detail}</div>
                        <div className="mt-1 font-mono text-[10px] transition group-hover:translate-x-1" style={{ color: r.color }}>
                          → {r.where}
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </Panel>

              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                  {/* direct line */}
                  {(session.contact.phone || session.contact.address || session.contact.note) && (
                    <Panel edge="rgba(255,43,214,0.45)">
                      <div className="p-5">
                        <div className="font-mono text-[10px] tracking-[0.3em] text-pink">DIRECT LINE · DECRYPTED</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {session.contact.phone && (
                            <a href={`tel:${session.contact.phone.replace(/[^+\d]/g, "")}`} className="border border-white/10 bg-white/[0.03] p-3 font-mono text-sm transition hover:border-cyan">
                              <span className="text-pink">☎</span> {session.contact.phone}
                            </a>
                          )}
                          {session.contact.address && (
                            <div className="border border-white/10 bg-white/[0.03] p-3 font-mono text-sm">
                              <span className="text-pink">⌂</span> {session.contact.address}
                            </div>
                          )}
                        </div>
                        {session.contact.note && <p className="mt-3 text-sm text-dim">{session.contact.note}</p>}
                      </div>
                    </Panel>
                  )}

                  {/* database */}
                  <Panel>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="font-mono text-[10px] tracking-[0.3em] text-cyan">SECURE DATABASE</div>
                        <div className="ml-auto flex items-center border border-white/15 bg-[#05040c]/70 px-3 focus-within:border-cyan">
                          <span className="font-mono text-xs text-dim">⌕</span>
                          <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="search files" className="w-36 bg-transparent px-2 py-1.5 font-mono text-xs outline-none sm:w-48" />
                        </div>
                      </div>
                      {cats.length > 2 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cats.map((c) => (
                            <button
                              key={c}
                              onClick={() => setCat(c)}
                              className={`border px-3 py-0.5 font-mono text-[11px] capitalize transition ${c === cat ? "border-cyan bg-cyan/15 text-cyan" : "border-white/10 text-dim hover:text-ink"}`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      {docs.length === 0 ? (
                        <div className="mt-6 border border-dashed border-white/15 p-8 text-center font-mono text-xs text-dim">No documents stored yet.</div>
                      ) : (
                        <motion.div layout className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" style={{ perspective: 900 }}>
                          <AnimatePresence>
                            {shown.map((d, k) => (
                              <motion.div
                                key={d.id}
                                layout
                                initial={{ opacity: 0, rotateX: -60, y: 20 }}
                                animate={{ opacity: 1, rotateX: 0, y: 0, transition: { delay: Math.min(k, 12) * 0.05, type: "spring", stiffness: 160, damping: 18 } }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                whileHover={{ y: -4, rotateX: 6 }}
                                className="group relative overflow-hidden border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-cyan/60 hover:shadow-[0_0_26px_-10px_rgba(0,240,255,0.8)]"
                                style={{ clipPath: cut(10) }}
                              >
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent opacity-0 transition group-hover:opacity-100" />
                                <div className="flex gap-3">
                                  <FileGlyph ext={d.ext} className="h-12 w-10 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold" title={d.name}>
                                      {d.name}
                                    </div>
                                    <div className="mt-0.5 font-mono text-[10px] text-dim">
                                      {fmtDate(d.added)} · {fmtSize(d.size)}
                                    </div>
                                    <div className="font-mono text-[10px] capitalize text-cyan/70">{d.category}</div>
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button onClick={() => view(d)} className="flex-1 border border-cyan/50 py-1 font-mono text-[11px] text-cyan transition hover:bg-cyan hover:text-void">
                                    ◉ view
                                  </button>
                                  <a
                                    href={`/api/vault/file/${d.id}?dl=1`}
                                    onClick={() => push(`DOWNLOADED · ${d.name}`, "info")}
                                    className="flex-1 border border-white/15 py-1 text-center font-mono text-[11px] text-ink/80 transition hover:border-pink hover:text-pink"
                                  >
                                    ↓ download
                                  </a>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      )}
                      {docs.length > 0 && shown.length === 0 && <div className="mt-4 font-mono text-xs text-dim">No files match.</div>}
                    </div>
                  </Panel>
                </div>

                {/* access log */}
                <Panel className="h-fit lg:sticky lg:top-24" edge="rgba(61,255,154,0.35)">
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sentinel mood="grant" size={30} />
                      <div className="font-mono text-[10px] tracking-[0.3em] text-ok">ACCESS LOG</div>
                    </div>
                    <div className="max-h-80 space-y-1.5 overflow-y-auto font-mono text-[11px] [scrollbar-width:thin]">
                      <AnimatePresence initial={false}>
                        {log.map((l) => (
                          <motion.div key={l.t + l.text} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                            <span className="shrink-0 text-dim">{fmtTime(l.t)}</span>
                            <span className={l.tone === "ok" ? "text-ok" : l.tone === "warn" ? "text-[#ff3b5c]" : "text-ink/85"}>{l.text}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </Panel>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-6 font-mono text-[10px] text-dim">
          trouble getting in? <a href={`mailto:${site.email}?subject=Vault access`} className="text-cyan hover:underline">{site.email}</a>
        </p>
      </div>

      {/* viewer */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[95] flex flex-col bg-[#03020a]/95 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <div className="flex items-center gap-3 px-4 py-3 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
              <FileGlyph ext={open.ext} className="h-7 w-6" />
              <span className="truncate text-cyan">{open.name}</span>
              <span className="text-dim">· {fmtSize(open.size)}</span>
              <a href={`/api/vault/file/${open.id}?dl=1`} className="ml-auto border border-white/20 px-2 py-1 text-ink hover:border-pink hover:text-pink">
                ↓ download
              </a>
              <button onClick={() => setOpen(null)} className="border border-pink px-2 py-1 text-pink hover:bg-pink hover:text-void">
                close
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.96, opacity: 0, clipPath: "inset(48% 0 48% 0)" }}
              animate={{ scale: 1, opacity: 1, clipPath: "inset(0% 0 0% 0)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-0 flex-1 items-center justify-center p-3"
              onClick={(e) => e.stopPropagation()}
            >
              {kindOf(open) === "images" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/vault/file/${open.id}`} alt={open.name} className="max-h-full max-w-full object-contain" />
              ) : kindOf(open) === "pdf" ? (
                <iframe src={`/api/vault/file/${open.id}`} title={open.name} className="h-full w-full max-w-5xl rounded bg-white" />
              ) : kindOf(open) === "video" ? (
                <video src={`/api/vault/file/${open.id}`} autoPlay loop muted playsInline disablePictureInPicture onVolumeChange={(e) => (e.currentTarget.muted = true)} className="max-h-full max-w-full" />
              ) : kindOf(open) === "audio" ? (
                <audio src={`/api/vault/file/${open.id}`} controls autoPlay />
              ) : open.type === "text/plain" ? (
                <iframe src={`/api/vault/file/${open.id}`} title={open.name} className="h-full w-full max-w-4xl rounded bg-white" />
              ) : (
                <div className="text-center font-mono text-sm text-dim">
                  No in-browser preview for .{open.ext} files.
                  <br />
                  <a href={`/api/vault/file/${open.id}?dl=1`} className="mt-3 inline-block text-cyan underline">
                    download it instead
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UnlockSequence phase={phase} manifest={pendingManifest} onDone={finish} />
    </section>
  );
}
