"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { projects, type Project } from "@/content/profile";
import { stage } from "@/lib/stage";
import { GalleryPreview, Lightbox } from "./Gallery";
import type { StageHud, StageItem } from "./projects/ProjectStage";
import { Chip, Photo, SectionTitle } from "./ui";

const ProjectStage = dynamic(() => import("./projects/ProjectStage").then((m) => m.ProjectStage), { ssr: false });

const KIND_COLOR: Record<string, string> = { cloud: "#00f0ff", ai: "#ff2bd6", app: "#a78bfa", web: "#60a5fa", data: "#3dff9a" };

const STATUS = {
  shipped: { label: "SHIPPED", cls: "text-ok border-ok/40" },
  "in-progress": { label: "IN PROGRESS", cls: "text-volt border-volt/40" },
  academic: { label: "ACADEMIC", cls: "text-cyan border-cyan/40" },
};

function LinkButtons({ p }: { p: Project }) {
  const { github, demo, report, devpost, post } = p.links;
  if (!github && !demo && !report && !devpost && !post) return null;
  const base = "cut-sm inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition";
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {github && (
        <a href={github} target="_blank" rel="noreferrer" className={`${base} border border-cyan/50 text-cyan hover:bg-cyan hover:text-void`}>
          ⌥ source code
        </a>
      )}
      {demo && (
        <a href={demo} target="_blank" rel="noreferrer" className={`${base} bg-pink text-void hover:shadow-[0_0_20px_rgba(255,43,214,0.6)]`}>
          ▶ live demo
        </a>
      )}
      {devpost && (
        <a href={devpost} target="_blank" rel="noreferrer" className={`${base} border border-line text-ink/80 hover:border-cyan hover:text-cyan`}>
          ◈ devpost
        </a>
      )}
      {post && (
        <a href={post} target="_blank" rel="noreferrer" className={`${base} border border-line text-ink/80 hover:border-cyan hover:text-cyan`}>
          ✎ write-up
        </a>
      )}
      {report && (
        <a href={report} target="_blank" rel="noreferrer" className={`${base} border border-volt/50 text-volt hover:bg-volt hover:text-void`}>
          ▤ full report (PDF)
        </a>
      )}
    </div>
  );
}

function CaseStudy({ p }: { p: Project }) {
  return (
    <div className="space-y-5 border-t border-line pt-4">
      {p.metrics && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {p.metrics.map((m) => (
            <div key={m.label} className="border border-line bg-panel-2/60 p-3">
              <div className="font-display text-2xl font-bold text-cyan text-glow-cyan">{m.value}</div>
              <div className="text-[11.5px] leading-snug text-dim">{m.label}</div>
            </div>
          ))}
        </div>
      )}
      {p.challenges && (
        <div>
          <div className="mb-2 font-mono text-[11px] tracking-widest text-pink">BUGS I HUNTED DOWN</div>
          <div className="space-y-2">
            {p.challenges.map((c) => (
              <div key={c.problem} className="grid gap-1 border-l-2 border-pink/60 pl-3 text-sm sm:grid-cols-[1fr_1.4fr] sm:gap-4">
                <div className="text-ink">
                  <span className="font-mono text-pink">✗ </span>
                  {c.problem}
                </div>
                <div className="text-dim">
                  <span className="font-mono text-ok">✓ </span>
                  {c.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, wide, onOpen }: { p: Project; wide: boolean; onOpen: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const hasCase = !!(p.metrics?.length || p.challenges?.length);
  const bullets = wide || open ? p.bullets : p.bullets.slice(0, 3);

  return (
    <motion.article
      id={`project-${p.slug}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className={`cut panel group scroll-mt-24 self-start overflow-hidden transition hover:border-cyan/60 ${wide ? "md:col-span-2" : ""}`}
    >
      <div className={wide ? "grid md:grid-cols-[1.1fr_1fr]" : ""}>
        <div className={wide ? "md:border-r md:border-line" : ""}>
          <GalleryPreview shots={p.gallery} title={p.name} onOpen={onOpen} />
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className={`border px-2 py-0.5 ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
            <span className="text-dim">{p.period}</span>
          </div>
          {p.badge && <div className="mt-2 inline-block border border-volt/40 bg-volt/5 px-2 py-0.5 font-mono text-[11px] text-volt">🏆 {p.badge}</div>}
          <h3 className="mt-3 font-display text-2xl font-bold uppercase">{p.name}</h3>
          <p className="text-sm text-cyan">{p.tagline}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink/85">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-pink">▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.stack.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
          <LinkButtons p={p} />
          {(hasCase || (!wide && p.bullets.length > 3)) && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-4 font-mono text-xs text-pink hover:underline"
            >
              {open ? "[ − hide case study ]" : hasCase ? "[ + open case study ]" : "[ + more ]"}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && hasCase && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5">
              <CaseStudy p={p} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

const noop = () => () => {};

/** Full-screen 3D reel (default) — falls back to the card grid without WebGL or with reduced motion. */
export function Projects() {
  const reduced = useSyncExternalStore(noop, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const [webgl, setWebgl] = useState(true);
  const [viewer, setViewer] = useState<{ slug: string; index: number } | null>(null);
  const [caseFile, setCaseFile] = useState<string | null>(null);
  const active = viewer ? projects.find((p) => p.slug === viewer.slug) : undefined;
  const reel = webgl && !reduced;

  const lightbox = (
    <Lightbox
      shots={active?.gallery ?? []}
      index={active?.gallery.length ? viewer!.index : null}
      title={active?.name ?? ""}
      onClose={() => setViewer(null)}
      onIndex={(index) => viewer && setViewer({ ...viewer, index })}
    />
  );

  if (!reel)
    return (
      <section id="projects" className="relative mx-auto max-w-6xl px-4 py-24 md:px-6">
        <SectionTitle index="03" jp="プロジェクト" title="Projects" kicker="Case files. Click any screenshot to open the gallery." />
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.slug} p={p} wide={!!p.featured} onOpen={(index) => setViewer({ slug: p.slug, index })} />
          ))}
        </div>
        {lightbox}
      </section>
    );

  return (
    <>
      <Reel onUnsupported={() => setWebgl(false)} onCase={setCaseFile} onGallery={(slug, index) => setViewer({ slug, index })} />
      <CaseFile
        p={projects.find((x) => x.slug === caseFile)}
        onClose={() => setCaseFile(null)}
        onGallery={(slug, index) => setViewer({ slug, index })}
      />
      {lightbox}
    </>
  );
}

const PER_CARD_VH = 55;
const SHOT_MS = 3200;

/** remembers which screenshots failed to load (placeholders), so we never advertise them */
const shotOk: Record<string, boolean> = {};

function useShots(p: Project) {
  const [, bump] = useState(0);
  useEffect(() => {
    for (const g of p.gallery) {
      if (g.src in shotOk) continue;
      const img = new Image();
      img.onload = () => ((shotOk[g.src] = true), bump((v) => v + 1));
      img.onerror = () => ((shotOk[g.src] = false), bump((v) => v + 1));
      img.src = g.src;
    }
  }, [p]);
  // original gallery indexes of the screenshots that exist
  return p.gallery.map((g, k) => (shotOk[g.src] === false ? -1 : k)).filter((k) => k >= 0);
}

function Reel({
  onUnsupported,
  onCase,
  onGallery,
}: {
  onUnsupported: () => void;
  onCase: (slug: string) => void;
  onGallery: (slug: string, index: number) => void;
}) {
  const N = projects.length;
  const items = useMemo<StageItem[]>(
    () =>
      projects.map((p) => ({
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        color: KIND_COLOR[p.kind] ?? "#00f0ff",
        images: p.gallery.map((g) => g.src),
      })),
    [],
  );
  const sec = useRef<HTMLElement>(null);
  const target = useRef(0);
  const shot = useRef({ i: 0, k: 0 });
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(true);
  const [pos, setPos] = useState(0); // position within this project's existing screenshots
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const hudQ = useRef<HTMLSpanElement[]>([]);
  const gizmo = useRef<SVGGElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  const p = projects[idx];
  const shots = useShots(p);
  const k = shots[pos % Math.max(1, shots.length)] ?? 0;
  useEffect(() => {
    shot.current = { i: idx, k };
  }, [idx, k]);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = sec.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(N - 1, i));
      const top = el.getBoundingClientRect().top + scrollY;
      const total = el.offsetHeight - innerHeight;
      scrollTo({ top: top + (clamped / Math.max(1, N - 1)) * total + 2, behavior: smooth ? "smooth" : "auto" });
    },
    [N],
  );

  // scroll → reel position
  useEffect(() => {
    let last = -1;
    let snap: ReturnType<typeof setTimeout> | undefined;
    let still: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const el = sec.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // far away from the reel: nothing to update (saves a React render on every scroll elsewhere)
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) {
        stage.covers.reel = false;
        return;
      }
      const total = r.height - innerHeight;
      const t = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      target.current = t * (N - 1);
      const i = Math.round(target.current);
      if (i !== last) {
        last = i;
        setIdx(i);
        setPos(0);
      }
      if (bar.current) bar.current.style.transform = `scaleX(${t})`;
      stage.covers.reel = r.top <= 1 && r.bottom >= innerHeight - 1;
      setSettled(false);
      clearTimeout(still);
      still = setTimeout(() => setSettled(true), 450);
      // like ALCHE: when scrolling stops inside the reel, settle on the nearest screen
      clearTimeout(snap);
      if (r.top < 0 && r.bottom > innerHeight) {
        snap = setTimeout(() => {
          const off = target.current - Math.round(target.current);
          if (Math.abs(off) > 0.02) goTo(Math.round(target.current));
        }, 180);
      }
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      clearTimeout(snap);
      clearTimeout(still);
      stage.covers.reel = false;
    };
  }, [N, goTo]);

  // the focused screen flips through its screenshots (paused while you hover it)
  useEffect(() => {
    if (shots.length < 2 || !settled || hover) return;
    const t = setTimeout(() => setPos((v) => (v + 1) % shots.length), SHOT_MS);
    return () => clearTimeout(t);
  }, [shots.length, settled, hover, pos, idx]);

  // #project-<slug> links anywhere on the page → rotate to it and open the case file
  useEffect(() => {
    const open = (hash: string) => {
      const m = hash.match(/^#project-(.+)$/);
      if (!m) return false;
      const i = projects.findIndex((x) => x.slug === m[1]);
      if (i < 0) return false;
      goTo(i, false);
      setTimeout(() => onCase(projects[i].slug), 500);
      return true;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#project-']") as HTMLAnchorElement | null;
      if (a && open(a.getAttribute("href")!)) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    if (location.hash) open(location.hash);
    return () => document.removeEventListener("click", onClick);
  }, [goTo, onCase]);

  // ← / → while the reel is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || !stage.covers.reel) return;
      if (e.key === "ArrowRight") goTo(Math.round(target.current) + 1);
      if (e.key === "ArrowLeft") goTo(Math.round(target.current) - 1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [goTo]);

  const onHud = useCallback((h: StageHud) => {
    h.q.forEach((v, n) => {
      const el = hudQ.current[n];
      if (el) el.textContent = (v < 0 ? "-" : "") + Math.abs(v).toFixed(2).replace(/^0/, "");
    });
    if (gizmo.current) gizmo.current.style.transform = `rotate(${(Math.atan2(h.q[1], h.q[3]) * 2 * 180) / Math.PI}deg)`;
  }, []);

  const openShots = useCallback(
    (i: number, at?: number) => {
      const pr = projects[i];
      const list = pr.gallery.map((g, n) => (shotOk[g.src] === false ? -1 : n)).filter((n) => n >= 0);
      if (!list.length) onCase(pr.slug);
      else onGallery(pr.slug, at ?? (i === idx ? k : list[0]));
    },
    [idx, k, onCase, onGallery],
  );
  const onHover = useCallback((i: number, x: number, y: number) => {
    setHover(i >= 0 && i === Math.round(target.current) ? { x, y } : null);
  }, []);
  const onReady = useCallback((ok: boolean) => !ok && onUnsupported(), [onUnsupported]);
  const canHover = useSyncExternalStore(noop, () => matchMedia("(hover: hover)").matches, () => true);
  // don't spin up the 3D reel until it's within a couple of screens
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "200% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const hasShots = shots.length > 0;
  const thumbs = shots.slice(0, 6);

  return (
    <section id="projects" ref={sec} className="relative" style={{ height: `calc(${N * PER_CARD_VH}svh + 100svh)` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {near && (
        <ProjectStage
          items={items}
          target={target}
          shot={shot}
          onPick={(i) => goTo(i)}
          onOpen={(i) => openShots(i)}
          onHover={onHover}
          onHud={onHud}
          onReady={onReady}
        />
        )}

        {/* heading */}
        <div className="pointer-events-none absolute left-4 top-[4.5rem] md:left-8">
          <div className="font-mono text-[11px] tracking-[0.3em] text-dim">
            <span className="text-pink">03</span> {"//"} <span className="font-jp">プロジェクト</span>
          </div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide md:text-3xl">Projects</h2>
          <div className="mt-1 hidden font-mono text-[11px] text-dim sm:block">scroll to browse · click a screen to see its screenshots</div>
        </div>

        {/* HUD: reel quaternion */}
        <div className="pointer-events-none absolute right-4 top-[4.5rem] hidden text-right font-mono text-[10px] text-dim md:right-8 md:block">
          <div className="tracking-widest">Reel Quaternion</div>
          <div className="mt-1.5 flex items-center justify-end gap-2 text-ink/80">
            <span className="h-2 w-2 rounded-full bg-ink/60" />
            {[0, 1, 2, 3].map((n) => (
              <span key={n} ref={(el) => { if (el) hudQ.current[n] = el; }} className="w-7 border-l border-line pl-1 text-left">
                .00
              </span>
            ))}
          </div>
          <svg viewBox="-40 -40 80 80" className="ml-auto mt-3 h-20 w-20">
            <circle r="36" fill="none" stroke="#2a2547" />
            <circle r="30" fill="none" stroke="#2a2547" strokeDasharray="2 4" />
            <g ref={gizmo} style={{ transformOrigin: "0 0", transition: "transform 0.1s linear" }}>
              <line x1="0" y1="0" x2="0" y2="-26" stroke="#3dff9a" />
              <circle cx="0" cy="-26" r="4" fill="#3dff9a" />
              <line x1="0" y1="0" x2="24" y2="0" stroke="#5b8cff" />
              <circle cx="24" cy="0" r="4" fill="#5b8cff" />
              <line x1="0" y1="0" x2="-24" y2="0" stroke="#8f8bab" />
              <circle cx="-24" cy="0" r="3" fill="#8f8bab" />
              <circle r="3.5" fill="#ff2bd6" />
            </g>
          </svg>
          <button onClick={() => goTo(0)} className="pointer-events-auto mt-2 tracking-widest hover:text-cyan">
            ↺ reset reel
          </button>
        </div>

        {/* index ticks */}
        <div className="absolute left-3 top-1/2 hidden -translate-y-1/2 flex-col gap-1.5 font-mono text-[10px] md:flex">
          {projects.map((x, i) => (
            <button
              key={x.slug}
              onClick={() => goTo(i)}
              aria-label={x.name}
              className={`flex items-center gap-2 text-left transition ${i === idx ? "text-cyan" : "text-dim/60 hover:text-ink"}`}
            >
              <span className={`h-px transition-all ${i === idx ? "w-6 bg-cyan" : "w-3 bg-current"}`} />
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>

        {/* "there are screenshots in here" — pulsing tap target on the focused screen */}
        <AnimatePresence>
          {hasShots && settled && !hover && (
            <motion.button
              key={`hint-${p.slug}`}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              onClick={() => openShots(idx)}
              className="absolute left-1/2 top-[44%] z-10 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/25 bg-void/70 py-1.5 pl-1.5 pr-4 font-mono text-[11px] text-ink shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md hover:border-cyan hover:text-cyan md:top-[66%]"
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-cyan/40" />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-cyan text-void">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="14" height="11" rx="1.5" />
                    <path d="M7 19h13V9" />
                    <circle cx="8" cy="9" r="1.2" fill="currentColor" />
                    <path d="M3 14l4-3 3 2 3-3 4 4" />
                  </svg>
                </span>
              </span>
              {shots.length} screenshot{shots.length === 1 ? "" : "s"} · {canHover ? "click" : "tap"} to view
            </motion.button>
          )}
        </AnimatePresence>

        {/* cursor label while hovering the focused screen */}
        {hover && hasShots && (
          <div
            className="pointer-events-none fixed z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan/70 bg-void/60 text-center font-mono text-[10px] leading-tight text-cyan backdrop-blur-sm"
            style={{ left: hover.x, top: hover.y }}
          >
            <span className="text-base">⤢</span>
            VIEW
            <br />
            {shots.length} SHOT{shots.length === 1 ? "" : "S"}
          </div>
        )}

        {/* soft scrim so the caption reads over the side screens */}
        <div className="pointer-events-none absolute bottom-0 left-0 h-[60%] w-full bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,3,18,0.85),transparent_65%)] md:w-[65%]" />

        {/* caption */}
        <div className="pointer-events-none absolute inset-x-4 bottom-[8.5rem] md:bottom-12 md:left-16 md:right-auto md:max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-widest">
                {p.period && <span className="text-ink/80">{p.period}</span>}
                <span className={`border px-1.5 py-px ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                {p.badge && <span className="hidden bg-volt/10 px-1.5 py-px text-volt sm:inline">{p.badge}</span>}
              </div>
              <h3 className="mt-2 font-display text-3xl font-bold uppercase leading-none md:text-5xl">{p.name}</h3>
              <p className="mt-2 text-sm text-ink/85 md:text-base">{p.tagline}</p>
              {p.bullets[0] && <p className="mt-1.5 line-clamp-2 hidden text-sm text-dim sm:block">{p.bullets[0]}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.stack.slice(0, 5).map((s, n) => (
                  <span key={s} className={`${n > 2 ? "hidden sm:inline" : ""} border border-ink/40 bg-void/40 px-2 py-0.5 font-mono text-[11px] text-ink/90`}>
                    {s}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onCase(p.slug)}
                className="pointer-events-auto group mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-white/[0.06] px-4 py-1.5 font-mono text-xs text-ink backdrop-blur-md transition hover:border-cyan hover:bg-cyan/10 hover:text-cyan"
              >
                Read more
                <span className="transition-transform group-hover:translate-x-1">→</span>
                <span className="hidden text-dim sm:inline">{p.bullets.length} highlights{p.metrics?.length ? " · numbers" : ""}{p.challenges?.length ? " · bugs fixed" : ""}</span>
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* screenshot strip: story-style progress over thumbnails — click any to open it */}
        <div className="absolute left-4 right-16 bottom-[4.25rem] md:inset-x-auto md:bottom-28 md:right-8 md:w-[22rem]">
          {hasShots && (
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-widest text-dim">
                <span>
                  <span className="text-cyan">▣</span> SCREENSHOTS
                </span>
                <span>
                  <span className="text-ink">{String(shots.indexOf(k) + 1).padStart(2, "0")}</span> / {String(shots.length).padStart(2, "0")}
                </span>
              </div>
              <div className="flex gap-1.5">
                {thumbs.map((g, n) => {
                  const on = g === k;
                  return (
                    <button
                      key={`${p.slug}-${g}`}
                      onClick={() => openShots(idx, g)}
                      onMouseEnter={() => setPos(n)}
                      aria-label={`Open ${p.name} screenshot ${n + 1}`}
                      className={`group relative aspect-video flex-1 overflow-hidden border transition ${on ? "border-cyan" : "border-line opacity-60 hover:opacity-100"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.gallery[g].src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                        {on && (
                          <span
                            key={`${p.slug}-${pos}-${settled && !hover}`}
                            className="block h-full origin-left bg-cyan"
                            style={{ animation: settled && !hover && shots.length > 1 ? `shot-progress ${SHOT_MS}ms linear forwards` : undefined, transform: settled && !hover && shots.length > 1 ? undefined : "scaleX(1)" }}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
                {shots.length > thumbs.length && (
                  <button
                    onClick={() => openShots(idx, shots[thumbs.length])}
                    className="flex aspect-video flex-1 items-center justify-center border border-line font-mono text-[11px] text-dim hover:border-cyan hover:text-cyan"
                  >
                    +{shots.length - thumbs.length}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="absolute bottom-10 right-4 hidden items-center gap-3 md:right-8 md:bottom-12 md:flex">
          <span className="font-mono text-xs text-dim">
            <span className="text-ink">{String(idx + 1).padStart(2, "0")}</span> / {String(N).padStart(2, "0")}
          </span>
          <button onClick={() => goTo(idx - 1)} aria-label="Previous project" className="border border-line px-2.5 py-1 font-mono text-xs text-dim hover:border-cyan hover:text-cyan">
            ←
          </button>
          <button onClick={() => goTo(idx + 1)} aria-label="Next project" className="border border-line px-2.5 py-1 font-mono text-xs text-dim hover:border-cyan hover:text-cyan">
            →
          </button>
          <button onClick={() => onCase(p.slug)} className="font-display text-lg uppercase tracking-wide text-ink hover:text-cyan">
            Details ↗
          </button>
        </div>
        <button
          onClick={() => onCase(p.slug)}
          className="absolute right-4 top-[4.6rem] border border-cyan/60 bg-void/60 px-2.5 py-1 font-mono text-[11px] text-cyan md:hidden"
        >
          details ↗
        </button>

        {/* progress */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-line">
          <div ref={bar} className="h-full origin-left bg-gradient-to-r from-pink to-cyan" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>

      {/* readable for screen readers & search engines */}
      <ul className="sr-only">
        {projects.map((x) => (
          <li key={x.slug}>
            <h3>{x.name}</h3>
            <p>{x.tagline}</p>
            <ul>
              {x.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaseFile({ p, onClose, onGallery }: { p?: Project; onClose: () => void; onGallery: (slug: string, index: number) => void }) {
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    // block page scroll outside the panel (it would rotate the reel underneath)
    const block = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-drawer]")) e.preventDefault();
    };
    addEventListener("wheel", block, { passive: false });
    addEventListener("touchmove", block, { passive: false });
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("wheel", block);
      removeEventListener("touchmove", block);
    };
  }, [p, onClose]);

  return (
    <AnimatePresence>
      {p && (
        <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-void/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${p.name} — details`}
            initial={{ x: "-104%" }}
            animate={{ x: 0 }}
            exit={{ x: "-104%" }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            data-drawer
            className="glass absolute inset-y-0 left-0 w-full overflow-y-auto overscroll-contain px-5 pb-10 pt-[4.25rem] sm:w-[min(560px,92vw)] md:px-8"
          >
            <div className="sticky top-0 z-10 -mx-5 mb-3 flex justify-end bg-gradient-to-b from-[#120b2a] to-transparent px-5 py-2 md:-mx-8 md:px-8">
              <button onClick={onClose} className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-dim hover:border-pink hover:text-pink">
                ✕ close <span className="hidden sm:inline">· esc</span>
              </button>
            </div>
            <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}>
              {[
                <div key="meta" className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-widest">
                  {p.period && <span className="text-ink/80">{p.period}</span>}
                  <span className={`border px-1.5 py-px ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                  {p.badge && <span className="bg-volt/10 px-1.5 py-px text-volt">🏆 {p.badge}</span>}
                </div>,
                <h3 key="name" className="mt-3 font-display text-3xl font-bold uppercase leading-none md:text-4xl">
                  {p.name}
                </h3>,
                <p key="tag" className="mt-2 text-cyan">{p.tagline}</p>,
                <ul key="bullets" className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-ink/90">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rotate-45 bg-pink" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>,
                p.metrics || p.challenges ? (
                  <div key="case" className="mt-6">
                    <CaseStudy p={p} />
                  </div>
                ) : null,
                <div key="stack" className="mt-6">
                  <div className="mb-2 font-mono text-[10px] tracking-widest text-dim">STACK</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.stack.map((x) => (
                      <Chip key={x}>{x}</Chip>
                    ))}
                  </div>
                </div>,
                <LinkButtons key="links" p={p} />,
                p.gallery.length ? (
                  <div key="shots" className="mt-7">
                    <div className="mb-2 font-mono text-[10px] tracking-widest text-dim">
                      SCREENSHOTS · {p.gallery.length} — click to enlarge
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {p.gallery.map((g, k) => (
                        <button
                          key={g.src}
                          onClick={() => onGallery(p.slug, k)}
                          className="group relative aspect-video overflow-hidden border border-white/10 transition hover:border-cyan"
                        >
                          <Photo src={g.src} alt={g.caption || `${p.name} screenshot ${k + 1}`} className="h-full w-full object-top transition duration-500 group-hover:scale-105" />
                          <span className="absolute inset-0 flex items-center justify-center bg-void/0 font-mono text-[11px] text-transparent transition group-hover:bg-void/40 group-hover:text-cyan">
                            ⤢ view
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              ]
                .filter(Boolean)
                .map((node, n) => (
                  <motion.div key={n} variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }}>
                    {node}
                  </motion.div>
                ))}
            </motion.div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
