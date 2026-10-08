"use client";

import { sm } from "@/lib/img";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ventures } from "@/content/profile";
import { Lightbox } from "./Gallery";

const VOLT = "#f2ff3c";
const cut = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;

// where the product shots float around the storefront (left/top in %, size in % of stage width, depth)
const FLOATS = [
  { l: 2, t: 6, w: 24, d: -140, z: 60, r: -8 },
  { l: 74, t: 2, w: 22, d: 120, z: 90, r: 7 },
  { l: 0, t: 58, w: 21, d: 170, z: 110, r: 5 },
  { l: 77, t: 56, w: 23, d: -110, z: 40, r: -6 },
  { l: 40, t: 78, w: 18, d: 220, z: 130, r: 3 },
];

function Venture({ v, vi, onOpen }: { v: (typeof ventures)[number]; vi: number; onOpen: (i: number) => void }) {
  const reduce = useReducedMotion();
  const R = reduce ? 0 : 1;
  const flip = vi % 2 === 1;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const nameX = useTransform(p, [0, 1], flip ? ["-25%", "5%"] : ["5%", "-25%"]);
  const frameRY = useTransform(p, [0, 0.45, 1], [(flip ? -28 : 28) * R, 0, (flip ? 10 : -10) * R]);
  const frameRX = useTransform(p, [0, 0.45, 1], [14 * R, 0, -6 * R]);
  const frameY = useTransform(p, [0, 1], [80 * R, -80 * R]);
  const idxY = useTransform(p, [0, 1], [160 * R, -200 * R]);
  const f0 = useTransform(p, [0, 1], [FLOATS[0].d * 0.45 * R, -FLOATS[0].d * 0.45 * R]);
  const f1 = useTransform(p, [0, 1], [FLOATS[1].d * 0.45 * R, -FLOATS[1].d * 0.45 * R]);
  const f2 = useTransform(p, [0, 1], [FLOATS[2].d * 0.45 * R, -FLOATS[2].d * 0.45 * R]);
  const f3 = useTransform(p, [0, 1], [FLOATS[3].d * 0.45 * R, -FLOATS[3].d * 0.45 * R]);
  const f4 = useTransform(p, [0, 1], [FLOATS[4].d * 0.45 * R, -FLOATS[4].d * 0.45 * R]);
  const fy = [f0, f1, f2, f3, f4];

  // pointer tilt on the stage
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 100, damping: 18 }), sy = useSpring(ry, { stiffness: 100, damping: 18 });
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set((0.5 - (e.clientY - r.top) / r.height) * 10);
  };

  const store = v.gallery[0];
  const products = v.gallery.slice(1, 1 + FLOATS.length);

  return (
    <div ref={ref} className="relative py-16 md:py-24">
      {/* giant name running behind, edge to edge */}
      <motion.div
        aria-hidden
        style={{ x: nameX }}
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(5rem,17vw,19rem)] font-bold uppercase leading-none text-transparent [-webkit-text-stroke:1px_rgba(242,255,60,0.16)]"
      >
        {v.name} · {v.name}
      </motion.div>

      <div className="relative grid items-center gap-10 px-4 md:px-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] 2xl:px-16">
        {/* ===== 3D stage ===== */}
        <div className={`relative ${flip ? "lg:order-2" : ""}`} style={{ perspective: 1600 }} onPointerMove={move} onPointerLeave={() => (rx.set(0), ry.set(0))}>
          <motion.div style={{ rotateX: sx, rotateY: sy, transformStyle: "preserve-3d" }} className="relative h-[95vw] max-h-[78vh] min-h-[360px] sm:h-[70vw] lg:h-[74vh]">
            {/* floor glow + ring */}
            <div className="pointer-events-none absolute inset-x-[10%] bottom-[-2%] h-[18%]" style={{ transform: "translateZ(-80px) rotateX(78deg)" }}>
              <div className="h-full w-full rounded-[50%] border-2 border-dashed border-volt/40 [animation:vs-spin_16s_linear_infinite]" />
            </div>
            <div className="pointer-events-none absolute inset-x-[25%] bottom-[4%] h-[14%] rounded-[50%] bg-volt/15 blur-3xl" />

            {/* the storefront, as a floating screen */}
            {store && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                <motion.button
                  onClick={() => onOpen(0)}
                  aria-label={`Open ${v.name} photos`}
                  style={{ rotateY: frameRY, rotateX: frameRX, y: frameY }}
                  className="group relative h-[86%]"
                >
                  <div className="relative h-full p-px" style={{ aspectRatio: "800 / 935", clipPath: cut(22), background: `linear-gradient(135deg, ${VOLT}, rgba(255,255,255,0.1) 40%, rgba(0,240,255,0.7))` }}>
                    <div className="relative h-full w-full overflow-hidden bg-[#0a0718]" style={{ clipPath: cut(22) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={store.src} alt={store.caption} className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0718]/80 via-transparent to-transparent" />
                      <span className="pointer-events-none absolute inset-x-0 h-px bg-volt/80 shadow-[0_0_14px_#f2ff3c] [animation:cs-sweep_3.6s_ease-in-out_infinite]" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 font-mono text-[10px] text-ink/85">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> STORE · LIVE
                        </span>
                        <span className="text-volt">▣ {v.gallery.length} · open</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>
            )}

            {/* product shots floating at different depths */}
            {products.map((g, k) => {
              const f = FLOATS[k];
              return (
                <motion.button
                  key={g.src}
                  onClick={() => onOpen(k + 1)}
                  aria-label={g.caption}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.2 + k * 0.1 }}
                  whileHover={{ scale: 1.08 }}
                  style={{ left: `${f.l}%`, top: `${f.t}%`, width: `${f.w}%`, y: fy[k], z: f.z, rotate: f.r }}
                  className="group absolute aspect-square shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]"
                >
                  <div className="h-full w-full p-px" style={{ clipPath: cut(12), background: "rgba(242,255,60,0.5)" }}>
                    <div className="h-full w-full overflow-hidden bg-[#0a0718]" style={{ clipPath: cut(12) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sm(g.src)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* ===== dossier ===== */}
        <div className={`relative ${flip ? "lg:order-1" : ""}`}>
          <motion.div aria-hidden style={{ y: idxY }} className="pointer-events-none absolute -top-16 right-0 font-display text-[clamp(6rem,14vw,13rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(242,255,60,0.25)]">
            0{vi + 1}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: flip ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ type: "spring", stiffness: 90, damping: 18 }} className="relative">
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <span className="px-2 py-0.5 font-bold text-void" style={{ background: VOLT }}>
                VENTURE 0{vi + 1}
              </span>
              <span className="text-volt">{v.period}</span>
            </div>
            <h3 className="mt-3 whitespace-nowrap font-display text-[clamp(1.7rem,3.4vw,4.2rem)] font-bold uppercase leading-[0.9]">{v.name}</h3>
            <div className="mt-2 font-display text-lg uppercase tracking-[0.2em] text-cyan">{v.role}</div>

            {/* stats */}
            <div className="mt-7 grid grid-cols-3 gap-2 md:gap-3">
              {v.stats.map((s, k) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 24, rotateX: -50 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + k * 0.1, type: "spring", stiffness: 140, damping: 16 }}
                  style={{ transformPerspective: 700 }}
                >
                  <div className="h-full p-px" style={{ clipPath: cut(12), background: "rgba(242,255,60,0.35)" }}>
                    <div className="h-full bg-[#0b0818] p-3" style={{ clipPath: cut(12) }}>
                      <div className="font-display text-[clamp(1.1rem,2.2vw,2.1rem)] font-bold leading-none text-volt drop-shadow-[0_0_14px_rgba(242,255,60,0.4)]">{s.value}</div>
                      <div className="mt-1.5 text-[11px] leading-snug text-dim">{s.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <ul className="mt-7 space-y-2.5 text-[15px] text-ink/85">
              {v.highlights.map((h, k) => (
                <motion.li key={h} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + k * 0.08 }} className="flex gap-3">
                  <span className="text-volt">▸</span>
                  <span>{h}</span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-void transition hover:shadow-[0_0_34px_-4px_#f2ff3c]"
                style={{ background: VOLT, clipPath: cut(12) }}
              >
                ⌂ Visit the shop ↗
              </a>
              <button onClick={() => onOpen(0)} className="border border-volt/50 px-5 py-3 font-mono text-xs text-volt transition hover:bg-volt/10" style={{ clipPath: cut(12) }}>
                ▣ {v.gallery.length} photos
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Ventures() {
  const [viewer, setViewer] = useState<{ v: number; index: number } | null>(null);
  const active = viewer ? ventures[viewer.v] : undefined;
  const reduce = useReducedMotion();
  const R = reduce ? 0 : 1;

  const sec = useRef<HTMLElement>(null);
  const { scrollYProgress: sp } = useScroll({ target: sec, offset: ["start end", "end start"] });
  const kY = useTransform(sp, [0, 1], [200 * R, -900 * R]);
  const head = useRef<HTMLDivElement>(null);
  const { scrollYProgress: hp } = useScroll({ target: head, offset: ["start end", "end start"] });
  const aX = useTransform(hp, [0, 1], ["-8%", "6%"]);
  const bX = useTransform(hp, [0, 1], ["8%", "-10%"]);

  return (
    <section data-covers-face id="ventures" ref={sec} className="relative overflow-clip pb-16 pt-24">
      {/* pinned backdrop: a gold-lit market floor */}
      <div aria-hidden className="pointer-events-none sticky top-0 z-0 -mb-[100vh] h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(242,255,60,0.13),transparent_55%),linear-gradient(to_bottom,rgba(6,5,12,0.92),rgba(6,5,12,0.84))]" />
        <div className="absolute inset-x-[-40%] bottom-[-6%] h-[55%] [perspective:520px]">
          <div className="vt-floor h-full w-full origin-bottom [transform:rotateX(72deg)]" />
        </div>
        <motion.div style={{ y: kY }} className="absolute right-[3%] top-[15%] font-jp text-[clamp(4rem,8vw,8rem)] font-bold leading-none text-volt/[0.05] [writing-mode:vertical-rl]">
          ビジネス・商売・起業家
        </motion.div>
      </div>

      <div className="relative z-10">
        {/* giant title */}
        <div ref={head} className="px-4 md:px-10 2xl:px-16">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.35em] text-volt">
            <span className="h-px w-10 bg-volt" />
            05 {"//"} <span className="font-jp">ビジネス</span>
            <span className="ml-auto hidden tracking-[0.2em] text-dim md:inline">REAL STORES · REAL ORDERS</span>
          </div>
          <h2 className="mt-3 font-display font-bold uppercase leading-[0.8] tracking-tight">
            <motion.span style={{ x: aX }} className="block whitespace-nowrap text-[clamp(3rem,15vw,17rem)] text-transparent [-webkit-text-stroke:1.5px_rgba(242,255,60,0.7)]">
              Side
            </motion.span>
            <motion.span style={{ x: bX }} className="block text-right">
              <span className="glitch inline-block whitespace-nowrap text-[clamp(2.6rem,12.5vw,15rem)] text-ink drop-shadow-[0_0_40px_rgba(242,255,60,0.35)]" data-text="Businesses">
                Businesses
              </span>
            </motion.span>
          </h2>
          <p className="mt-4 max-w-md text-ink/70">I don&apos;t just build storefronts. I run them.</p>
        </div>

        {ventures.map((v, vi) => (
          <Venture key={v.name} v={v} vi={vi} onOpen={(index) => setViewer({ v: vi, index })} />
        ))}
      </div>

      <Lightbox
        shots={active?.gallery ?? []}
        index={active ? viewer!.index : null}
        title={active?.name ?? ""}
        onClose={() => setViewer(null)}
        onIndex={(index) => viewer && setViewer({ ...viewer, index })}
      />
    </section>
  );
}
