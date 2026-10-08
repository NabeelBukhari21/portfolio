"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { bootLines, site, projects, experience } from "@/content/profile";
import { startLink, stopLink, useNeural } from "@/lib/neural/engine";
import type { HoloStatus } from "./hero/HoloFace";
import { NeonButton, Photo } from "./ui";
import { HoloDirector } from "./hero/HoloDirector";

// three.js only loads in the browser, after the page is interactive
const HoloFace = dynamic(() => import("./hero/HoloFace").then((m) => m.HoloFace), { ssr: false });

function BootSequence({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= bootLines.length) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : 230);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-void"
      exit={{ opacity: 0 }}
      onClick={onDone}
    >
      <div className="w-full max-w-xl px-6 font-mono text-sm">
        {bootLines.slice(0, shown).map((l, i) => (
          <div key={i} className={i === 0 ? "mb-2 text-pink" : l.startsWith("[ok]") ? "text-ok" : "text-ink"}>
            {l}
          </div>
        ))}
        <span className="blink text-cyan">█</span>
        <div className="mt-8 text-xs text-dim">click anywhere to skip</div>
      </div>
    </motion.div>
  );
}

const noopSubscribe = () => () => {};

export function Hero() {
  // Only play the boot sequence once per browser session
  const bootedBefore = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return !!sessionStorage.getItem("booted");
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [bootedNow, setBooted] = useState(false);
  const booted = bootedBefore || bootedNow;
  const link = useNeural();
  const [holo, setHolo] = useState<HoloStatus>("loading");
  const shippedCount = projects.length;

  const finishBoot = () => {
    try {
      sessionStorage.setItem("booted", "1");
    } catch {}
    setBooted(true);
  };

  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-28">
      {!booted && <BootSequence onDone={finishBoot} />}

      {/* background */}
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-pink/20 blur-[120px]" />
      <div className="absolute -right-40 bottom-0 h-[620px] w-[620px] rounded-full bg-cyan/15 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute right-[-4rem] top-24 select-none font-jp text-[22vw] font-bold leading-none text-white/[0.03] md:right-0">
        {site.katakana}
      </div>
      {/* perspective floor + horizon */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-40%] bottom-0 h-[38%] opacity-50 [perspective:520px]">
        <div className="cs-floor h-full w-full origin-bottom [transform:rotateX(74deg)]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[30%] h-px bg-gradient-to-r from-transparent via-pink/40 to-transparent" />

      {/* 3D holographic face — a fixed layer behind the whole page: right of the hero, then it
          glides to the centre and dims as you scroll. No WebGL → plain photo. */}
      {holo !== "unsupported" ? (
        <>
          <HoloFace background onStatus={setHolo} />
          {holo === "ready" && booted && <HoloDirector />}
        </>
      ) : (
        <div className="absolute inset-x-0 top-14 flex h-[58svh] items-center justify-center opacity-60 md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[56%] md:opacity-100">
          <Photo src={site.photo} alt={`Photo of ${site.name}`} className="cut aspect-[4/5] w-64 md:w-80" />
        </div>
      )}

      {/* HUD frame */}
      <div aria-hidden className="pointer-events-none absolute inset-x-3 bottom-3 top-[84px] hidden md:block">
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-b-2 border-l-2", "right-0 bottom-0 border-b-2 border-r-2"].map((k) => (
          <span key={k} className={`absolute h-8 w-8 border-cyan/60 ${k}`} />
        ))}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.35em] text-dim [writing-mode:vertical-rl]">LAT 43.65 // LON -79.38 // SIGNAL ▮▮▮▮▯</div>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 rotate-180 font-mono text-[9px] tracking-[0.35em] text-dim [writing-mode:vertical-rl]">ID-0x4E41 // CLASS: DEV.CLOUD.AI</div>
      </div>

      {/* giant outlined name running behind everything */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute inset-x-0 bottom-[8%] select-none overflow-hidden whitespace-nowrap px-4 font-display text-[clamp(5rem,19vw,22rem)] font-bold uppercase leading-none tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(0,240,255,0.18)] md:px-8"
      >
        {site.short}
        <span className="[-webkit-text-stroke:1px_rgba(255,43,214,0.25)]">.OS</span>
      </motion.div>

      <div className="relative w-full px-4 pt-[34svh] md:px-10 md:pt-0 2xl:px-16">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.25em]"
          >
            <span className="flex items-center gap-2 border border-ok/40 bg-ok/5 px-2.5 py-1 text-ok">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
              {site.status.toUpperCase()}
            </span>
            <span className="text-dim">
              PLAYER 01 <span className="text-pink">{"//"}</span> TORONTO
            </span>
          </motion.div>

          <h1 className="font-display font-bold uppercase leading-[0.86] tracking-tight" aria-label={site.name}>
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="block font-mono text-sm font-normal tracking-[0.5em] text-cyan md:text-base"
            >
              SYED
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -40, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.35, type: "spring", stiffness: 90, damping: 16 }}
              className="glitch block text-[clamp(3.6rem,10vw,8.5rem)] text-ink drop-shadow-[0_0_30px_rgba(255,43,214,0.35)]"
              data-text="NABEEL"
            >
              NABEEL
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 90, damping: 16 }}
              className="block text-[clamp(3.6rem,10vw,8.5rem)] text-transparent [-webkit-text-stroke:2px_rgba(0,240,255,0.85)]"
            >
              RAZA
            </motion.span>
          </h1>

          {/* role as a typed command */}
          <div className="mt-5 flex items-center gap-3 font-mono text-sm text-cyan md:text-base">
            <span className="text-pink">&gt;</span>
            <span className="tracking-[0.18em]">{site.headline.toUpperCase()}</span>
            <span className="blink">▌</span>
          </div>
          <p className="mt-4 max-w-lg text-lg text-ink/80">{site.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#map"
              className="group relative inline-flex items-center gap-3 bg-cyan px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-void transition hover:shadow-[0_0_34px_-2px_#00f0ff]"
              style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
            >
              Jack in <span className="transition-transform group-hover:translate-x-1">▸▸</span>
            </a>
            <NeonButton href={site.resumeUrl} tone="pink" external>
              Resume ↓
            </NeonButton>
            <a href="#ask" className="inline-flex items-center gap-2 border border-white/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink/80 transition hover:border-cyan hover:text-cyan">
              ◉ Ask my AI
            </a>
          </div>

          {/* stats as HUD readouts */}
          <div className="mt-8 grid max-w-md grid-cols-3 gap-2">
            {[
              [String(shippedCount), "projects", "#00f0ff"],
              [String(experience.length), "roles", "#ff2bd6"],
              ["3", "cities → 1 mission", "#f2ff3c"],
            ].map(([v, l, c], i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="border-l-2 bg-white/[0.03] px-3 py-2"
                style={{ borderColor: c }}
              >
                <div className="font-display text-3xl font-bold leading-none" style={{ color: c, textShadow: `0 0 20px ${c}66` }}>
                  {v}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim">{l}</div>
              </motion.div>
            ))}
          </div>

          {/* Neural link module */}
          <div className="mt-6 max-w-md border border-line bg-panel/80 p-3 font-mono text-[11px] backdrop-blur" style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-dim">
                NEURAL LINK{" "}
                <span className={link.status === "on" ? "text-ok" : link.status === "error" ? "text-pink" : "text-volt"}>
                  ● {link.status === "on" ? "CONNECTED" : link.status === "loading" ? "SYNCING" : link.status === "error" ? "ERROR" : "OFFLINE"}
                </span>
              </span>
              {link.status === "on" ? (
                <button onClick={() => stopLink()} className="border border-pink px-2.5 py-1 text-pink hover:bg-pink hover:text-void">
                  disconnect
                </button>
              ) : (
                <button
                  onClick={() => startLink()}
                  disabled={link.status === "loading"}
                  className="border border-cyan bg-cyan/10 px-2.5 py-1 text-cyan shadow-[0_0_18px_-4px_rgba(0,240,255,0.8)] hover:bg-cyan hover:text-void disabled:opacity-50"
                >
                  {link.status === "loading" ? "syncing…" : "⚡ connect"}
                </button>
              )}
            </div>
            <p className="mt-2 leading-relaxed text-dim">
              {link.status === "on"
                ? "Linked. Turn your head, blink, talk, raise your brows — the hologram mirrors you. Raise a hand to steer: make a fist to click, pinch and move to scroll."
                : link.error ??
                  "Opt-in camera link: the hologram mirrors your face and you can steer the site with your hand. Runs 100% on your device — nothing is uploaded."}
            </p>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <a href="#map" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 font-mono text-[10px] tracking-[0.4em] text-dim transition hover:text-cyan md:flex">
        SCROLL TO JACK IN
        <span className="flex flex-col leading-[0.6] text-cyan">
          {[0, 1, 2].map((k) => (
            <motion.span key={k} animate={{ opacity: [0.15, 1, 0.15] }} transition={{ duration: 1.4, repeat: Infinity, delay: k * 0.18 }}>
              ▾
            </motion.span>
          ))}
        </span>
      </a>
    </section>
  );
}
