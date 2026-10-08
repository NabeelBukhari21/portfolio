"use client";

import { motion } from "motion/react";
import { useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { site, socials } from "@/content/profile";
import { NeonButton, SectionTitle } from "./ui";
import { GitHubPulse } from "./GitHubPulse";

/* ---------- glyphs (simple marks, used only to label links to each platform) ---------- */
const Glyph = {
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.5-2.25 3.1V21H9z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
    </svg>
  ),
  snapchat: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M12 2.5c3 0 5.2 2.3 5.2 5.3v2.3l1.6-.5c.6-.1 1 .5.6 1-.5.5-1.3.8-2 1 .6 1.7 1.9 3 3.5 3.6.4.2.3.8-.1.9-.8.3-1.6.4-2 .9-.2.4-.2 1-.7 1-.7 0-1.4-.4-2.4-.1-1.1.3-1.6 1.6-3.7 1.6s-2.6-1.3-3.7-1.6c-1-.3-1.7.1-2.4.1-.5 0-.5-.6-.7-1-.4-.5-1.2-.6-2-.9-.4-.1-.5-.7-.1-.9 1.6-.6 2.9-1.9 3.5-3.6-.7-.2-1.5-.5-2-1-.4-.5 0-1.1.6-1l1.6.5V7.8c0-3 2.2-5.3 5.2-5.3z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.4V21z" />
    </svg>
  ),
};

/** card that tilts toward the pointer and lights up where you hover */
function Tilt({ children, className = "", glow = "#00f0ff" }: { children: ReactNode; className?: string; glow?: string }) {
  const [t, setT] = useState({ rx: 0, ry: 0, x: 50, y: 50 });
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    setT({ rx: (0.5 - y) * 6, ry: (x - 0.5) * 8, x: x * 100, y: y * 100 });
  };
  return (
    <div style={{ perspective: 900 }} className="h-full">
      <div
        onPointerMove={move}
        onPointerLeave={() => setT({ rx: 0, ry: 0, x: 50, y: 50 })}
        className={`glass relative h-full overflow-hidden rounded-2xl transition-transform duration-200 ease-out ${className}`}
        style={{ transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)` }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60 transition-opacity" style={{ background: `radial-gradient(400px circle at ${t.x}% ${t.y}%, ${glow}22, transparent 45%)` }} />
        {children}
      </div>
    </div>
  );
}

const PLATFORMS = [
  { key: "instagram", name: "Instagram", color: "#d62976", text: "#fff", glyph: Glyph.instagram },
  { key: "snapchat", name: "Snapchat", color: "#FFFC00", text: "#000", glyph: Glyph.snapchat },
  { key: "x", name: "X", color: "#e7e9ea", text: "#000", glyph: Glyph.x },
  { key: "facebook", name: "Facebook", color: "#1877F2", text: "#fff", glyph: Glyph.facebook },
] as const;

export function Contact() {
  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-4 py-24 md:px-6">
      <SectionTitle index="08" jp="コンタクト" title="Open a Channel" kicker="Comms hub. LinkedIn is the fastest way to reach me — everything else is where I live online." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* ===== LinkedIn ===== */}
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ type: "spring", stiffness: 120, damping: 20 }}>
          <Tilt glow="#0A66C2" className="neon-border flex flex-col p-6 md:p-8">
            <div className="flex items-center justify-between">
              <span className="h-12 w-12 rounded-xl bg-[#0A66C2] p-2.5 text-white shadow-[0_0_30px_-6px_#0A66C2]">{Glyph.linkedin}</span>
              <span className="flex items-center gap-1.5 rounded-full border border-ok/50 px-2.5 py-0.5 font-mono text-[10px] text-ok">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
                PRIMARY CHANNEL
              </span>
            </div>
            <div className="mt-8 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/character/me-park.sm.webp" alt={site.name} className="h-20 w-20 rounded-full border-2 border-[#0A66C2] object-cover object-[50%_30%] shadow-[0_0_24px_-4px_#0A66C2]" />
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold leading-tight md:text-3xl">{site.name}</div>
                <div className="text-cyan">{site.headline}</div>
                <div className="font-mono text-xs text-dim">{site.location}</div>
              </div>
            </div>
            <p className="mt-6 flex items-center gap-2 font-mono text-xs text-ok">
              <span className="h-2 w-2 rounded-full bg-ok" />
              {site.status}
            </p>
            <a
              href={site.linkedin}
              target="_blank"
              rel="noreferrer"
              className="group mt-6 flex items-center justify-between rounded-xl bg-[#0A66C2] px-5 py-3.5 font-display font-semibold uppercase tracking-wider text-white transition hover:shadow-[0_0_34px_-4px_#0A66C2]"
            >
              Connect on LinkedIn
              <span className="transition-transform group-hover:translate-x-1">↗</span>
            </a>
            <div className="mt-1.5 truncate text-center font-mono text-[11px] text-dim">{site.linkedin.replace("https://", "")}</div>

            <div className="mt-auto border-t border-white/10 pt-5">
              <div className="mt-5 grid gap-2 font-mono text-sm sm:grid-cols-2">
                <a href={`mailto:${site.email}`} className="truncate rounded-lg border border-white/10 px-3 py-2 transition hover:border-cyan hover:text-cyan">
                  <span className="text-pink">@</span> {site.email}
                </a>
                <a href={site.github} target="_blank" rel="noreferrer" className="truncate rounded-lg border border-white/10 px-3 py-2 transition hover:border-cyan hover:text-cyan">
                  <span className="text-pink">gh</span> {site.github.replace("https://github.com/", "")}
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <NeonButton href={`mailto:${site.email}?subject=Let's talk`}>Email me</NeonButton>
                <NeonButton href={site.resumeUrl} tone="pink" external>
                  Resume ↓
                </NeonButton>
                <NeonButton href="#vault" tone="pink">
                  🔒 Vault
                </NeonButton>
              </div>
            </div>
          </Tilt>
        </motion.div>

        {/* ===== social hub ===== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-dim">
            <span className="h-px w-8 bg-pink" />
            SOCIAL HUB
            <span className="ml-auto flex items-center gap-1.5 tracking-normal">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
              signals: {PLATFORMS.length} channels
            </span>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-4">
            {PLATFORMS.map((p, k) => {
              const s = socials[p.key];
              const linked = !!s.url;
              const Card = (
                <Tilt glow={p.color} className={`group p-4 ${linked ? "" : "opacity-60"}`}>
                  {"snapcode" in s && s.snapcode && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.snapcode}
                      alt={`Snapcode for @${s.handle}`}
                      loading="lazy"
                      className="pointer-events-none absolute right-3 top-3 h-14 w-14 rounded-lg transition-all duration-300 group-hover:h-24 group-hover:w-24 group-hover:shadow-[0_0_30px_-4px_#FFFC00]"
                    />
                  )}
                  <span className="block h-10 w-10 rounded-xl p-2 transition group-hover:scale-110" style={{ background: p.color, color: p.text, boxShadow: `0 0 22px -6px ${p.color}` }}>
                    {p.glyph}
                  </span>
                  <div className="mt-3 font-display text-lg font-semibold">{p.name}</div>
                  <div className="truncate font-mono text-xs text-dim">{s.handle ? `@${s.handle}` : "not linked yet"}</div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[10px]">
                    <span className={linked ? "text-cyan" : "text-dim"}>{linked ? "● ONLINE" : "○ OFFLINE"}</span>
                    {linked && <span className="text-ink/80 transition group-hover:translate-x-0.5 group-hover:text-pink">open ↗</span>}
                  </div>
                </Tilt>
              );
              return (
                <motion.div key={p.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + k * 0.08 }}>
                  {linked ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="block h-full" aria-label={`${p.name} profile`}>
                      {Card}
                    </a>
                  ) : (
                    Card
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <GitHubPulse />
    </section>
  );
}
