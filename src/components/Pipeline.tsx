"use client";

import { motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { education, experience } from "@/content/profile";
import { SectionTitle } from "./ui";

const role = (slug: string) => experience.find((e) => e.slug === slug)!;

const STAGES = [
  {
    step: "commit",
    years: "2016 – 2021",
    title: "Initial commit",
    color: "#8f8bab",
    entries: [
      {
        head: "Aitchison College · Lahore",
        sub: "O & A Levels",
        text: "School prefect, boarding house leader, rugby captain, CS Society executive — learned to lead before learning to code professionally.",
      },
    ],
  },
  {
    step: "build",
    years: "2021 – 2023",
    title: "Build",
    color: "#60a5fa",
    entries: [
      { head: `${role("techinoid").company} · ${role("techinoid").title}`, sub: role("techinoid").period, text: role("techinoid").bullets[0] },
      { head: `${education[1].school} · ${education[1].credential}`, sub: education[1].period, text: "Two semesters of AI fundamentals in Islamabad." },
      { head: `${role("geniteam").company} · ${role("geniteam").title}`, sub: role("geniteam").period, text: role("geniteam").bullets[0] },
    ],
  },
  {
    step: "test",
    years: "2023 – 2025",
    title: "Test in production",
    color: "#ff2bd6",
    entries: [
      { head: `${education[0].school} · Advanced Diploma`, sub: education[0].period, text: "CGPA 3.6 · President's Honour List (3.9) · PSA Vice President." },
      { head: `${role("grizzly-blades").company} · ${role("grizzly-blades").title}`, sub: role("grizzly-blades").period, text: role("grizzly-blades").bullets[1] },
      { head: `${role("openpolicy").company} · ${role("openpolicy").title}`, sub: role("openpolicy").period, text: role("openpolicy").bullets[0] },
      { head: `${role("notion-barn").company} · ${role("notion-barn").title} (${role("notion-barn").type})`, sub: role("notion-barn").period, text: role("notion-barn").bullets[0] },
    ],
  },
  {
    step: "deploy",
    years: "2026",
    title: "Deploy",
    color: "#00f0ff",
    entries: [
      { head: "Graduated · Seneca Polytechnic", sub: "May 2026", text: "Shipped InsightBoard AI and Xeveora Fragments on the way out." },
      { head: "Building RentOS", sub: "2026 – now", text: "An AI operating system for property management — native iOS with a provider-agnostic AI layer." },
    ],
  },
  {
    step: "monitor",
    years: "now",
    title: "Awaiting next release",
    color: "#3dff9a",
    entries: [{ head: "Your team?", sub: "status: open to offers", text: "Looking for a junior developer, cloud or AI role in Toronto or remote." }],
  },
];

type Stage = (typeof STAGES)[number];

/** glass card that tilts toward the pointer */
function GlassCard({ e, color, i }: { e: Stage["entries"][number]; color: string; i: number }) {
  const [t, setT] = useState({ x: 0, y: 0 });
  const onMove = (ev: RPointerEvent<HTMLDivElement>) => {
    if (ev.pointerType !== "mouse") return;
    const r = ev.currentTarget.getBoundingClientRect();
    setT({ x: ((ev.clientY - r.top) / r.height - 0.5) * -6, y: ((ev.clientX - r.left) / r.width - 0.5) * 8 });
  };
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: i % 2 ? 40 : -40, filter: "blur(8px)" },
        show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 120, damping: 18 } },
      }}
      style={{ perspective: 900 }}
    >
      <div
        onPointerMove={onMove}
        onPointerLeave={() => setT({ x: 0, y: 0 })}
        className="glass glass-shine group relative h-full rounded-xl p-5 transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
        style={{ transform: `rotateX(${t.x}deg) rotateY(${t.y}deg) translateZ(0)` }}
      >
        {/* stage-coloured glow in the corner */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
          style={{ background: color }}
        />
        <div className="relative">
          <div className="font-display text-[17px] font-semibold leading-snug">{e.head}</div>
          <div className="mt-0.5 font-mono text-[11px]" style={{ color }}>
            {e.sub}
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink/85">{e.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

/** stage node: spins "running" when it scrolls in, then turns into a check */
function Node({ s, last }: { s: Stage; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-35% 0px -35% 0px" });
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!seen || last) return;
    const t = setTimeout(() => setDone(true), 700);
    return () => clearTimeout(t);
  }, [seen, last]);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border bg-void/80 font-mono text-xs backdrop-blur md:h-11 md:w-11"
      style={{ borderColor: s.color, color: s.color, boxShadow: seen ? `0 0 24px -2px ${s.color}` : "none", transition: "box-shadow .5s" }}
    >
      {last ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full" style={{ background: s.color }} />
          <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
        </span>
      ) : done ? (
        <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
          ✓
        </motion.span>
      ) : (
        <span className={`block h-4 w-4 rounded-full border-2 border-current border-t-transparent ${seen ? "animate-spin" : "opacity-40"}`} />
      )}
    </div>
  );
}

export function Pipeline() {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start 70%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const packetTop = useTransform(fill, (v) => `${v * 100}%`);

  return (
    <section id="pipeline" className="relative mx-auto max-w-6xl px-4 py-24 md:px-6">
      <SectionTitle index="02" jp="パイプライン" title="The Pipeline" kicker="My story as a CI/CD run — every stage passed so far." />

      <div ref={track} className="relative">
        {/* track + scroll-drawn glowing line + travelling packet */}
        <div className="absolute bottom-2 left-[17px] top-2 w-px bg-white/10 md:left-[21px]" />
        <motion.div
          className="absolute left-[17px] top-2 w-px origin-top bg-gradient-to-b from-[#8f8bab] via-pink to-ok shadow-[0_0_12px_rgba(255,43,214,0.8)] md:left-[21px]"
          style={{ scaleY: fill, bottom: "0.5rem" }}
        />
        <motion.div
          className="absolute left-[17px] z-10 -ml-[5px] h-[11px] w-[11px] rounded-full bg-white shadow-[0_0_16px_4px_rgba(0,240,255,0.9)] md:left-[21px]"
          style={{ top: packetTop }}
        />

        <div className="space-y-16">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.step}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-90px" }}
              variants={{ show: { transition: { staggerChildren: 0.09 } } }}
              className="relative pl-14 md:pl-20"
            >
              <Node s={s} last={i === STAGES.length - 1} />
              <motion.div
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
              >
                <span className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: s.color }}>
                  $ {s.step}
                </span>
                <h3 className="font-display text-2xl font-bold uppercase md:text-3xl">{s.title}</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-dim">{s.years}</span>
              </motion.div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {s.entries.map((e, k) => (
                  <GlassCard key={e.head} e={e} color={s.color} i={k} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
