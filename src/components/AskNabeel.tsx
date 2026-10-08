"use client";

import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gesture, holo, speak, voice } from "@/lib/holo";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What has Nabeel built on AWS?",
  "Tell me about RentOS.",
  "Has he led a team?",
  "What makes him different from other junior devs?",
];

const GREETING = "Hey! I'm Nabeel.AI — the version of Nabeel that never sleeps. Ask me anything about his work, projects or background.";
const cut = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;

export function AskNabeel() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // typewriter: which message is being "spoken" and how much of it is out
  const [typing, setTyping] = useState<{ i: number; n: number } | null>(null);
  const [greeted, setGreeted] = useState(false);
  const voiceOn = useSyncExternalStore(voice.subscribe, voice.get, () => false);
  const scroller = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const speaking = !!typing;

  /* --- scroll choreography --- */
  const { scrollYProgress: sp } = useScroll({ target: sec, offset: ["start end", "end start"] });
  const askX = useTransform(sp, [0, 1], ["-12%", "6%"]);
  const nabX = useTransform(sp, [0, 1], ["12%", "-8%"]);
  const jpY = useTransform(sp, [0, 1], [200, -300]);
  const { scrollYProgress: ep } = useScroll({ target: sec, offset: ["start end", "start 0.15"] });
  const e = useSpring(ep, { stiffness: 120, damping: 24 });
  const rotY = useTransform(e, [0, 1], [-32, 0]);
  const conX = useTransform(e, [0, 1], [160, 0]);
  const conO = useTransform(e, [0, 0.6], [0, 1]);
  const podS = useTransform(e, [0, 1], [0.6, 1]);
  const ringR = useTransform(sp, [0, 1], [0, 220]);

  // greet once the pod is on screen
  useEffect(() => {
    const el = document.getElementById("ask-pod");
    if (!el) return;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting && en.intersectionRatio > 0.5) {
          io.disconnect();
          setGreeted(true);
          setTyping({ i: 0, n: 0 });
          gesture("smile", 1.8);
          speak(GREETING);
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // typewriter + lips
  useEffect(() => {
    if (!typing) return;
    const full = messages[typing.i]?.content ?? "";
    if (typing.n < full.length) {
      holo.speaking = true;
      const t = setTimeout(() => setTyping((x) => (x ? { ...x, n: Math.min(full.length, x.n + 3) } : x)), 24);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (!(typeof speechSynthesis !== "undefined" && speechSynthesis.speaking)) holo.speaking = false;
      setTyping(null);
    }, 120);
    return () => clearTimeout(t);
  }, [typing, messages]);

  // while thinking: eyes up, little "hmm" gestures
  useEffect(() => {
    if (!busy) return;
    holo.look = { x: -0.4, y: -0.6 };
    gesture("think", 2.2);
    const iv = setInterval(() => gesture("think", 2.2), 2300);
    return () => {
      clearInterval(iv);
      holo.look = null;
    };
  }, [busy]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, typing]);

  useEffect(
    () => () => {
      holo.speaking = false;
    },
    [],
  );

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setTyping(null);
    let reply = "";
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = await res.json();
      reply = data.reply ?? `⚠ ${data.error ?? "Something went wrong."}`;
    } catch {
      reply = "⚠ Connection lost. Try again.";
    }
    setBusy(false);
    setMessages((m) => [...m, { role: "assistant", content: reply }]);
    setTyping({ i: next.length, n: 0 });
    gesture(reply.startsWith("⚠") ? "shake" : "nod", 1.4);
    if (!reply.startsWith("⚠")) speak(reply);
  }

  const state = busy ? "PROCESSING" : speaking ? "SPEAKING" : "LISTENING";
  const stateCol = busy ? "#f2ff3c" : speaking ? "#ff2bd6" : "#3dff9a";

  return (
    <section id="ask" ref={sec} className="relative overflow-clip py-24">
      {/* glow where the face lands */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_28%_60%,rgba(0,240,255,0.10),transparent_50%),radial-gradient(ellipse_at_80%_70%,rgba(255,43,214,0.08),transparent_50%)]" />
      <motion.div aria-hidden style={{ y: jpY }} className="pointer-events-none absolute right-[2%] top-0 font-jp text-[clamp(3rem,7vw,7rem)] font-bold leading-none text-cyan/[0.06] [writing-mode:vertical-rl]">
        質問して・ニューラル音声
      </motion.div>

      {/* giant title */}
      <div className="relative px-4 md:px-10 2xl:px-16">
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.35em] text-cyan">
          <span className="h-px w-10 bg-cyan" />
          06 {"//"} <span className="font-jp">質問して</span>
          <span className="ml-auto hidden tracking-[0.2em] text-dim md:inline">LLM · GROUNDED ON MY REAL RESUME</span>
        </div>
        <h2 className="mt-3 font-display font-bold uppercase leading-[0.8] tracking-tight">
          <motion.span style={{ x: askX }} className="block whitespace-nowrap text-[clamp(3rem,13vw,15rem)] text-transparent [-webkit-text-stroke:1.5px_rgba(0,240,255,0.65)]">
            Ask the
          </motion.span>
          <motion.span style={{ x: nabX }} className="block text-right">
            <span className="glitch inline-block whitespace-nowrap text-[clamp(3rem,13vw,15rem)] text-ink drop-shadow-[0_0_40px_rgba(0,240,255,0.45)]" data-text="Nabeel.AI">
              Nabeel.AI
            </span>
          </motion.span>
        </h2>
      </div>

      <div className="relative mt-10 grid items-center gap-8 px-4 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] 2xl:px-16">
        {/* ===== the pod: the background face pops out into here ===== */}
        <motion.div id="ask-pod" style={{ scale: podS }} className="relative h-[52vh] min-h-[320px] lg:h-[74vh]">
          {/* floor rings */}
          <div className="pointer-events-none absolute inset-x-[8%] bottom-[2%] h-[22%] [perspective:600px]">
            <motion.div style={{ rotate: ringR }} className="h-full w-full rounded-[50%] border-2 border-dashed border-cyan/40 [transform:rotateX(75deg)]" />
          </div>
          <div className="pointer-events-none absolute inset-x-[20%] bottom-[6%] h-[12%] rounded-[50%] bg-cyan/20 blur-2xl" />
          {/* frame */}
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-b-2 border-l-2", "right-0 bottom-0 border-b-2 border-r-2"].map((k) => (
            <span key={k} className={`pointer-events-none absolute h-10 w-10 border-cyan/80 ${k}`} />
          ))}
          <div className="absolute left-4 top-3 font-mono text-[10px] tracking-[0.3em] text-cyan">
            NEURAL VOICE · <span style={{ color: stateCol }}>● {state}</span>
          </div>
          <button
            onClick={() => voice.set(!voiceOn)}
            className="absolute right-4 top-2.5 border border-white/20 px-2 py-0.5 font-mono text-[10px] text-dim transition hover:border-cyan hover:text-cyan"
            aria-pressed={voiceOn}
          >
            {voiceOn ? "🔊 voice on" : "🔈 voice off"}
          </button>
          {/* scan line */}
          <span className="pointer-events-none absolute inset-x-6 h-px bg-cyan/50 shadow-[0_0_10px_#00f0ff] [animation:cs-sweep_4s_ease-in-out_infinite]" />
          {/* voice waveform */}
          <div className="absolute inset-x-[18%] bottom-5 flex h-8 items-end justify-center gap-[3px]" aria-hidden>
            {Array.from({ length: 40 }, (_, k) => (
              <span
                key={k}
                className="holo-bar w-[3px]"
                style={{ background: stateCol, opacity: 0.8, animationDelay: `${-((k * 37) % 11) * 0.06}s`, animationPlayState: speaking || busy ? "running" : "paused" }}
              />
            ))}
          </div>
          {!greeted && <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-dim">establishing neural link…</div>}
        </motion.div>

        {/* ===== chat console ===== */}
        <div style={{ perspective: 1400 }}>
          <motion.div style={{ rotateY: rotY, x: conX, opacity: conO, transformOrigin: "100% 50%" }}>
            <div className="p-px" style={{ clipPath: cut(20), background: "linear-gradient(135deg, rgba(0,240,255,0.8), rgba(255,255,255,0.1) 40%, rgba(255,43,214,0.7))" }}>
              <div className="bg-[#08061a]/95" style={{ clipPath: cut(20) }}>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 font-mono text-[11px]">
                  <span className="text-dim">
                    <span className="text-cyan">nabeel.ai</span> · gemini · grounded · rate-limited
                  </span>
                  <span style={{ color: stateCol }}>● {state.toLowerCase()}</span>
                </div>
                <div ref={scroller} className="h-[46vh] min-h-[300px] space-y-4 overflow-y-auto p-4" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {messages.map((m, i) => {
                      if (i === 0 && !greeted) return null;
                      const shown = typing && typing.i === i ? m.content.slice(0, typing.n) : m.content;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, rotateX: -50, y: 20 }}
                          animate={{ opacity: 1, rotateX: 0, y: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 22 }}
                          style={{ transformPerspective: 700, transformOrigin: "50% 0%" }}
                          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-cyan text-void" : "border border-white/10 bg-white/[0.04] text-ink"}`}
                            style={{ clipPath: cut(10) }}
                          >
                            {m.role === "assistant" && <div className="mb-1 font-mono text-[9px] tracking-[0.25em] text-cyan">NABEEL.AI</div>}
                            {shown}
                            {typing?.i === i && <span className="blink text-cyan">▌</span>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {busy && (
                    <div className="flex items-center gap-2 font-mono text-xs text-volt">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((k) => (
                          <motion.span key={k} className="h-1.5 w-1.5 bg-volt" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
                        ))}
                      </span>
                      processing query…
                    </div>
                  )}
                </div>
                {messages.length <= 1 && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {STARTERS.map((s) => (
                      <button key={s} onClick={() => send(s)} className="border border-pink/40 px-2 py-1 font-mono text-[11px] text-pink transition hover:bg-pink hover:text-void">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    send(input);
                  }}
                  className="flex border-t border-white/10"
                >
                  <span className="px-3 py-3.5 font-mono text-cyan">&gt;</span>
                  <input
                    value={input}
                    onChange={(ev) => setInput(ev.target.value)}
                    maxLength={500}
                    placeholder="Ask about projects, skills, experience…"
                    aria-label="Ask a question about Nabeel"
                    className="flex-1 bg-transparent py-3.5 font-mono text-sm outline-none placeholder:text-dim"
                  />
                  <button type="submit" disabled={busy || !input.trim()} className="px-5 font-display text-sm font-semibold uppercase tracking-wider text-cyan transition hover:bg-cyan/10 disabled:opacity-40">
                    Transmit
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
