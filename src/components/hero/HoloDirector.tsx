"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { character, site, socials } from "@/content/profile";
import { gesture, holo, speak, voice, type Gesture } from "@/lib/holo";

/**
 * Gives the background hologram a life of its own. It only ever says three kinds of things:
 *  - how to use the section you're looking at
 *  - fun facts about Nabeel (straight from the real profile content)
 *  - a nudge to one of his socials (with the link)
 * …and keeps nodding, winking and looking around in between. More chatty when you're idle.
 */

type Act = { text: string; g?: Gesture; link?: { href: string; label: string } };

/** how to navigate each section — the first one plays when you arrive, the rest come up randomly */
const TIPS: Record<string, Act[]> = {
  top: [
    { text: "Hit ⚡ connect and I'll mirror your face through your camera. It all runs on your device.", g: "wink" },
    { text: "Use the nav up top to jump anywhere — or press ` to open my terminal.", g: "nod" },
    { text: "In a hurry? Recruiter Mode turns this whole site into a clean one-pager.", g: "smile" },
  ],
  map: [
    { text: "This is my system map. Drag to spin it, hover a node to trace it, click one to focus.", g: "nod" },
    { text: "Click 'Open case file' on any project to jump to the full write-up.", g: "smile" },
  ],
  pipeline: [
    { text: "Read this like a CI/CD run — each stage is a chapter of my story, top to bottom.", g: "nod" },
  ],
  projects: [
    { text: "Keep scrolling to flip through the reel — or use your arrow keys.", g: "lookAround" },
    { text: "Click a screen to open its real screenshots.", g: "smile" },
  ],
  character: [
    { text: "Character select! Tap CYBERWARE up top to see my skills as installed modules.", g: "wink" },
    { text: "Move your mouse over the console — it tilts in 3D.", g: "tilt" },
    { text: "In Story Mode, swipe or tap the episode cards. Every trophy card opens its photo proof.", g: "nod" },
  ],
  ventures: [
    { text: "Click the storefront or any floating product to open the photos. 'Visit the shop' opens the real store.", g: "smile" },
  ],
  vault: [{ text: "That's the vault. Locked and encrypted — you'll need the key.", g: "shake" }],
  contact: [
    { text: "If you scrolled this far, we should talk. LinkedIn is the fastest way to reach me.", g: "nod", link: { href: site.linkedin, label: "LinkedIn ↗" } },
    { text: "Hover the Snapchat card to see my Snapcode.", g: "wink" },
  ],
};
const SECTIONS = Object.keys(TIPS);

const SOCIAL_ACTS: Act[] = [
  { text: "Let's connect on LinkedIn — that's where I actually reply fastest.", g: "smile", link: { href: site.linkedin, label: "LinkedIn ↗" } },
  { text: "Want to see the code? My GitHub is open.", g: "nod", link: { href: site.github, label: "GitHub ↗" } },
  { text: `Follow me on Instagram — @${socials.instagram.handle}.`, g: "wink", link: { href: socials.instagram.url, label: "Instagram ↗" } },
  { text: `Add me on Snapchat — @${socials.snapchat.handle}.`, g: "smile", link: { href: socials.snapchat.url, label: "Snapchat ↗" } },
  { text: `I'm on X too — @${socials.x.handle}.`, g: "nod", link: { href: socials.x.url, label: "X ↗" } },
  { text: "Say hi on Facebook.", g: "smile", link: { href: socials.facebook.url, label: "Facebook ↗" } },
];

const FACT_ACTS: Act[] = [
  ...character.achievements.map((a) => ({ text: `Fun fact about me: ${a.title} — ${a.detail.replace(/\.$/, "")}.` })),
  ...character.extras.map((x) => ({ text: `Fun fact about me: ${x.replace(/\.$/, "")}.` })),
  ...character.community.map((x) => ({ text: `Fun fact about me: ${x.replace(/\.$/, "")}.` })),
];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** the section whose box covers the middle of the screen */
function currentSection() {
  const mid = innerHeight / 2;
  for (const id of SECTIONS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return id;
  }
  return null;
}

export function HoloDirector() {
  const [act, setAct] = useState<Act | null>(null);
  const [shown, setShown] = useState(0);
  const [dock, setDock] = useState<"face" | "bottom" | "top">("face");
  const voiceOn = useSyncExternalStore(voice.subscribe, voice.get, () => false);
  const busy = useRef(false);
  const text = act?.text ?? "";

  // typewriter + lip flap + auto-dismiss
  useEffect(() => {
    if (!act) return;
    if (shown < text.length) {
      holo.speaking = true;
      const t = setTimeout(() => setShown((n) => Math.min(text.length, n + 2)), 32);
      return () => clearTimeout(t);
    }
    if (!(typeof speechSynthesis !== "undefined" && speechSynthesis.speaking)) holo.speaking = false;
    const t = setTimeout(() => {
      setAct(null);
      holo.attention = 0;
      busy.current = false;
    }, (act.link ? 4500 : 2600) + text.length * 25);
    return () => clearTimeout(t);
  }, [act, shown, text]);

  // the brain
  useEffect(() => {
    // ✕ only snoozes it for a few minutes — it comes back on its own
    const snoozed = () => {
      try {
        return Number(sessionStorage.getItem("holo-snooze") ?? 0) > Date.now();
      } catch {
        return false;
      }
    };

    const play = (a: Act) => {
      busy.current = true;
      setAct(a);
      setShown(0);
      holo.attention = 1;
      if (a.g) gesture(a.g, 1.8);
      speak(a.text);
    };

    let lastInput = performance.now();
    const onInput = () => (lastInput = performance.now());
    addEventListener("pointermove", onInput, { passive: true });
    addEventListener("keydown", onInput);
    addEventListener("scroll", onInput, { passive: true });

    const greeted = new Set<string>();
    let lastSection: string | null = null;
    let nextRandom = performance.now() + 7000;

    const loop = setInterval(() => {
      const inHero = scrollY < innerHeight * 0.55;
      setDock(innerWidth < 768 ? (inHero ? "top" : "bottom") : inHero ? "face" : "bottom");
      if (holo.focus > 0.25) {
        // the Nabeel.AI pod is talking — get out of its way
        if (busy.current) {
          setAct(null);
          holo.attention = 0;
          holo.speaking = false;
          busy.current = false;
        }
        return;
      }
      if (document.hidden || snoozed()) return;
      const now = performance.now();
      const sec = currentSection();

      // arriving somewhere new: explain how to use it (once per section)
      if (sec && sec !== lastSection) {
        lastSection = sec;
        if (!greeted.has(sec)) {
          greeted.add(sec);
          if (!busy.current) {
            play(TIPS[sec][0]);
            nextRandom = now + 12000;
            return;
          }
        }
      }
      if (busy.current) return;

      const idle = now - lastInput > 9000;
      if (now < nextRandom) {
        // between lines: small gestures keep it alive
        if (Math.random() < 0.08) gesture(pick<Gesture>(["nod", "tilt", "lookAround", "smile", "wink"]), 1.4);
        return;
      }
      nextRandom = now + (idle ? 8000 : 14000) + Math.random() * 7000;
      const r = Math.random();
      const tips = sec ? TIPS[sec] : TIPS.top;
      if (r < 0.4) play(pick(tips));
      else if (r < 0.75) play({ ...pick(FACT_ACTS), g: pick<Gesture>(["smile", "nod", "surprise"]) });
      else play(pick(SOCIAL_ACTS));
    }, 500);

    return () => {
      clearInterval(loop);
      removeEventListener("pointermove", onInput);
      removeEventListener("keydown", onInput);
      removeEventListener("scroll", onInput);
    };
  }, []);

  const mute = () => {
    try {
      sessionStorage.setItem("holo-snooze", String(Date.now() + 3 * 60_000));
    } catch {}
    setAct(null);
    busy.current = false;
    holo.speaking = false;
    holo.attention = 0;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  };

  return (
    <AnimatePresence>
      {act && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 14, scale: 0.92, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 8, scale: 0.95, filter: "blur(4px)" }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className={`fixed z-[60] w-[min(320px,calc(100vw-2rem))] print:hidden ${dock === "bottom" ? "bottom-4 left-4" : dock === "top" ? "left-4 top-16" : "left-[49%] top-[22%]"}`}
          role="status"
          aria-live="polite"
        >
          <div className="relative border border-cyan/50 bg-[#07051a]/90 p-3 shadow-[0_0_40px_-10px_rgba(0,240,255,0.7)] backdrop-blur-md" style={{ clipPath: "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))" }}>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan">
              {dock !== "face" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.photo} alt="" className="h-5 w-5 rounded-full border border-cyan object-cover" />
              )}
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
              NABEEL.AI · TRANSMITTING
              <span className="ml-auto flex gap-1.5 tracking-normal">
                <button onClick={() => voice.set(!voiceOn)} title={voiceOn ? "Mute voice" : "Turn voice on"} aria-label={voiceOn ? "Mute voice" : "Turn voice on"} className="text-dim hover:text-cyan">
                  {voiceOn ? "🔊" : "🔈"}
                </button>
                <button onClick={mute} title="Quiet for 3 minutes" aria-label="Quiet the hologram for 3 minutes" className="text-dim hover:text-pink">
                  ✕
                </button>
              </span>
            </div>
            <p className="text-[13.5px] leading-snug text-ink/90">
              {text.slice(0, shown)}
              {shown < text.length && <span className="blink text-cyan">▌</span>}
            </p>
            {act.link && shown >= text.length && (
              <motion.a
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                href={act.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block border border-pink/50 px-2 py-0.5 font-mono text-[11px] text-pink transition hover:bg-pink hover:text-void"
              >
                {act.link.label}
              </motion.a>
            )}
            {/* voice meter */}
            <div className="mt-2 flex h-3 items-end gap-[2px]" aria-hidden>
              {Array.from({ length: 24 }, (_, k) => (
                <span key={k} className="holo-bar w-[3px] bg-cyan/70" style={{ animationDelay: `${-k * 0.07}s`, animationPlayState: shown < text.length ? "running" : "paused" }} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
