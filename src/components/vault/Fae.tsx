"use client";

import { motion } from "motion/react";

/**
 * FAE — the vault's guardian: a holographic cyber-fairy with circuit-veined wings, plus the
 * iris aperture she guards. Pure SVG + CSS transforms (no filters, no canvas) so it stays cheap.
 */

export type FaeMood = "idle" | "scan" | "deny" | "grant";
const MOOD: Record<FaeMood, string> = { idle: "#00f0ff", scan: "#f2ff3c", deny: "#ff3b5c", grant: "#3dff9a" };

const UPPER = "M100 98 C 78 62, 30 14, 14 34 C 0 54, 30 96, 100 106 Z";
const LOWER = "M100 110 C 74 116, 30 140, 36 166 C 42 186, 78 150, 100 116 Z";
const VEINS = ["M100 100 L 30 40", "M100 102 L 22 66", "M60 78 L 44 52", "M100 112 L 46 160", "M70 132 L 52 146"];

function Wing({ d, flap, delay, color }: { d: string; flap: string; delay: number; color: string }) {
  return (
    <g className="fae-wing" style={{ animationDuration: flap, animationDelay: `${delay}s` }}>
      <path d={d} fill="url(#faeWing)" stroke={color} strokeOpacity="0.9" strokeWidth="1.2" />
      {VEINS.map((v) => (
        <path key={v} d={v} stroke={color} strokeOpacity="0.35" strokeWidth="0.7" fill="none" />
      ))}
    </g>
  );
}

export function Fae({ mood = "idle", size = 220, className = "" }: { mood?: FaeMood; size?: number; className?: string }) {
  const c = MOOD[mood];
  const flap = mood === "scan" ? "0.18s" : mood === "grant" ? "0.35s" : mood === "deny" ? "2.4s" : "1.1s";
  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: size, height: size * 1.2 }}
      animate={mood === "deny" ? { x: [0, -10, 9, -6, 3, 0] } : { x: 0, y: [0, -8, 0] }}
      transition={mood === "deny" ? { duration: 0.45 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* glow */}
      <div className="absolute inset-[18%] rounded-full blur-2xl transition-colors duration-500" style={{ background: `${c}33` }} />
      <svg viewBox="0 0 200 240" className="relative h-full w-full overflow-visible" style={{ filter: `drop-shadow(0 0 6px ${c})` }}>
        <defs>
          <linearGradient id="faeWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.38" />
            <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff2bd6" stopOpacity="0.32" />
          </linearGradient>
        </defs>

        {/* wings: left side, then mirrored */}
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? "translate(200,0) scale(-1,1)" : undefined}>
            <Wing d={UPPER} flap={flap} delay={0} color={c} />
            <Wing d={LOWER} flap={flap} delay={0.08} color={c} />
          </g>
        ))}

        {/* halo */}
        <ellipse cx="100" cy="44" rx="16" ry="4" fill="none" stroke={c} strokeWidth="1.5" className="fae-halo" />
        {/* antennae */}
        <path d="M95 55 Q 86 40 80 36 M105 55 Q 114 40 120 36" stroke={c} strokeWidth="1" fill="none" />
        <circle cx="80" cy="36" r="1.8" fill="#ff2bd6" />
        <circle cx="120" cy="36" r="1.8" fill="#ff2bd6" />
        {/* head + visor */}
        <circle cx="100" cy="64" r="10" fill="#0b0920" stroke={c} strokeWidth="1.4" />
        <rect x="92" y="61" width="16" height="4" rx="2" fill={c} className={mood === "scan" ? "fae-visor-scan" : ""} />
        {/* body */}
        <path d="M100 76 L111 94 L105 128 L95 128 L89 94 Z" fill="#0b0920" stroke={c} strokeWidth="1.4" />
        <path d="M100 80 L100 124 M94 96 L106 96 M95 108 L105 108" stroke={c} strokeOpacity="0.5" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="2.4" fill="#ff2bd6" className="fae-core" />
        {/* arms */}
        <path d="M90 92 L76 112 L72 128 M110 92 L124 112 L128 128" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* skirt of light + legs */}
        <path d="M95 126 L80 156 L120 156 L105 126 Z" fill={`${c}22`} stroke={c} strokeWidth="1" />
        <path d="M96 156 L93 188 M104 156 L107 188" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
        {/* falling pixie-dust */}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <rect key={k} x={86 + k * 5.5} y={196} width="2" height="2" fill={k % 2 ? "#ff2bd6" : c} className="fae-dust" style={{ animationDelay: `${k * 0.35}s` }} />
        ))}
        {/* scan beam (busy) */}
        {mood === "scan" && <path d="M100 66 L40 -60 L160 -60 Z" fill={`${c}18`} className="fae-beam" />}
      </svg>
    </motion.div>
  );
}

/** the iris aperture — 8 armoured petals that slide away radially to reveal the core */
export function Iris({ open, tone = "#00f0ff", size = 420, spin = false }: { open: boolean; tone?: string; size?: number | string; spin?: boolean }) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2, am = (a0 + a1) / 2;
    const R = 92;
    const p = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
    return { d: `M0 0 L${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)} Z`, dx: Math.cos(am), dy: Math.sin(am), i };
  });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="-100 -100 200 200" className="h-full w-full overflow-visible">
        <defs>
          <clipPath id="irisClip">
            <circle r="92" />
          </clipPath>
          <radialGradient id="irisCore">
            <stop offset="0%" stopColor="#3dff9a" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#00f0ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06050c" stopOpacity="1" />
          </radialGradient>
          <pattern id="irisHex" width="10" height="17.3" patternUnits="userSpaceOnUse">
            <path d="M5 0 L10 2.9 L10 8.7 L5 11.5 L0 8.7 L0 2.9 Z" fill="none" stroke="#00f0ff" strokeOpacity="0.14" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* the core you see once it opens */}
        <circle r="92" fill="url(#irisCore)" />
        {[20, 34, 48, 62].map((r, k) => (
          <circle key={r} r={r} fill="none" stroke={k % 2 ? "#ff2bd6" : "#3dff9a"} strokeOpacity="0.5" strokeDasharray={k % 2 ? "2 4" : "10 6"} className={k % 2 ? "vs-spin-rev" : "vs-spin"} style={{ transformOrigin: "0 0" }} />
        ))}
        <text y="4" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#e9e7f5" letterSpacing="2">
          NABEEL.OS
        </text>

        {/* petals */}
        <g clipPath="url(#irisClip)">
          {petals.map((pt) => (
            <motion.g
              key={pt.i}
              initial={false}
              animate={open ? { x: pt.dx * 150, y: pt.dy * 150, rotate: 40 } : { x: 0, y: 0, rotate: 0 }}
              transition={{ duration: open ? 1.1 : 0.6, ease: [0.7, 0, 0.2, 1], delay: open ? pt.i * 0.04 : 0 }}
              style={{ transformOrigin: "0px 0px", transformBox: "view-box" }}
            >
              <path d={pt.d} fill="#100d24" stroke={tone} strokeOpacity="0.55" strokeWidth="0.6" />
              <path d={pt.d} fill="url(#irisHex)" />
            </motion.g>
          ))}
        </g>

        {/* rim */}
        <g className={spin ? "vs-spin-fast" : "vs-spin"} style={{ transformOrigin: "0 0" }}>
          <circle r="96" fill="none" stroke={tone} strokeWidth="1.5" strokeDasharray="30 8 4 8" />
        </g>
        <circle r="99" fill="none" stroke="#ff2bd6" strokeOpacity="0.4" strokeWidth="0.6" />
        {Array.from({ length: 48 }, (_, k) => {
          const a = (k / 48) * Math.PI * 2;
          return <line key={k} x1={Math.cos(a) * 92} y1={Math.sin(a) * 92} x2={Math.cos(a) * (k % 6 ? 94 : 97)} y2={Math.sin(a) * (k % 6 ? 94 : 97)} stroke={tone} strokeOpacity="0.8" strokeWidth="0.6" />;
        })}
      </svg>
    </div>
  );
}
