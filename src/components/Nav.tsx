"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { site } from "@/content/profile";

export const NAV: [string, string][] = [
  ["top", "Landing"],
  ["map", "System"],
  ["pipeline", "Pipeline"],
  ["projects", "Projects"],
  ["character", "Character"],
  ["ventures", "Business"],
  ["ask", "Ask AI"],
  ["contact", "Channel"],
];

const cut = (n: number) => `polygon(${n}px 0, 100% 0, calc(100% - ${n}px) 100%, 0 100%)`;

/** the AI face inside a little gyroscope of spinning 3D rings */
function Gyro({ size = 38 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size, perspective: 300 }}>
      <span className="absolute inset-[-5px] rounded-full border border-cyan/60 [animation:gyro-a_6s_linear_infinite] [transform-style:preserve-3d]" />
      <span className="absolute inset-[-3px] rounded-full border border-dashed border-pink/70 [animation:gyro-b_9s_linear_infinite] [transform-style:preserve-3d]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-face-96.webp" alt="" className="relative h-full w-full rounded-full shadow-[0_0_18px_-2px_rgba(0,240,255,0.7)]" />
    </span>
  );
}

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () =>
      setT(new Date().toLocaleTimeString("en-CA", { hour12: false, timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return t;
}

/** which section is under the middle of the screen */
function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const mid = innerHeight * 0.45;
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= mid) cur = id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ids]);
  return active;
}

const IDS = ["top", "map", "pipeline", "projects", "character", "ventures", "ask", "vault", "contact"];
const LABEL: Record<string, string> = { ...Object.fromEntries(NAV), vault: "Vault" };

export function Nav({
  recruiter,
  onToggleRecruiter,
  onTerminal,
}: {
  recruiter: boolean;
  onToggleRecruiter: () => void;
  onTerminal: () => void;
}) {
  const clock = useClock();
  const active = useActive(IDS);
  const [menu, setMenu] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  const activeLabel = LABEL[active] ?? "";

  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [menu]);

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 print:hidden">
        {/* status ticker */}
        <div className="hidden h-5 items-center gap-5 border-b border-white/5 bg-[#04030a]/90 px-4 font-mono text-[9px] tracking-[0.25em] text-dim md:flex md:px-6">
          <span>
            <span className="text-cyan">NABEEL.OS</span> v2.6
          </span>
          <span>
            NET <span className="text-ok">● ONLINE</span>
          </span>
          <span>LOC TORONTO 43.65°N 79.38°W</span>
          <span className="tabular-nums">
            T <span className="text-ink">{clock || "--:--:--"}</span>
          </span>
          {!recruiter && (
            <span className="ml-auto">
              SECTOR <span className="text-[#ff3b5c]">{activeLabel.toUpperCase()}</span>
            </span>
          )}
        </div>

        {/* main bar */}
        <div className="relative border-b border-cyan/15 bg-[#06050c]/80 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,240,255,0.06),transparent_30%,transparent_70%,rgba(255,43,214,0.06))]" />
          <div className="relative flex h-14 items-center justify-between gap-2 px-3 sm:gap-4 md:px-6">
            {/* logo */}
            <a href="#top" onClick={() => recruiter && onToggleRecruiter()} className="group flex shrink-0 items-center gap-3" aria-label={`${site.name} — home`}>
              <Gyro />
              <span className="leading-none">
                <span className="glitch block font-display text-lg font-bold uppercase tracking-[0.12em]" data-text="NABEEL.">
                  <span className="text-cyan">N</span>ABEEL<span className="text-pink">.</span>
                </span>
                <span className="mt-0.5 hidden whitespace-nowrap font-mono text-[9px] tracking-[0.3em] text-dim sm:block">
                  <span className="font-jp tracking-normal">{site.katakana}</span> · DEV.CLOUD.AI
                </span>
              </span>
            </a>

            {/* 3D tab rail */}
            {!recruiter && (
              <div className="hidden flex-1 justify-center xl:flex" style={{ perspective: 700 }}>
                <div className="flex items-stretch gap-1 [transform:rotateX(14deg)] [transform-style:preserve-3d]">
                  {NAV.map(([id, label], i) => {
                    const on = active === id;
                    return (
                      <a
                        key={id}
                        href={`#${id}`}
                        aria-current={on ? "true" : undefined}
                        className="group relative block transition-transform duration-200 hover:[transform:translateZ(14px)_translateY(-2px)]"
                      >
                        <span
                          className={`relative flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors 2xl:px-3.5 2xl:text-[11px] ${
                            on ? "text-void" : "bg-white/[0.03] text-dim group-hover:bg-cyan/10 group-hover:text-cyan"
                          }`}
                          style={{ clipPath: cut(7) }}
                        >
                          {on && <motion.span layoutId="nav-on" className="absolute inset-0 bg-cyan shadow-[0_0_20px_#00f0ff]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                          <span className={`relative text-[9px] ${on ? "text-void/70" : "text-[#ff3b5c]"}`}>{String(i).padStart(2, "0")}</span>
                          <span className="relative">{label}</span>
                        </span>
                        {/* reflection on the "floor" */}
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute inset-x-1 -bottom-1.5 h-1 blur-[3px] transition ${on ? "bg-cyan/70" : "bg-transparent group-hover:bg-cyan/30"}`}
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* actions */}
            <div className="flex shrink-0 items-center gap-2">
              {!recruiter && (
                <a
                  href="#vault"
                  className="vault-btn group relative flex items-center gap-1.5 whitespace-nowrap overflow-hidden rounded-full border border-cyan/60 px-3 py-1 font-mono text-[11px] text-cyan shadow-[0_0_16px_-4px_rgba(0,240,255,0.8)] transition hover:bg-cyan hover:text-void"
                  title="Open the Vault"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11z" />
                    <circle cx="12" cy="11" r="2.4" />
                    <path d="M12 13.4V17" />
                  </svg>
                  <span className="hidden sm:inline">VAULT</span>
                  <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/40 blur-sm [animation:vault-sheen_3.5s_ease-in-out_infinite]" />
                </a>
              )}
              <button
                onClick={onTerminal}
                className="hidden whitespace-nowrap border border-line px-2 py-1 font-mono text-[11px] text-dim hover:border-cyan hover:text-cyan sm:block"
                title="Open terminal ( ` )"
              >
                &gt;_ terminal
              </button>
              <button
                onClick={onToggleRecruiter}
                aria-pressed={recruiter}
                className={`cut-sm whitespace-nowrap px-2 py-1.5 font-display text-[11px] sm:px-3 sm:text-xs font-semibold uppercase tracking-wider transition ${
                  recruiter ? "bg-pink text-void" : "border border-pink text-pink hover:bg-pink hover:text-void"
                }`}
              >
                {recruiter ? "Exit recruiter mode" : <><span className="sm:hidden">Recruiter</span><span className="hidden sm:inline">Recruiter mode</span></>}
              </button>
              {!recruiter && (
                <button
                  onClick={() => setMenu(true)}
                  aria-label="Open menu"
                  aria-expanded={menu}
                  className="flex h-8 w-9 flex-col items-center justify-center gap-[5px] border border-cyan/40 text-cyan transition hover:bg-cyan/10 xl:hidden"
                  style={{ clipPath: cut(5) }}
                >
                  <span className="h-px w-4 bg-current" />
                  <span className="h-px w-3 bg-current" />
                  <span className="h-px w-4 bg-current" />
                </button>
              )}
            </div>
          </div>

          {/* page progress */}
          <div className="absolute inset-x-0 -bottom-px h-px bg-white/5">
            <motion.div style={{ scaleX: bar, transformOrigin: "0% 50%" }} className="relative h-full bg-gradient-to-r from-cyan via-[#a78bfa] to-pink shadow-[0_0_10px_#00f0ff]" />
          </div>
        </div>
      </nav>

      {/* full-screen menu (tablet & phone) */}
      <AnimatePresence>
        {menu && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col bg-[#06050c]/95 backdrop-blur-xl print:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
            role="dialog"
            aria-label="Site menu"
          >
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
            <div className="pointer-events-none absolute right-4 top-20 font-jp text-[22vw] font-bold leading-none text-white/[0.03] [writing-mode:vertical-rl]">メニュー</div>
            <div className="relative flex h-14 items-center justify-between px-4">
              <span className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-[#ff3b5c]">
                <Gyro size={30} /> SELECT DESTINATION
              </span>
              <button onClick={() => setMenu(false)} className="border border-pink px-3 py-1 font-mono text-xs text-pink hover:bg-pink hover:text-void">
                close [esc]
              </button>
            </div>
            <div className="relative flex flex-1 flex-col justify-center gap-1 px-6" style={{ perspective: 800 }}>
              {[...NAV, ["vault", "Vault"] as [string, string]].map(([id, label], i) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMenu(false)}
                  initial={{ opacity: 0, rotateX: -70, y: 30 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 160, damping: 18 }}
                  className="group flex items-baseline gap-4 border-b border-white/5 py-1.5"
                >
                  <span className="w-8 font-mono text-xs text-[#ff3b5c]">{String(i).padStart(2, "0")}</span>
                  <span
                    className={`font-display text-[clamp(2rem,9vw,3.6rem)] font-bold uppercase leading-none transition group-hover:translate-x-2 ${
                      active === id ? "text-cyan" : "text-ink"
                    }`}
                  >
                    {label}
                  </span>
                  {active === id && <span className="ml-auto font-mono text-[10px] text-cyan">◀ YOU ARE HERE</span>}
                </motion.a>
              ))}
            </div>
            <div className="relative px-6 pb-6 font-mono text-[10px] tracking-[0.25em] text-dim">
              NABEEL.OS · T {clock}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
