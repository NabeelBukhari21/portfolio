"use client";

import { useNear } from "@/lib/useNear";
import dynamic from "next/dynamic";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { education, experience, projects, type Project, type Role } from "@/content/profile";
import { stage } from "@/lib/stage";
import { buildGraph, KIND_COLOR, type GNode } from "./system/graph";

const SystemScene = dynamic(() => import("./system/SystemScene").then((m) => m.SystemScene), { ssr: false });

const LEGEND: [string, string][] = [
  ["cloud", KIND_COLOR.cloud],
  ["ai", KIND_COLOR.ai],
  ["app", KIND_COLOR.app],
  ["web", KIND_COLOR.web],
  ["data", KIND_COLOR.data],
  ["work", KIND_COLOR.work],
];

/* ---------- kinetic type helpers ---------- */

const CUT = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;
const RED = "#ff3b5c";

const stagger = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const rise = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 140, damping: 20 } },
};

/** big title: letters flip in one by one */
function BigTitle({ text, color }: { text: string; color: string }) {
  const words = text.split(" ");
  let n = 0;
  return (
    <h3 className="font-display text-[clamp(2.6rem,6vw,5.8rem)] font-bold uppercase leading-[0.9] tracking-tight [perspective:600px]" aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="mr-[0.22em] inline-block whitespace-nowrap" aria-hidden>
          {[...w].map((ch, ci) => {
            const k = n++;
            return (
              <motion.span
                key={ci}
                className="inline-block text-ink"
                style={{ textShadow: `-0.035em 0 ${color}cc, 0.035em 0 rgba(0,240,255,0.55), 0 0 40px ${color}55` }}
                initial={{ opacity: 0, y: "0.55em", rotateX: -85 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.08 + k * 0.022, type: "spring", stiffness: 220, damping: 18 }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h3>
  );
}

/** number that counts up */
function Counter({ to, label, color }: { to: number; label: string; color: string }) {
  const mv = useMotionValue(0);
  const shown = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(mv, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, to]);
  return (
    <motion.div variants={rise} className="p-px" style={{ clipPath: CUT(12), background: `linear-gradient(135deg, ${color}aa, rgba(255,255,255,0.08) 60%)` }}>
      <div className="relative h-full bg-[#07051a]/90 px-3 pb-2.5 pt-2" style={{ clipPath: CUT(12) }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-dim">{label}</div>
        <motion.div className="font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-none" style={{ color, textShadow: `0 0 30px ${color}66` }}>
          {shown}
        </motion.div>
        <div className="mt-2 flex gap-[2px]">
          {Array.from({ length: 12 }, (_, k) => (
            <span key={k} className="h-[3px] flex-1" style={{ background: k < 9 ? color : "rgba(255,255,255,0.08)", opacity: 0.35 + (k / 12) * 0.65 }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <motion.div variants={rise} className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color }}>
      <span className="h-px w-10" style={{ background: color }} />
      <span className="border px-2 py-0.5" style={{ borderColor: `${color}66`, background: `${color}12` }}>
        {children}
      </span>
    </motion.div>
  );
}

function WordCloud({ items, onPick }: { items: GNode[]; onPick: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <motion.div variants={rise} className="mt-7">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-dim">linked skills</div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {items.map((s, i) => (
          <motion.button
            key={s.id}
            onClick={() => onPick(s.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.04 }}
            className="font-display text-xl font-semibold transition hover:brightness-150 md:text-2xl"
            style={{ color: s.color }}
          >
            {s.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- detail per node type ---------- */

function Detail({ node, links, onPick, counts }: { node: GNode; links: GNode[]; onPick: (id: string) => void; counts: [number, number, number] }) {
  const skills = links.filter((n) => n.tier === 2);
  const work = links.filter((n) => n.tier === 1);

  if (node.kind === "core")
    return (
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <Eyebrow color="#f2ff3c">core · control plane</Eyebrow>
        <BigTitle text="The System" color={RED} />
        <motion.p variants={rise} className="mt-5 max-w-lg text-lg leading-relaxed text-ink/80 md:text-xl">
          A living map of my work. The brain is where it starts; the inner shell is every project and role, the outer shell every skill they used — light
          flows along the links between them.
        </motion.p>
        <motion.div variants={stagger} className="mt-8 grid max-w-lg grid-cols-3 gap-2.5">
          <Counter to={counts[0]} label="services" color="#00f0ff" />
          <Counter to={counts[1]} label="skills" color="#ff2bd6" />
          <Counter to={counts[2]} label="links" color="#a78bfa" />
        </motion.div>
        <motion.div variants={rise} className="mt-7 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-widest">
          {LEGEND.map(([k, col]) => (
            <span key={k} className="flex items-center gap-1.5 border px-2 py-1" style={{ borderColor: `${col}55`, color: col, background: `${col}0d` }}>
              <span className="h-1.5 w-1.5" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />
              {k}
            </span>
          ))}
        </motion.div>
        <motion.div variants={rise} className="mt-5 grid max-w-lg grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px] text-dim sm:grid-cols-4">
          {[
            ["DRAG", "spin"],
            ["HOVER", "trace"],
            ["CLICK", "focus"],
            ["HEAD", "neural link"],
          ].map(([k, v]) => (
            <span key={k}>
              <span style={{ color: RED }}>{k}</span> {v}
            </span>
          ))}
        </motion.div>
      </motion.div>
    );

  if (node.ref?.type === "skill")
    return (
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <Eyebrow color={node.color}>skill · {node.ref.group}</Eyebrow>
        <BigTitle text={node.label} color={node.color} />
        <motion.p variants={rise} className="mt-5 text-lg text-ink/80 md:text-xl">
          {work.length ? `Used across ${work.length} ${work.length === 1 ? "project / role" : "projects & roles"}` : "Part of my toolkit."}
        </motion.p>
        <motion.div variants={stagger} className="mt-6 space-y-1">
          {work.map((w) => (
            <motion.button key={w.id} variants={rise} onClick={() => onPick(w.id)} className="group flex w-full items-baseline gap-4 border-b border-white/5 py-2 text-left">
              <span className="font-display text-2xl font-bold uppercase transition group-hover:translate-x-2 md:text-3xl" style={{ color: w.color }}>
                {w.label}
              </span>
              <span className="ml-auto font-mono text-[11px] text-dim">{w.sub}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    );

  if (node.ref?.type === "school") {
    const s = education[0];
    return (
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <Eyebrow color={node.color}>education · {s.period}</Eyebrow>
        <BigTitle text={s.school} color="#c9c4ea" />
        <motion.p variants={rise} className="mt-4 text-lg text-cyan md:text-xl">
          {s.credential}
        </motion.p>
        <motion.ul variants={stagger} className="mt-5 space-y-2">
          {s.notes.map((n) => (
            <motion.li key={n} variants={rise} className="text-base text-ink/85 md:text-lg">
              <span className="mr-2 text-pink">▸</span>
              {n}
            </motion.li>
          ))}
        </motion.ul>
        <WordCloud items={skills} onPick={onPick} />
      </motion.div>
    );
  }

  if (node.ref?.type === "role") {
    const slug = node.ref.slug;
    const r = experience.find((e) => e.slug === slug) as Role;
    return (
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <Eyebrow color={KIND_COLOR.work}>
          experience · {r.type} · {r.period}
        </Eyebrow>
        <BigTitle text={r.company} color={KIND_COLOR.work} />
        <motion.p variants={rise} className="mt-4 text-lg text-cyan md:text-xl">
          {r.title} <span className="text-dim">· {r.location}</span>
        </motion.p>
        <motion.ul variants={stagger} className="mt-5 space-y-2.5">
          {r.bullets.slice(0, 4).map((b) => (
            <motion.li key={b} variants={rise} className="text-base leading-relaxed text-ink/85 md:text-lg">
              <span className="mr-2 text-pink">▸</span>
              {b}
            </motion.li>
          ))}
        </motion.ul>
        <WordCloud items={skills} onPick={onPick} />
      </motion.div>
    );
  }

  const slug = node.ref?.type === "project" ? node.ref.slug : "";
  const p = projects.find((x) => x.slug === slug) as Project;
  return (
    <motion.div initial="hidden" animate="show" variants={stagger}>
      <Eyebrow color={node.color}>
        project · {p.status}
        {p.period ? ` · ${p.period}` : ""}
      </Eyebrow>
      <BigTitle text={p.name} color={node.color} />
      <motion.p variants={rise} className="mt-4 max-w-xl text-lg text-cyan md:text-xl">
        {p.tagline}
      </motion.p>
      {p.metrics?.length ? (
        <motion.div variants={stagger} className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          {p.metrics.slice(0, 3).map((m) => (
            <motion.div key={m.label} variants={rise} className="max-w-[11rem]">
              <div className="font-display text-4xl font-bold leading-none md:text-5xl" style={{ color: node.color, textShadow: `0 0 26px ${node.color}55` }}>
                {m.value}
              </div>
              <div className="mt-1 text-[12px] leading-snug text-dim">{m.label}</div>
            </motion.div>
          ))}
        </motion.div>
      ) : null}
      <motion.ul variants={stagger} className="mt-5 max-w-xl space-y-2">
        {p.bullets.slice(0, 2).map((b) => (
          <motion.li key={b} variants={rise} className="text-base leading-relaxed text-ink/85">
            <span className="mr-2 text-pink">▸</span>
            {b}
          </motion.li>
        ))}
      </motion.ul>
      <WordCloud items={skills} onPick={onPick} />
      <motion.a variants={rise} href={`#project-${p.slug}`} className="group mt-7 inline-flex items-center gap-2 font-display text-lg uppercase tracking-wide text-ink hover:text-cyan">
        Open case file <span className="transition-transform group-hover:translate-x-1">→</span>
      </motion.a>
    </motion.div>
  );
}

/* ---------- section ---------- */

const subscribeWide = (cb: () => void) => {
  const m = matchMedia("(min-width: 1024px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function ArchitectureMap() {
  const { nodes, edges } = useMemo(() => buildGraph(), []);
  const [selected, setSelected] = useState("core");
  const [hover, setHover] = useState<string | null>(null);
  const [webgl, setWebgl] = useState(true);
  const wide = useSyncExternalStore(subscribeWide, () => matchMedia("(min-width: 1024px)").matches, () => true);
  const sec = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const lastTouch = useRef(0);
  const inView = useRef(false);
  const byId = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const node = nodes[byId.get(selected) ?? 0];
  const hovered = hover ? nodes[byId.get(hover) ?? 0] : null;
  const tier1 = useMemo(() => nodes.filter((n) => n.tier === 1), [nodes]);
  const counts: [number, number, number] = [tier1.length, nodes.filter((n) => n.tier === 2).length, edges.length];

  const links = useMemo(() => {
    const i = byId.get(selected) ?? 0;
    const out: GNode[] = [];
    for (const [a, b] of edges) {
      if (a === i && nodes[b].tier > 0) out.push(nodes[b]);
      else if (b === i && nodes[a].tier > 0) out.push(nodes[a]);
    }
    return out;
  }, [selected, byId, edges, nodes]);

  const pick = useCallback((id: string) => {
    lastTouch.current = performance.now();
    setSelected(id);
  }, []);
  const onHover = useCallback((id: string | null) => {
    if (id) lastTouch.current = performance.now();
    setHover(id);
  }, []);
  const onReady = useCallback((ok: boolean) => {
    if (!ok) setWebgl(false);
  }, []);

  // scroll progress through the section (0 as it enters at the bottom → 1 as it leaves at the top)
  useEffect(() => {
    const onScroll = () => {
      const el = sec.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      progress.current = Math.max(0, Math.min(1, (innerHeight - r.top) / (r.height + innerHeight)));
      inView.current = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
      // the background face steps aside while the system fills the screen
      stage.covers.system = r.top < innerHeight * 0.3 && r.bottom > innerHeight * 0.7;
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      stage.covers.system = false;
    };
  }, []);

  // auto-tour: when nobody's touching it, the system walks through its own work
  useEffect(() => {
    // desktop only — on phones the text sits in the page flow and changing it would shift the layout
    if (!wide || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const order = ["core", ...tier1.map((n) => n.id)];
    const t = setInterval(() => {
      if (!inView.current || hover || performance.now() - lastTouch.current < 9000) return;
      setSelected((cur) => order[(order.indexOf(cur) + 1) % order.length]);
    }, 5200);
    return () => clearInterval(t);
  }, [tier1, hover, wide]);

  const shown = hovered && hovered.id !== selected ? hovered : null;
  // mount the 3D scene only once the section is within a screen of the viewport
  const near = useNear(sec, "100%", "300%");

  return (
    <section id="map" ref={sec} className="relative lg:h-[230svh]">
      <div className="relative overflow-hidden lg:sticky lg:top-0 lg:h-[100svh]">
        {/* HUD: scanlines, vignette, frame brackets, red horizon */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_3px)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(6,5,12,0.85)_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-3 bottom-3 top-16 z-[1] hidden lg:block">
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-b-2 border-l-2", "right-0 bottom-0 border-b-2 border-r-2"].map((k) => (
            <span key={k} className={`absolute h-8 w-8 border-cyan/70 ${k}`} />
          ))}
          <span className="absolute left-12 right-12 top-0 h-px bg-gradient-to-r from-cyan/50 via-transparent to-[#ff3b5c]/50" />
          <span className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-[#ff3b5c]/50 via-transparent to-cyan/50" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-[-40%] bottom-[-8%] z-0 h-[40%] opacity-60 [perspective:520px]">
          <div className="cs-floor h-full w-full origin-bottom [transform:rotateX(74deg)]" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[62%] z-0 h-px bg-gradient-to-r from-transparent via-[#ff3b5c]/40 to-transparent shadow-[0_0_24px_4px_rgba(255,59,92,0.2)]" />
        {/* giant drifting name of the focused node — the whole section's backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[34svh] select-none overflow-hidden lg:top-1/2 lg:-translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div
                className="marquee flex w-max whitespace-nowrap font-display text-[22vw] font-bold uppercase leading-none tracking-tighter text-transparent lg:text-[15vw]"
                style={{ WebkitTextStroke: `1px ${node.kind === "core" ? "rgba(255,255,255,0.08)" : `${node.color}30`}`, animationDuration: "70s" }}
              >
                {Array.from({ length: 4 }).map((_, k) => (
                  <span key={k} className="pr-[0.4em]">
                    {node.kind === "core" ? "NABEEL.OS" : node.label} ◆
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative lg:grid lg:h-full lg:grid-cols-[1.1fr_1fr]">
          {/* 3D stage — full bleed, fades into the page above and below */}
          <div className="relative h-[66svh] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_84%,transparent)] lg:absolute lg:inset-0 lg:h-full">
            {webgl && near ? (
              <SystemScene
                nodes={nodes}
                edges={edges}
                selected={selected}
                onSelect={pick}
                onHover={onHover}
                onReady={onReady}
                progress={progress}
                shift={wide ? 0.22 : 0}
              />
            ) : (
              !webgl && <div className="flex h-full items-center justify-center p-6 text-center font-mono text-xs text-dim">3D view isn&apos;t available on this device.</div>
            )}
          </div>

          {/* HUD heading */}
          <div className="pointer-events-none absolute left-4 right-4 top-6 z-[2] flex items-start justify-between lg:left-10 lg:right-10 lg:top-20">
            <div>
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em]" style={{ color: RED }}>
                <span className="h-px w-8" style={{ background: RED }} />
                01 {"//"} <span className="font-jp">システムマップ</span>
              </div>
              <div className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.15em] text-ink md:text-3xl">
                NABEEL<span className="text-cyan">.OS</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.25em] text-dim">CONTROL PLANE · LIVE MAP</div>
            </div>
            <div className="hidden text-right font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim md:block">
              <div>
                <span className="text-ok">●</span> ONLINE
              </div>
              <div>
                NODES <span className="text-cyan">{counts[0]}</span> · SKILLS <span className="text-pink">{counts[1]}</span> · LINKS <span className="text-[#a78bfa]">{counts[2]}</span>
              </div>
              <div>
                FOCUS <span style={{ color: node.kind === "core" ? "#f2ff3c" : node.color }}>{node.kind === "core" ? "CORE" : node.label.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* hover readout */}
          <AnimatePresence>
            {shown && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute left-4 top-28 z-[2] border bg-[#07051a]/85 px-2.5 py-1.5 font-mono text-[11px] lg:left-10 lg:top-44"
                style={{ color: shown.color, borderColor: `${shown.color}88`, boxShadow: `0 0 20px -6px ${shown.color}` }}
              >
                <span className="text-dim">TARGET ›</span> {shown.label} <span className="text-dim">· {shown.sub} · click to focus</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* the data — big, kinetic, no boxes */}
          <div className="relative z-[2] px-4 pb-6 lg:col-start-2 lg:flex lg:h-full lg:items-center lg:px-0 lg:pb-0 lg:pr-14">
            <div className="relative w-full border-l pl-5 lg:pl-7" style={{ borderColor: `${node.kind === "core" ? RED : node.color}66` }}>
              <div className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-dim">
                <span style={{ color: node.kind === "core" ? RED : node.color }}>▍</span>
                FILE://sys/{node.kind === "core" ? "core" : node.ref?.type ?? "node"}/{node.id}
                <span className="blink text-cyan">_</span>
              </div>
              <span className="absolute -left-px top-0 h-10 w-[3px]" style={{ background: node.kind === "core" ? RED : node.color, boxShadow: `0 0 14px ${node.kind === "core" ? RED : node.color}` }} />
              <div className="[scrollbar-width:none] lg:max-h-[66svh] lg:overflow-y-auto lg:pr-2">
                <AnimatePresence mode="wait">
                  <motion.div key={node.id} exit={{ opacity: 0, x: 24, filter: "blur(8px)", transition: { duration: 0.25 } }}>
                    <Detail node={node} links={links} onPick={pick} counts={counts} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* index of every node — readable, keyboard friendly */}
        <div className="relative z-[2] px-4 pb-8 font-mono text-[11px] lg:absolute lg:bottom-8 lg:left-10 lg:w-[min(50%,640px)] lg:px-0 lg:pb-0">
          <div className="mb-1.5 flex items-center gap-3 text-[10px] tracking-[0.25em] text-dim">
            <span style={{ color: RED }}>PROCESSES</span> {tier1.length} RUNNING
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-3 lg:gap-x-1 lg:gap-y-0.5 lg:overflow-visible">
            {[{ id: "core", label: "overview", color: "#f2ff3c" } as Pick<GNode, "id" | "label" | "color">, ...tier1].map((n, k) => {
              const on = selected === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => pick(n.id)}
                  onMouseEnter={() => n.id !== "core" && onHover(n.id)}
                  onMouseLeave={() => onHover(null)}
                  className={`flex shrink-0 items-center gap-2 border-l-2 px-2 py-1 text-left transition ${on ? "bg-white/[0.06] text-ink" : "border-transparent text-dim hover:bg-white/[0.03] hover:text-ink"}`}
                  style={{ borderColor: on ? n.color : undefined }}
                >
                  <span className="text-[9px] opacity-60">{String(k).padStart(2, "0")}</span>
                  <span className="h-1.5 w-1.5 shrink-0" style={{ background: n.color, boxShadow: on ? `0 0 8px ${n.color}` : "none" }} />
                  <span className="truncate">{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
