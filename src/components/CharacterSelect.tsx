"use client";

import { sm } from "@/lib/img";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { character, experience, projects, site, skills, type Proof } from "@/content/profile";
import { fileUrl, useVaultSession } from "@/lib/vault/client";

/* ---------- media viewer (photos + muted looping clips) ---------- */

function Viewer({ items, index, title, onClose, onIndex }: { items: Proof[]; index: number | null; title: string; onClose: () => void; onIndex: (i: number) => void }) {
  const open = index !== null;
  const i = index ?? 0;
  const go = useCallback((d: number) => onIndex((i + d + items.length) % items.length), [i, items.length, onIndex]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, go, onClose]);
  const it = items[i];
  return (
    <AnimatePresence>
      {open && it && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col bg-void/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={title}
          onClick={onClose}
        >
          <div className="flex items-center justify-between px-4 py-3 font-mono text-xs text-dim" onClick={(e) => e.stopPropagation()}>
            <span>
              <span className="text-cyan">{title}</span> · {i + 1}/{items.length}
            </span>
            <button onClick={onClose} className="border border-pink px-2 py-1 text-pink hover:bg-pink hover:text-void">
              close [esc]
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.div key={it.src} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full items-center justify-center">
                {it.video ? (
                  <video src={it.video} poster={it.src} autoPlay loop muted playsInline disablePictureInPicture onVolumeChange={(e) => (e.currentTarget.muted = true)} className="max-h-full max-w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.src} alt={it.caption} className="max-h-full max-w-full object-contain" />
                )}
              </motion.div>
            </AnimatePresence>
            {items.length > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 border border-line bg-void/70 px-3 py-2 font-mono text-cyan hover:border-cyan md:left-4">
                  ←
                </button>
                <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 border border-line bg-void/70 px-3 py-2 font-mono text-cyan hover:border-cyan md:right-4">
                  →
                </button>
              </>
            )}
          </div>
          <div className="px-4 py-4 text-center text-sm text-ink/85" onClick={(e) => e.stopPropagation()}>
            {it.caption}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- stat radar ---------- */

function Radar({ stats }: { stats: { key: string; value: number }[] }) {
  const n = stats.length, R = 80, cx = 100, cy = 100;
  const pt = (k: number, r: number) => {
    const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = stats.map((s, k) => pt(k, (s.value / 100) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff2bd6" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={stats.map((_, k) => pt(k, R * f).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" />
      ))}
      {stats.map((s, k) => {
        const [x, y] = pt(k, R);
        const [lx, ly] = pt(k, R + 14);
        return (
          <g key={s.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#00f0ff" fontSize="9" fontFamily="monospace">
              {s.key}
            </text>
          </g>
        );
      })}
      <motion.polygon
        points={poly}
        fill="url(#radarFill)"
        stroke="#ff2bd6"
        strokeWidth="1.5"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.2 }}
        style={{ transformOrigin: "100px 100px", filter: "drop-shadow(0 0 8px rgba(255,43,214,0.6))" }}
      />
    </svg>
  );
}

/* ---------- HUD bits ---------- */

const RED = "#ff3b5c";

/** label with a slow "decoding" character scramble when it enters */
function Decode({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  // letters light up left → right with a cursor; hidden letters keep their space so nothing jumps
  const [n, setN] = useState(text.length);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, start = 0, armed = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || armed) return;
      armed = true;
      io.disconnect();
      const tick = (t: number) => {
        if (!start) start = t + delay;
        const k = Math.max(0, Math.min(1, (t - start) / 550));
        setN(Math.round(k * text.length));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      setN(0);
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, delay]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden style={{ opacity: i < n ? 1 : 0, transition: "opacity .15s" }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/** segmented "10-notch" bar like a game slider */
function Notches({ value, color = "#00f0ff", delay = 0 }: { value: number; color?: string; delay?: number }) {
  const on = Math.round(value / 10);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 10 }, (_, k) => (
        <motion.span
          key={k}
          className="h-[5px] flex-1 rounded-[1px]"
          initial={{ backgroundColor: "rgba(255,255,255,0.07)" }}
          whileInView={{ backgroundColor: k < on ? color : "rgba(255,255,255,0.07)", boxShadow: k < on ? `0 0 6px ${color}` : "none" }}
          viewport={{ once: true }}
          transition={{ delay: delay + k * 0.04 }}
        />
      ))}
    </div>
  );
}

/** where the face sits in each costume shot (left, top, width, height in %) */
const FACE: Record<string, [number, number, number, number]> = { now: [26, 26, 33, 26], aitchison: [35, 1, 27, 24], rugby: [29, 17, 25, 22] };

const STAT_ICON: Record<string, string> = { INT: "🧠", STR: "🏉", CHA: "🗣", DEX: "⚡", WIS: "📈", VIT: "🫀" };
const STEPS = [
  ["BIRTH RECORD", "origin logged"],
  ["BACKGROUND CHECK", "Aitchison → Seneca"],
  ["BIOMETRIC SCAN", "verified"],
  ["APPEARANCE", "3 looks"],
  ["BIOSTATS", "6 attributes"],
] as const;

/* ---------- 3D / cyberpunk primitives ---------- */

/** chamfered (cut-corner) outline — the Night City panel shape */
const cut = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;

function Chamfer({
  children,
  className = "",
  inner = "",
  edge = "rgba(255,255,255,0.14)",
  fill = "rgba(9,7,22,0.84)",
  n = 16,
  style,
}: {
  children: ReactNode;
  className?: string;
  inner?: string;
  edge?: string;
  fill?: string;
  n?: number;
  style?: CSSProperties;
}) {
  return (
    <div className={`relative p-px ${className}`} style={{ clipPath: cut(n), background: edge, ...style }}>
      <div className={`relative h-full w-full ${inner}`} style={{ clipPath: cut(n), background: fill }}>
        {children}
      </div>
    </div>
  );
}

/** pointer-driven 3D tilt; children opt into depth with translateZ */
function Tilt3D({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 110, damping: 18 }), sy = useSpring(ry, { stiffness: 110, damping: 18 });
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
    rx.set((0.5 - (e.clientY - r.top) / r.height) * max * 2);
  };
  return (
    <div className={className} style={{ perspective: 1600 }} onPointerMove={move} onPointerLeave={() => (rx.set(0), ry.set(0))}>
      <motion.div style={{ rotateX: sx, rotateY: sy, transformStyle: "preserve-3d" }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}

/** trophy card: tilts toward the pointer with a holographic sheen */
function HoloCard({ children, onClick, edge, label }: { children: ReactNode; onClick: () => void; edge: string; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: RPointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.transform = `rotateX(${(0.5 - y) * 16}deg) rotateY(${(x - 0.5) * 18}deg) translateZ(30px)`;
  };
  return (
    <div style={{ perspective: 900 }}>
      <button
        ref={ref}
        onClick={onClick}
        onPointerMove={move}
        onPointerLeave={() => ref.current && (ref.current.style.transform = "")}
        aria-label={label}
        className="group relative block w-full p-px text-left transition-transform duration-200 ease-out hover:shadow-[0_0_40px_-10px_rgba(255,59,92,0.8)]"
        style={{ clipPath: cut(18), background: edge }}
      >
        <div className="relative h-full w-full overflow-hidden bg-[#0a0718]" style={{ clipPath: cut(18) }}>
          {children}
          <span className="holo-shine" />
        </div>
      </button>
    </div>
  );
}

/** tick ruler under chapter titles */
function Ruler() {
  return (
    <div className="relative mt-4 flex h-3 items-end justify-between">
      {Array.from({ length: 64 }, (_, k) => (
        <motion.span
          key={k}
          className="w-px"
          style={{ height: k % 8 ? 5 : 12, background: k % 8 ? "rgba(255,255,255,0.18)" : RED }}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ delay: k * 0.008 }}
        />
      ))}
    </div>
  );
}

/** full-width chapter header with a giant parallax index behind it */
function Chapter({ no, kicker, jp, title, right }: { no: string; kicker: string; jp: string; title: string; right?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-14%"]);
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  return (
    <div ref={ref} className="relative mb-10">
      <motion.div
        aria-hidden
        style={{ x, y }}
        className="pointer-events-none absolute -top-16 right-0 select-none font-display text-[clamp(7rem,24vw,22rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,59,92,0.16)]"
      >
        {no}
      </motion.div>
      <div className="relative flex items-center gap-3 font-mono text-[11px] tracking-[0.35em]" style={{ color: RED }}>
        <span className="h-px w-10" style={{ background: RED }} />
        {no} {"//"} {kicker} <span className="hidden font-jp md:inline">· {jp}</span>
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <h3 className="mt-2 font-display text-[clamp(3rem,9vw,8rem)] font-bold uppercase leading-[0.88] tracking-tight">
          <Decode text={title} />
        </h3>
        {right}
      </div>
      <Ruler />
    </div>
  );
}

const colsNow = () => (innerWidth >= 1280 ? 4 : innerWidth >= 768 ? 3 : 2);
const useCols = () =>
  useSyncExternalStore(
    (cb) => {
      addEventListener("resize", cb);
      return () => removeEventListener("resize", cb);
    },
    colsNow,
    () => 4,
  );

/* ---------- section ---------- */

export function CharacterSelect() {
  const reduce = useReducedMotion();
  const R = reduce ? 0 : 1;
  const [costume, setCostume] = useState(0);
  const [arc, setArc] = useState(0);
  const [tab, setTab] = useState<"character" | "cyberware">("character");
  const [viewer, setViewer] = useState<{ title: string; items: Proof[]; index: number } | null>(null);
  const c = character.costumes[costume];
  const a = character.arcs[arc];
  const arcs = character.arcs;
  const open = (title: string, items: Proof[], index = 0) => {
    if (items.length) setViewer({ title, items, index });
  };
  const go = (d: number) => setArc((i) => (i + d + arcs.length) % arcs.length);
  const proofs = character.achievements.filter((x) => x.proof?.length);
  const badges = character.achievements.filter((x) => !x.proof?.length);
  const face = FACE[c.key] ?? FACE.now;

  // vault: classified training photos unlock in place
  const vault = useVaultSession();
  const classified: Proof[] = (vault?.docs ?? []).filter((d) => d.category === "gym").map((d) => ({ src: fileUrl(d.id), caption: "Classified · training archive" }));
  const training: Proof[] = [...character.training, ...classified];
  // arc photos kept in the vault: blurred stand-ins until the key is entered
  const arcDocs = new Map((vault?.docs ?? []).filter((d) => d.category === "arcs").map((d) => [d.name, d.id]));
  const resolve = (g: Proof): Proof & { locked?: boolean } => {
    if (!g.vault) return g;
    const id = arcDocs.get(g.vault);
    return id ? { ...g, src: fileUrl(id) } : { ...g, locked: true };
  };
  const shotsOf = (list: Proof[]) => list.map(resolve);
  const viewable = (list: Proof[]) => shotsOf(list).filter((g) => !g.locked);
  const aShots = shotsOf(a.gallery);
  const aView = aShots.filter((g) => !g.locked);
  const aLocked = aShots.length - aView.length;

  /* --- scroll rigs --- */
  const sec = useRef<HTMLElement>(null);
  const { scrollYProgress: sp } = useScroll({ target: sec, offset: ["start end", "end start"] });
  const k1 = useTransform(sp, [0, 1], [200 * R, -900 * R]);
  const k2 = useTransform(sp, [0, 1], [-100 * R, -1600 * R]);
  const d1 = useTransform(sp, [0, 1], [0, -500 * R]);
  const d2 = useTransform(sp, [0, 1], [0, -1200 * R]);
  const d3 = useTransform(sp, [0, 1], [0, -2200 * R]);
  const depth = [d1, d2, d3];

  // console boots as it rises out of the projects reel
  const consoleRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: cp } = useScroll({ target: consoleRef, offset: ["start end", "start 0.15"] });
  const cps = useSpring(cp, { stiffness: 140, damping: 26 });
  const cOp = useTransform(cps, [0, 0.5], [0.25, 1]);
  const cRot = useTransform(cps, [0, 1], [18 * R, 0]);
  const cY = useTransform(cps, [0, 1], [120 * R, 0]);
  const beam = useTransform(cps, [0, 0.95, 1], [1, 1, 0]);

  // giant title splits apart with scroll
  const titleRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: tp } = useScroll({ target: titleRef, offset: ["start end", "end start"] });
  const tL = useTransform(tp, [0, 1], ["2%", "-3%"]);
  const tR = useTransform(tp, [0, 1], ["-2%", "3%"]);

  // bridge band from projects
  const band = useRef<HTMLDivElement>(null);
  const { scrollYProgress: bp } = useScroll({ target: band, offset: ["start end", "end start"] });
  const mx1 = useTransform(bp, [0, 1], ["0%", "-35%"]);
  const mx2 = useTransform(bp, [0, 1], ["-35%", "0%"]);
  const fill = useTransform(bp, [0.1, 0.7], ["0%", "100%"]);

  // story mode backdrop parallax
  const story = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stp } = useScroll({ target: story, offset: ["start end", "end start"] });
  const bgY = useTransform(stp, [0, 1], ["-12%", "12%"]);
  const bgS = useTransform(stp, [0, 0.5, 1], [1.25, 1.1, 1.25]);
  const epX = useTransform(stp, [0, 1], ["-8%", "8%"]);
  const flowRot = useTransform(stp, [0, 0.4, 1], [18 * R, 0, -10 * R]);

  // trophy wall: tips up from the floor, columns drift at different speeds
  const wall = useRef<HTMLDivElement>(null);
  const { scrollYProgress: wp } = useScroll({ target: wall, offset: ["start end", "end start"] });
  const cols = useCols();
  const W = cols >= 3 ? R : 0; // phones: no tilt / column drift (it only opens gaps on a narrow screen)
  const wallTilt = useTransform(wp, [0, 0.35], [30 * W, 0]);
  const wallZ = useTransform(wp, [0, 0.35], [-200 * W, 0]);
  const col0 = useTransform(wp, [0, 1], [90 * W, -90 * W]);
  const col1 = useTransform(wp, [0, 1], [20 * W, -20 * W]);
  const col2 = useTransform(wp, [0, 1], [140 * W, -140 * W]);
  const col3 = useTransform(wp, [0, 1], [50 * W, -50 * W]);
  const colY: MotionValue<number>[] = [col0, col1, col2, col3];
  const columns: { x: (typeof proofs)[number]; k: number }[][] = Array.from({ length: cols }, () => []);
  proofs.forEach((x, k) => columns[k % cols].push({ x, k }));

  // swipe on the episode deck
  const swipe = useRef(0);

  return (
    <section data-covers-face id="character" ref={sec} className="relative overflow-clip pb-28">
      {/* ======= the world: one pinned 3D backdrop behind every chapter ======= */}
      <div aria-hidden className="pointer-events-none sticky top-0 z-0 -mb-[100vh] h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(255,59,92,0.22),transparent_55%),radial-gradient(ellipse_at_15%_0%,rgba(0,240,255,0.08),transparent_45%),linear-gradient(to_bottom,rgba(6,5,12,0.93),rgba(6,5,12,0.86))]" />
        <div className="absolute inset-x-[-40%] bottom-[-6%] h-[62%] [perspective:520px]">
          <div className="cs-floor h-full w-full origin-bottom [transform:rotateX(72deg)]" />
        </div>
        <div className="absolute inset-x-0 top-[38%] h-px bg-gradient-to-r from-transparent via-[#ff3b5c]/50 to-transparent shadow-[0_0_30px_6px_rgba(255,59,92,0.25)]" />
        <motion.div style={{ y: k1 }} className="absolute left-[2%] top-[10%] font-jp text-[clamp(4rem,9vw,9rem)] font-bold leading-none text-white/[0.035] [writing-mode:vertical-rl]">
          キャラクター選択
        </motion.div>
        <motion.div style={{ y: k2 }} className="absolute right-[3%] top-[30%] font-jp text-[clamp(3rem,6vw,6rem)] font-bold leading-none text-[#ff3b5c]/[0.07] [writing-mode:vertical-rl]">
          ナイトシティ・生体記録・実績
        </motion.div>
        {Array.from({ length: 30 }, (_, k) => (
          <motion.span
            key={k}
            style={{ y: depth[k % 3], left: `${(k * 37) % 100}%`, top: `${20 + ((k * 53) % 160)}%`, opacity: 0.25 + (k % 3) * 0.25 }}
            className={`absolute rounded-full ${k % 3 === 2 ? "h-1.5 w-1.5" : "h-1 w-1"} ${k % 2 ? "bg-cyan shadow-[0_0_8px_#00f0ff]" : "bg-[#ff3b5c] shadow-[0_0_8px_#ff3b5c]"}`}
          />
        ))}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)]" />
      </div>

      <div className="relative z-10">
        {/* ======= bridge from projects ======= */}
        <div ref={band} aria-hidden className="relative overflow-hidden border-y border-white/5 py-6">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,59,92,0.07)_0px,rgba(255,59,92,0.07)_2px,transparent_2px,transparent_14px)]" />
          <motion.div style={{ x: mx1 }} className="whitespace-nowrap font-display text-[clamp(3rem,9vw,8rem)] font-bold uppercase leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,59,92,0.6)]">
            {"Loading player data · キャラクター選択 · Character select · ".repeat(4)}
          </motion.div>
          <motion.div style={{ x: mx2 }} className="mt-1 whitespace-nowrap font-mono text-[11px] tracking-[0.5em] text-dim">
            {"// SYNCING BIOMETRICS ··· DECRYPTING STATS ··· MOUNTING CYBERWARE ··· ".repeat(6)}
          </motion.div>
          <div className="relative mx-4 mt-4 h-px bg-white/10 md:mx-10">
            <motion.div style={{ width: fill, background: RED }} className="h-full shadow-[0_0_12px_#ff3b5c]" />
          </div>
        </div>

        <div className="px-4 md:px-10 2xl:px-16">
          {/* ======= giant split title — fills the width ======= */}
          <div ref={titleRef} className="relative pb-6 pt-14">
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.35em]" style={{ color: RED }}>
              <span className="h-px w-10" style={{ background: RED }} />
              04 {"//"} <span className="font-jp">キャラクター選択</span>
              <span className="ml-auto hidden tracking-[0.2em] text-dim md:inline">PLAYER 1 · PRESS START</span>
            </div>
            <h2 className="mt-3 font-display font-bold uppercase leading-[0.8] tracking-tight">
              <motion.span style={{ x: tL }} className="block whitespace-nowrap text-[clamp(2.8rem,12.5vw,15rem)] text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.6)]">
                <Decode text="Character" />
              </motion.span>
              <motion.span style={{ x: tR }} className="block text-right">
                <span className="glitch inline-block text-[clamp(2.8rem,12.5vw,15rem)] text-ink drop-shadow-[0_0_40px_rgba(255,59,92,0.45)]" data-text="Select">
                  Select
                </span>
              </motion.span>
            </h2>
            <p className="mt-4 max-w-sm text-ink/70 md:-mt-[10vw] md:max-w-md">
              The human behind the commits. Stats are for fun — the achievements and photos are real.
            </p>
          </div>

          {/* ======= console ======= */}
          <div ref={consoleRef} style={{ perspective: 1800 }} className="mt-[6vw]">
            <motion.div style={{ rotateX: cRot, y: cY, opacity: cOp, transformOrigin: "50% 0%" }} className="relative">
              <motion.div style={{ opacity: beam }} className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#ff3b5c] to-transparent shadow-[0_0_24px_4px_rgba(255,59,92,0.6)]" />

              {/* HUD top bar */}
              <Chamfer n={18} edge="linear-gradient(90deg,rgba(255,59,92,0.7),rgba(255,255,255,0.12) 30%,rgba(0,240,255,0.5))" inner="px-4 py-3 md:px-6">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-cyan">{Math.round(character.stats.reduce((n, x) => n + x.value, 0) / character.stats.length)}</span>
                    <span className="tracking-widest text-dim">AVG STAT</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-ok">{character.achievements.length}</span>
                    <span className="tracking-widest text-dim">STREET CRED</span>
                  </div>
                  <div className="order-last -mx-1 flex w-full justify-start gap-1 overflow-x-auto px-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:justify-center">
                    {(
                      [
                        ["character", "CHARACTER"],
                        ["cyberware", "CYBERWARE"],
                      ] as const
                    ).map(([k, l], i) => (
                      <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`flex shrink-0 items-center gap-2 px-3 py-1 tracking-[0.2em] transition ${tab === k ? "bg-cyan/10 text-cyan shadow-[inset_0_0_0_1px_rgba(0,240,255,0.5)]" : "text-dim hover:text-ink"}`}
                      >
                        <span className="border border-current px-1 text-[9px]">{i + 1}</span>
                        {l}
                      </button>
                    ))}
                    <a href="#episodes" className="shrink-0 px-3 py-1 tracking-[0.2em] text-dim hover:text-ink">
                      STORY
                    </a>
                    <a href="#trophies" className="shrink-0 px-3 py-1 tracking-[0.2em] text-dim hover:text-ink">
                      TROPHIES
                    </a>
                  </div>
                  <div className="ml-auto flex gap-5 text-dim md:ml-0">
                    <span>
                      <span className="text-ink">{projects.length}</span> PROJECTS
                    </span>
                    <span>
                      <span className="text-ink">{experience.length}</span> ROLES
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {STEPS.map(([l, sub], k) => (
                    <div key={l}>
                      <div className="h-1 overflow-hidden bg-white/5">
                        <motion.div
                          className="h-full"
                          style={{ background: k === 2 ? RED : "#cfe9ff" }}
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + k * 0.35, duration: 0.5 }}
                        />
                      </div>
                      <div className={`mt-1 truncate font-mono text-[9px] tracking-widest md:text-[10px] ${k === 2 ? "text-[#ff3b5c]" : "text-ink/80"}`}>{l}</div>
                      <div className="hidden truncate font-mono text-[9px] text-dim md:block">{sub}</div>
                    </div>
                  ))}
                </div>
              </Chamfer>

              {/* console body — 3D layered */}
              <AnimatePresence mode="wait">
                {tab === "character" ? (
                  <motion.div key="character" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}>
                    <Tilt3D className="mt-4" max={4}>
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] [transform-style:preserve-3d]">
                        {/* left: attribute slots */}
                        <div className="order-2 lg:order-1" style={{ transform: "translateZ(30px)" }}>
                          <Chamfer className="h-full" inner="space-y-2 p-4">
                            <div className="flex justify-between font-mono text-[10px] tracking-[0.35em] text-dim">
                              ATTRIBUTES <span className="tracking-normal">{character.stats.length} SLOTS</span>
                            </div>
                            {character.stats.map((s, i) => (
                              <motion.div
                                key={s.key}
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15 + i * 0.08 }}
                                className="group flex items-center gap-3 border border-white/10 bg-white/[0.02] p-2.5 transition hover:border-[#ff3b5c]/70 hover:bg-[#ff3b5c]/[0.05]"
                                style={{ clipPath: cut(10) }}
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-void/60 text-lg transition group-hover:scale-110">{STAT_ICON[s.key]}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline justify-between">
                                    <span className="font-display text-sm font-bold tracking-wider" style={{ color: RED }}>
                                      {s.key}
                                    </span>
                                    <span className="font-display text-xl font-bold text-ink">{s.value}</span>
                                  </div>
                                  <div className="truncate font-mono text-[10px] text-dim">{s.label}</div>
                                  <div className="mt-1">
                                    <Notches value={s.value} delay={0.3 + i * 0.08} color={i % 2 ? "#ff2bd6" : "#00f0ff"} />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </Chamfer>
                        </div>

                        {/* centre: portrait under biometric scan, floating forward */}
                        <div className="relative order-1 lg:order-2" style={{ transform: "translateZ(70px)", transformStyle: "preserve-3d" }}>
                          {/* holo rings behind */}
                          <div className="pointer-events-none absolute inset-x-[-6%] bottom-[2%] h-[30%]" style={{ transform: "translateZ(-60px) rotateX(78deg)" }}>
                            <div className="h-full w-full rounded-[50%] border-2 border-dashed border-cyan/40 [animation:vs-spin_14s_linear_infinite]" />
                            <div className="absolute inset-[12%] rounded-[50%] border border-[#ff3b5c]/50 [animation:vs-spin_9s_linear_infinite_reverse]" />
                          </div>
                          <div data-portrait className="relative mx-auto aspect-[3/4] w-full max-w-[calc(80vh*0.75)] overflow-hidden" style={{ clipPath: cut(26) }}>
                            <AnimatePresence mode="popLayout">
                              <motion.img
                                key={c.src}
                                src={c.src}
                                alt={`${site.name} — ${c.label}`}
                                className="absolute inset-0 h-full w-full object-cover"
                                style={{ objectPosition: c.pos }}
                                initial={{ opacity: 0, scale: 1.12, filter: "blur(10px) hue-rotate(90deg) saturate(2)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px) hue-rotate(0deg) saturate(1)" }}
                                exit={{ opacity: 0, filter: "blur(10px)" }}
                                transition={{ duration: 0.5 }}
                              />
                            </AnimatePresence>
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(6,3,18,0.95)_0%,transparent_42%),linear-gradient(to_right,rgba(255,59,92,0.1),transparent_40%)]" />
                            <motion.div
                              data-scan
                              key={`scan-${costume}`}
                              className="pointer-events-none absolute border"
                              style={{ left: `${face[0]}%`, top: `${face[1]}%`, width: `${face[2]}%`, height: `${face[3]}%`, borderColor: RED, boxShadow: `0 0 18px -2px ${RED}, inset 0 0 18px -6px ${RED}` }}
                              initial={{ opacity: 0, scale: 1.4 }}
                              animate={{ opacity: [0, 1, 0.6, 1], scale: 1 }}
                              transition={{ duration: 0.7 }}
                            >
                              <span className="absolute -bottom-5 left-0 whitespace-nowrap font-mono text-[9px] tracking-widest" style={{ color: RED }}>
                                BIOMETRIC MATCH · 99.7%
                              </span>
                              <motion.span className="absolute inset-x-0 h-px" style={{ background: RED }} animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
                            </motion.div>
                            {["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "left-3 bottom-3 border-b border-l", "right-3 bottom-3 border-b border-r"].map((k) => (
                              <span key={k} className={`pointer-events-none absolute h-6 w-6 border-cyan ${k}`} />
                            ))}
                            <div className="absolute inset-x-0 bottom-0 p-5">
                              <div className="font-mono text-[10px] tracking-[0.3em] text-volt">PLAYER 1 · {c.label.toUpperCase()}</div>
                              <div className="glitch font-display text-5xl font-bold uppercase leading-none" data-text={site.short}>
                                {site.short}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* right: detailed bio query */}
                        <div className="order-3" style={{ transform: "translateZ(30px)" }}>
                          <Chamfer className="h-full" inner="space-y-4 p-4">
                            <div className="font-mono text-[10px] tracking-[0.35em] text-dim">DETAILED BIO QUERY</div>
                            <div className="grid grid-cols-3 gap-2">
                              {character.costumes.map((k, i) => (
                                <button
                                  key={k.key}
                                  onClick={() => setCostume(i)}
                                  aria-pressed={i === costume}
                                  title={k.label}
                                  className={`group relative aspect-square overflow-hidden border-2 transition ${i === costume ? "border-[#ff3b5c] shadow-[0_0_18px_-4px_#ff3b5c]" : "border-white/10 opacity-60 hover:opacity-100"}`}
                                  style={{ clipPath: cut(10) }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={sm(k.src)} alt="" loading="lazy" decoding="async" style={{ objectPosition: k.pos }} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                                </button>
                              ))}
                            </div>
                            <div className="font-mono text-[10px] text-dim">
                              LOOK · <span className="text-ink">{c.label}</span>
                            </div>
                            <div className="space-y-2.5 border-t border-white/10 pt-3 font-mono text-[11px]">
                              {[
                                ["HANDLE", site.short],
                                ["CLASS", character.className],
                                ["ORIGIN", character.origin],
                                ["BASE", site.location],
                                ["STATUS", "Open to work"],
                              ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-3">
                                  <span className="text-dim">{k}</span>
                                  <span className={`text-right ${k === "STATUS" ? "text-ok" : "text-ink"}`}>{v}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mx-auto aspect-square w-44">
                              <Radar stats={character.stats} />
                            </div>
                          </Chamfer>
                        </div>
                      </div>
                    </Tilt3D>
                  </motion.div>
                ) : (
                  <motion.div key="cyberware" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="mt-4">
                    <div className="mb-3 flex items-baseline justify-between font-mono text-[10px] text-dim">
                      <span className="tracking-[0.35em]">INSTALLED CYBERWARE · SKILLS</span>
                      <span>
                        {Object.values(skills).flat().length} modules · {Object.keys(skills).length} systems
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(skills).map(([branch, list], i) => (
                        <motion.div key={branch} initial={{ opacity: 0, y: 20, rotateX: -25 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.08 }} style={{ transformPerspective: 900 }}>
                          <Chamfer className="h-full">
                            <div className="flex items-center justify-between border-b border-white/10 bg-cyan/[0.06] px-3 py-2">
                              <span className="font-display text-sm font-bold uppercase tracking-wider text-cyan">{branch}.SYSTEM</span>
                              <span className="bg-cyan/15 px-1.5 font-mono text-[10px] text-cyan">INSTALLED {list.length}</span>
                            </div>
                            <ul className="divide-y divide-white/5">
                              {list.map((s, k) => (
                                <motion.li
                                  key={s}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.15 + i * 0.08 + k * 0.03 }}
                                  className="flex items-center gap-2 px-3 py-1.5 font-mono text-[12px] text-ink/85 transition hover:bg-[#ff3b5c]/[0.06] hover:text-ink"
                                >
                                  <span className="text-[9px]" style={{ color: RED }}>
                                    ▶
                                  </span>
                                  {s}
                                </motion.li>
                              ))}
                            </ul>
                          </Chamfer>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* ======= 04.2 STORY MODE — full-bleed, 3D episode deck ======= */}
        <div id="episodes" ref={story} className="relative mt-12 scroll-mt-16 overflow-hidden py-16">
          {/* full-bleed parallax backdrop of the current episode */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <AnimatePresence>
              {a.image && (
                <motion.div key={a.image} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                  <motion.img src={sm(a.image)} alt="" style={{ y: bgY, scale: bgS }} className="h-full w-full object-cover opacity-25" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,5,12,0.97)_0%,rgba(6,5,12,0.75)_45%,rgba(6,5,12,0.55)_100%),linear-gradient(to_bottom,rgba(6,5,12,1),transparent_18%,transparent_82%,rgba(6,5,12,1))]" />
            <div className="absolute inset-0 bg-[#ff3b5c]/10" />
            <motion.div style={{ x: epX }} className="absolute -bottom-[4vw] left-0 whitespace-nowrap font-display text-[clamp(8rem,30vw,30rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.08)]">
              EP.0{arc + 1}
            </motion.div>
          </div>

          <div className="relative px-4 md:px-10 2xl:px-16">
            <Chapter
              no="04.2"
              kicker="STORY MODE"
              jp="ストーリー"
              title="Episodes"
              right={
                <div className="flex gap-2">
                  <button onClick={() => go(-1)} aria-label="Previous episode" className="border border-white/20 px-4 py-2 font-mono text-cyan transition hover:border-cyan hover:bg-cyan/10" style={{ clipPath: cut(8) }}>
                    ◀
                  </button>
                  <button onClick={() => go(1)} aria-label="Next episode" className="border border-white/20 px-4 py-2 font-mono text-cyan transition hover:border-cyan hover:bg-cyan/10" style={{ clipPath: cut(8) }}>
                    ▶
                  </button>
                </div>
              }
            />

            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
              {/* episode info */}
              <div className="relative z-20 order-2 lg:order-1">
                <AnimatePresence mode="wait">
                  <motion.div key={arc} initial={{ opacity: 0, x: -30, filter: "blur(6px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: 30, filter: "blur(6px)" }} transition={{ duration: 0.35 }}>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="px-2 py-0.5 font-bold text-void" style={{ background: RED }}>
                        EP.0{arc + 1}
                      </span>
                      <span style={{ color: RED }}>{a.years}</span>
                    </div>
                    <h4 className="mt-3 font-display text-[clamp(2.4rem,4.6vw,4.6rem)] font-bold uppercase leading-[0.92]">{a.name}</h4>
                    <p className="mt-4 max-w-xl text-lg text-ink/85">{a.text}</p>
                    {aView.length > 0 && (
                      <button
                        onClick={() => open(a.name, aView)}
                        className="mt-6 inline-flex items-center gap-3 px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-void transition hover:shadow-[0_0_30px_-4px_#ff3b5c]"
                        style={{ background: RED, clipPath: cut(12) }}
                      >
                        ▣ Open memory · {aView.length}
                        {aLocked > 0 && <span className="opacity-70"> + {aLocked} 🔒</span>}
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
                {/* chapter list */}
                <div className="mt-8 space-y-1">
                  {arcs.map((x, i) => (
                    <button key={x.name} onClick={() => setArc(i)} className={`relative flex w-full items-center gap-4 px-3 py-2 text-left font-mono text-xs transition ${i === arc ? "text-ink" : "text-dim hover:text-ink"}`}>
                      {i === arc && <motion.span layoutId="ep-active" className="absolute inset-0 border-l-2 bg-[#ff3b5c]/10" style={{ borderColor: RED }} />}
                      <span className="relative w-10" style={{ color: i === arc ? RED : undefined }}>
                        0{i + 1}
                      </span>
                      <span className="relative flex-1 truncate uppercase tracking-wider">{x.name}</span>
                      <span className="relative hidden sm:inline">{x.years}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D coverflow deck */}
              <motion.div
                style={{ rotateX: flowRot, perspective: 1600 }}
                className="relative order-1 h-[56vw] max-h-[640px] min-h-[260px] touch-pan-y lg:order-2 lg:h-[46vw]"
                onPointerDown={(e) => (swipe.current = e.clientX)}
                onPointerUp={(e) => {
                  const d = e.clientX - swipe.current;
                  if (Math.abs(d) > 40) go(d < 0 ? 1 : -1);
                }}
              >
                {arcs.map((x, i) => {
                  let o = i - arc;
                  if (o > arcs.length / 2) o -= arcs.length;
                  if (o < -arcs.length / 2) o += arcs.length;
                  const ao = Math.abs(o);
                  return (
                    <motion.button
                      key={x.name}
                      onClick={() => (o === 0 ? open(x.name, viewable(x.gallery)) : setArc(i))}
                      aria-label={o === 0 ? `Open ${x.name} photos` : `Show ${x.name}`}
                      animate={{ x: `${o * 40}%`, rotateY: o * -45, z: -ao * 300, scale: o === 0 ? 1 : 0.78, opacity: ao > 1.5 ? 0 : o === 0 ? 1 : 0.4, filter: o === 0 ? "blur(0px) saturate(1)" : "blur(1.5px) saturate(0.4)" }}
                      transition={{ type: "spring", stiffness: 110, damping: 20 }}
                      style={{ zIndex: 10 - ao, pointerEvents: ao > 1.5 ? "none" : "auto" }}
                      className="absolute inset-y-0 left-[14%] w-[72%]"
                    >
                      <Chamfer n={28} className="h-full" edge={o === 0 ? `linear-gradient(135deg, ${RED}, rgba(0,240,255,0.7))` : "rgba(255,255,255,0.15)"} fill="#0a0718">
                        {x.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o === 0 ? x.image : sm(x.image)} alt={x.name} decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid-bg flex h-full w-full items-center justify-center font-mono text-xs text-dim">EP.0{i + 1} · photos coming soon</div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06050c]/95 via-transparent to-[#06050c]/30" />
                        <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] tracking-[0.3em] text-ink/80">MEMORY SHARD · 0{i + 1}</div>
                        <div className={`pointer-events-none absolute inset-x-0 bottom-0 p-5 text-left transition-opacity ${o === 0 ? "opacity-100" : "opacity-0"}`}>
                          <div className="font-mono text-[11px]" style={{ color: RED }}>
                            {x.years}
                          </div>
                          <div className="font-display text-2xl font-bold uppercase leading-tight md:text-3xl">{x.name}</div>
                          {o === 0 && x.gallery.length > 0 && <div className="mt-1 font-mono text-[10px] text-cyan">▣ tap to replay · {viewable(x.gallery).length}</div>}
                        </div>
                        {o === 0 && <span className="pointer-events-none absolute inset-x-0 h-px bg-cyan/80 shadow-[0_0_12px_#00f0ff] [animation:cs-sweep_3.2s_ease-in-out_infinite]" />}
                      </Chamfer>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            {/* film strip of the current episode */}
            {aShots.length > 1 && (
              <div className="relative mt-12 border-y border-dashed border-white/15 py-3">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {aShots.map((g, k) => (
                    <motion.button
                      key={g.src}
                      onClick={() => (g.locked ? document.getElementById("vault")?.scrollIntoView({ behavior: "smooth" }) : open(a.name, aView, aView.indexOf(g)))}
                      aria-label={g.locked ? `${g.caption} — locked, unlock the vault to view` : g.caption}
                      initial={{ opacity: 0, y: 30, rotateY: -40 }}
                      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: k * 0.05 }}
                      whileHover={{ y: -8, scale: 1.04 }}
                      style={{ clipPath: cut(10), transformPerspective: 800 }}
                      className={`group relative h-28 w-40 shrink-0 overflow-hidden border md:h-36 md:w-52 ${g.locked ? "border-[#ff3b5c]/50" : "border-white/10"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sm(g.src)} alt={g.locked ? "" : g.caption} loading="lazy" decoding="async" className={`h-full w-full object-cover transition duration-500 ${g.locked ? "scale-110 blur-md" : "grayscale-[40%] group-hover:scale-110 group-hover:grayscale-0"}`} />
                      {g.locked ? (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#06050c]/45 font-mono text-[9px] tracking-[0.25em] text-[#ff3b5c]">
                          <span className="text-xl">🔒</span>
                          CLASSIFIED
                          <span className="tracking-normal text-ink/70 group-hover:text-ink">unlock the vault</span>
                        </span>
                      ) : (
                        <span className="absolute bottom-1 left-2 font-mono text-[9px] text-ink/80">{String(k + 1).padStart(2, "0")}</span>
                      )}
                      {g.video && <span className="absolute right-1.5 top-1.5 bg-void/70 px-1.5 font-mono text-[10px] text-volt">▶</span>}
                      {g.vault && !g.locked && <span className="absolute right-1.5 top-1.5 bg-void/70 px-1.5 font-mono text-[9px] text-ok">DECRYPTED</span>}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======= 04.3 TROPHY ROOM — 3D wall with parallax columns ======= */}
        <div id="trophies" className="relative mt-24 scroll-mt-16 px-4 md:px-10 2xl:px-16">
          <Chapter
            no="04.3"
            kicker={`ACHIEVEMENTS UNLOCKED · ${character.achievements.length}`}
            jp="トロフィー"
            title="Trophy Room"
            right={
              <button onClick={() => open("Trophy room", [character.cabinet])} className="border border-volt/50 px-4 py-2 font-mono text-[11px] text-volt transition hover:bg-volt hover:text-void" style={{ clipPath: cut(8) }}>
                🏆 see the medal haul →
              </button>
            }
          />
          <div ref={wall} style={{ perspective: 1500 }}>
            <motion.div style={{ rotateX: wallTilt, z: wallZ, transformOrigin: "50% 100%" }} className="flex gap-3 md:gap-4">
              {columns.map((list, ci) => (
                <motion.div key={ci} style={{ y: colY[ci] }} className={`flex min-w-0 flex-1 flex-col gap-3 md:gap-4 ${ci % 2 && cols >= 3 ? "pt-16" : ""}`}>
                  {list.map(({ x, k }) => {
                    const proof = x.proof!;
                    return (
                      <motion.div
                        key={x.title}
                        initial={{ opacity: 0, y: 40, rotateX: -30 }}
                        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ type: "spring", stiffness: 120, damping: 18, delay: ci * 0.06 }}
                      >
                        <HoloCard onClick={() => open(x.title, proof)} label={`${x.title} — view proof`} edge={k % 3 === 0 ? `linear-gradient(135deg, ${RED}, rgba(255,255,255,0.1) 50%, #00f0ff)` : "rgba(255,255,255,0.14)"}>
                          <div className={`relative overflow-hidden ${k % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sm(proof[0].src)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-110 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0718] via-[#0a0718]/20 to-transparent" />
                            <span className="absolute right-3 top-3 bg-void/80 px-2 py-0.5 font-mono text-[10px] text-volt">
                              {proof.some((pp) => pp.video) ? "▶ " : "▣ "}
                              {proof.length}
                            </span>
                            <span className="absolute left-3 top-3 font-mono text-[9px] tracking-[0.3em] text-ink/70">#{String(k + 1).padStart(2, "0")}</span>
                          </div>
                          <div className="relative -mt-10 p-4">
                            <span className="text-3xl drop-shadow-[0_0_12px_rgba(255,59,92,0.7)]" aria-hidden>
                              {x.icon}
                            </span>
                            <div className="mt-1 font-display text-base font-bold uppercase leading-tight">{x.title}</div>
                            <div className="mt-0.5 text-[12px] text-dim">{x.detail}</div>
                          </div>
                        </HoloCard>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* achievement log — two counter-scrolling rails */}
          <div className="relative mt-16 space-y-3 md:mt-32 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="mb-2 font-mono text-[10px] tracking-[0.35em] text-dim">ACHIEVEMENT LOG · {badges.length} ENTRIES</div>
            <ul className="sr-only">
              {badges.map((x) => (
                <li key={x.title}>
                  {x.title} — {x.detail}
                </li>
              ))}
            </ul>
            {[0, 1].map((row) => {
              const list = badges.filter((_, i) => i % 2 === row);
              return (
                <div key={row} aria-hidden className="overflow-hidden">
                  <div className={`cs-marquee flex w-max gap-3 ${row ? "[animation-direction:reverse]" : ""}`}>
                    {[...list, ...list].map((x, i) => (
                      <div key={`${x.title}-${i}`} className="flex shrink-0 items-center gap-3 border border-white/10 bg-[#0a0718]/85 px-4 py-2.5 transition hover:border-[#ff3b5c]/60" style={{ clipPath: cut(10) }}>
                        <span className="text-xl">{x.icon}</span>
                        <div>
                          <div className="font-display text-[13px] font-semibold uppercase">{x.title}</div>
                          <div className="font-mono text-[10px] text-dim">{x.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 font-mono text-[11px] text-dim">{proofs.length} achievements have photo proof — click a card to see it.</p>
        </div>

        {/* ======= 04.4 SUBROUTINES — side missions + passives ======= */}
        <div className="relative mt-24 px-4 md:px-10 2xl:px-16">
          <Chapter no="04.4" kicker="SUBROUTINES" jp="サイドミッション" title="Side Ops" />
          <Tilt3D max={3}>
            <div className="grid gap-4 md:grid-cols-2 [transform-style:preserve-3d]">
              <div style={{ transform: "translateZ(20px)" }}>
                <Chamfer className="h-full" inner="p-6" edge="linear-gradient(135deg, rgba(61,255,154,0.6), rgba(255,255,255,0.1) 40%)">
                  <div className="font-mono text-[11px] tracking-[0.3em] text-ok">SIDE MISSIONS · COMMUNITY</div>
                  <ul className="mt-4 space-y-2.5 text-[15px] text-ink/85">
                    {character.community.map((x, i) => (
                      <motion.li key={x} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex gap-3">
                        <span className="font-mono text-ok">✓</span> {x}
                      </motion.li>
                    ))}
                  </ul>
                </Chamfer>
              </div>
              <div style={{ transform: "translateZ(40px)" }}>
                <Chamfer className="h-full" inner="p-6" edge={`linear-gradient(135deg, ${RED}, rgba(255,255,255,0.1) 40%)`}>
                  <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.3em]" style={{ color: RED }}>
                    PASSIVE ABILITIES
                    {classified.length > 0 && <span className="tracking-normal text-ok">🔓 vault decrypted</span>}
                  </div>
                  <ul className="mt-4 space-y-2.5 text-[15px] text-ink/85">
                    {character.extras.map((x) => (
                      <li key={x} className="flex gap-3">
                        <span className="text-volt">◆</span> {x}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-4">
                    <AnimatePresence>
                      {training.map((t, k) => (
                        <motion.button
                          key={t.src}
                          layout
                          initial={k >= character.training.length ? { opacity: 0, scale: 0.8, filter: "blur(10px)" } : false}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          transition={{ delay: k >= character.training.length ? (k - character.training.length) * 0.12 : 0 }}
                          onClick={() => open("Training", training, k)}
                          style={{ clipPath: cut(10) }}
                          className="group relative aspect-[3/4] overflow-hidden border border-white/10 hover:border-cyan"
                        >
                          {t.video ? (
                            <video src={t.video} poster={t.src} autoPlay loop muted playsInline preload="none" className="h-full w-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={sm(t.src)} alt={t.caption} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                          )}
                          {k >= character.training.length && <span className="absolute left-1.5 top-1.5 bg-void/70 px-1.5 font-mono text-[9px] text-ok">DECRYPTED</span>}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {!vault && (
                      <a
                        href="#vault"
                        style={{ clipPath: cut(10) }}
                        className="group relative flex aspect-[3/4] flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-[#ff3b5c]/50 bg-[#ff3b5c]/[0.05] text-center font-mono text-[10px] text-[#ff3b5c] transition hover:bg-[#ff3b5c]/10"
                      >
                        <span className="text-2xl">🔒</span>
                        CLASSIFIED
                        <span className="text-dim">unlock the vault</span>
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#ff3b5c] [animation:cs-sweep_2.8s_ease-in-out_infinite]" />
                      </a>
                    )}
                  </div>
                  <p className="mt-4 font-mono text-[11px] text-dim">
                    psst — there&apos;s a hidden level. try the konami code, or open the terminal (<kbd className="text-cyan">`</kbd>) and type{" "}
                    <span className="text-pink">sidequests</span>.
                  </p>
                </Chamfer>
              </div>
            </div>
          </Tilt3D>
        </div>
      </div>

      <Viewer
        items={viewer?.items ?? []}
        index={viewer ? viewer.index : null}
        title={viewer?.title ?? ""}
        onClose={() => setViewer(null)}
        onIndex={(index) => viewer && setViewer({ ...viewer, index })}
      />
    </section>
  );
}
