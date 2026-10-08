"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ManifestRow } from "@/lib/vault/manifest";
import { Fae, Iris } from "./Fae";

/**
 * Full-screen unlock cinematic, built from layered planes that drift with the pointer:
 *   floor grid → glyph rain → the iris → FAE (the guardian) → HUD text.
 * verify — FAE scans, iris rim spins fast
 * deny   — red chromatic tear, FAE shakes, "ACCESS DENIED"
 * grant  — FAE spreads her wings and flies off, the iris petals slide open, the manifest of
 *          what was unlocked types out, then the camera flies through the iris into the site.
 * Click / Esc skips. Only transforms + opacity are animated.
 */
export type UnlockPhase = "verify" | "deny" | "grant";

const GLYPHS = "アカサタナハマヤラワ0123456789ABCDEF<>/#*";
const column = (seed: number) => Array.from({ length: 28 }, (_, k) => GLYPHS[(seed * 7 + k * 13) % GLYPHS.length]).join("\n");

export function UnlockSequence({ phase, manifest, onDone }: { phase: UnlockPhase | null; manifest: ManifestRow[]; onDone: () => void }) {
  const [step, setStep] = useState(0); // grant timeline: 1 wings · 2 iris open · 3 manifest · 4 fly-through
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  // pointer parallax
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 }), sy = useSpring(my, { stiffness: 60, damping: 18 });
  const l1x = useTransform(sx, (v) => v * -10), l1y = useTransform(sy, (v) => v * -10);
  const l2x = useTransform(sx, (v) => v * 18), l2y = useTransform(sy, (v) => v * 18);
  const l3x = useTransform(sx, (v) => v * 34), l3y = useTransform(sy, (v) => v * 34);

  useEffect(() => {
    if (!phase || phase === "verify") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, f: () => void) => timers.push(setTimeout(f, reduced ? Math.min(ms, 900) : ms));
    if (phase === "deny") at(1600, () => done.current());
    else {
      const list = 380 * Math.max(1, manifest.length);
      at(80, () => setStep(1));
      at(650, () => setStep(2));
      at(1500, () => setStep(3));
      at(1500 + list + 1400, () => setStep(4));
      at(1500 + list + 2200, () => done.current());
    }
    return () => {
      timers.forEach(clearTimeout);
      setStep(0);
    };
  }, [phase, manifest.length]);

  useEffect(() => {
    if (phase !== "grant") return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && done.current();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [phase]);

  const tone = phase === "deny" ? "#ff3b5c" : phase === "grant" ? "#3dff9a" : "#f2ff3c";
  const mood = phase === "deny" ? "deny" : phase === "grant" ? "grant" : "scan";
  const small = typeof window !== "undefined" && innerWidth < 640;
  const irisSize = small ? 300 : 520;

  return (
    <AnimatePresence>
      {phase && (
        <motion.div
          key="unlock"
          className="fixed inset-0 z-[120] overflow-hidden bg-[#03020a]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          onPointerMove={(e) => {
            mx.set(e.clientX / innerWidth - 0.5);
            my.set(e.clientY / innerHeight - 0.5);
          }}
          onClick={() => phase === "grant" && done.current()}
          role="status"
          aria-live="assertive"
        >
          {/* fly-through: the whole scene rushes toward the camera through the open iris */}
          <motion.div className="absolute inset-0" animate={step === 4 ? { scale: 3.2, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.7, 0, 0.84, 0] }}>
            {/* L0: floor + horizon */}
            <motion.div style={{ x: l1x, y: l1y }} className="pointer-events-none absolute inset-[-5%]">
              <div className="absolute inset-x-[-30%] bottom-0 h-[45%] [perspective:500px]">
                <div className="cs-floor h-full w-full origin-bottom [transform:rotateX(74deg)]" />
              </div>
              <div className="absolute inset-x-0 top-[55%] h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone}aa, transparent)` }} />
            </motion.div>

            {/* L1: glyph rain */}
            <motion.div style={{ x: l1x, y: l1y }} aria-hidden className="pointer-events-none absolute inset-0 flex justify-between px-[3vw] opacity-40">
              {Array.from({ length: small ? 8 : 16 }, (_, k) => (
                <pre
                  key={k}
                  className="unlock-rain font-mono text-[11px] leading-[1.15]"
                  style={{ color: k % 3 === 0 ? "#ff2bd6" : tone, animationDuration: `${3 + (k % 5) * 0.7}s`, animationDelay: `${-(k * 0.37)}s` }}
                >
                  {column(k)}
                </pre>
              ))}
            </motion.div>

            {/* L2: the iris */}
            <motion.div style={{ x: l2x, y: l2y }} className="absolute inset-0 flex items-center justify-center">
              <motion.div animate={phase === "deny" ? { x: [0, -14, 12, -6, 0] } : {}} transition={{ duration: 0.4 }}>
                <Iris open={phase === "grant" && step >= 2} tone={tone} size={irisSize} spin={phase === "verify"} />
              </motion.div>
            </motion.div>

            {/* deny: chromatic tear */}
            {phase === "deny" && (
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {[0, 1, 2, 3, 4].map((k) => (
                  <div key={k} className="unlock-tear absolute inset-x-0 bg-[#ff3b5c]/25" style={{ top: `${12 + k * 18}%`, height: `${3 + (k % 3) * 2}%`, animationDelay: `${k * 0.07}s` }} />
                ))}
              </div>
            )}

            {/* L3: FAE */}
            <motion.div style={{ x: l3x, y: l3y }} className="pointer-events-none absolute inset-x-0 bottom-[4%] flex justify-center sm:bottom-[2%]">
              <motion.div
                animate={phase === "grant" && step >= 1 ? { y: "-120vh", scale: 1.6, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.5, 0, 0.75, 0] }}
              >
                <Fae mood={mood} size={small ? 170 : 250} />
              </motion.div>
            </motion.div>

            {/* L4: HUD */}
            <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim md:left-8 md:top-8">
              <div>SECURE CHANNEL · TLS 1.3</div>
              <div>CIPHER · AES-256-GCM</div>
              <div style={{ color: tone }}>STATUS · {phase === "verify" ? "VERIFYING KEY" : phase === "deny" ? "REJECTED" : "AUTHORIZED"}</div>
            </div>
            <div className="pointer-events-none absolute right-5 top-5 text-right font-mono text-[10px] tracking-[0.2em] text-dim md:right-8 md:top-8">
              FAE · VAULT GUARDIAN
              <br />
              {phase === "grant" && <span className="text-dim/70">click or esc to skip</span>}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-[9%] flex flex-col items-center px-4 text-center sm:top-[8%]">
              <AnimatePresence mode="wait">
                <motion.div key={phase} initial={{ opacity: 0, y: -10, letterSpacing: "0.6em" }} animate={{ opacity: 1, y: 0, letterSpacing: "0.3em" }} exit={{ opacity: 0 }} className="font-mono text-[11px]" style={{ color: tone }}>
                  {phase === "verify" && "FAE: hold still… reading your key"}
                  {phase === "deny" && "FAE: that key isn't one of mine. Attempt logged."}
                  {phase === "grant" && "FAE: welcome in, operator."}
                </motion.div>
              </AnimatePresence>
              {phase !== "verify" && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: phase === "grant" ? 0.5 : 0 }}
                  className="mt-3 font-display text-[clamp(2.4rem,8vw,6.5rem)] font-bold uppercase leading-none"
                  style={{ color: tone, textShadow: `-0.04em 0 #ff2bd6, 0.04em 0 #00f0ff, 0 0 40px ${tone}88` }}
                >
                  {phase === "deny" ? "Access denied" : "Access granted"}
                </motion.div>
              )}
              {phase === "verify" && (
                <div className="mt-4 font-mono text-xs text-volt">
                  ▌ hashing · comparing · signing session<span className="blink">…</span>
                </div>
              )}
            </div>

            {/* manifest: what this key unlocked, and where it lives on the site */}
            {phase === "grant" && step >= 3 && (
              <div className="absolute inset-x-0 bottom-[6%] flex justify-center px-4">
                <div className="w-full max-w-xl border border-white/10 bg-[#05040c]/90 p-4 font-mono" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                  <div className="mb-2 flex justify-between text-[10px] tracking-[0.3em] text-dim">
                    <span className="text-ok">ACCESS MANIFEST</span>
                    <span>
                      {manifest.length} SECTOR{manifest.length === 1 ? "" : "S"} UNSEALED
                    </span>
                  </div>
                  {manifest.length === 0 && <div className="text-xs text-dim">vault is empty — nothing classified yet.</div>}
                  {manifest.map((r, k) => (
                    <motion.div key={r.key} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.38 }} className="flex items-baseline gap-3 border-t border-white/5 py-1.5 text-[12px]">
                      <span style={{ color: r.color }}>{r.icon}</span>
                      <span className="shrink-0 text-ink">{r.label}</span>
                      <span className="hidden min-w-0 truncate text-dim sm:inline">{r.detail}</span>
                      <span className="ml-auto shrink-0 text-[10px]" style={{ color: r.color }}>
                        → {r.where}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
