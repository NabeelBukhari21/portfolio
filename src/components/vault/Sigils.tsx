"use client";

import { motion } from "motion/react";

/**
 * Vault sigil: hex shield + keyhole, counter-rotating HUD rings, a scan beam, orbiting data
 * particles and an occasional glitch. Pure SVG/CSS — cheap to render.
 */
export function VaultSigil({ size = 260, state = "locked" }: { size?: number; state?: "locked" | "busy" | "open" }) {
  const col = state === "open" ? "#3dff9a" : state === "busy" ? "#f2ff3c" : "#00f0ff";
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k - Math.PI / 2;
      return `${100 + Math.cos(a) * r},${100 + Math.sin(a) * r}`;
    }).join(" ");
  return (
    <div className="vault-sigil relative" style={{ width: size, height: size }} data-state={state}>
      <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${col}33, transparent 65%)` }} />
      <svg viewBox="0 0 200 200" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="vsg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#ff2bd6" />
          </linearGradient>
          <clipPath id="vclip">
            <polygon points={hex(58)} />
          </clipPath>
        </defs>
        {/* outer HUD rings */}
        <g className="vs-spin" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke={col} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" />
          <path d="M100 6 a94 94 0 0 1 81 47" fill="none" stroke="url(#vsg)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M100 194 a94 94 0 0 1 -81 -47" fill="none" stroke="url(#vsg)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g className="vs-spin-rev" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="100" r="80" fill="none" stroke="#ff2bd6" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="14 10 2 10" />
          {Array.from({ length: 24 }, (_, k) => {
            const a = (k / 24) * Math.PI * 2;
            return <line key={k} x1={100 + Math.cos(a) * 74} y1={100 + Math.sin(a) * 74} x2={100 + Math.cos(a) * (k % 6 ? 77 : 81)} y2={100 + Math.sin(a) * (k % 6 ? 77 : 81)} stroke={col} strokeOpacity="0.7" />;
          })}
        </g>
        {/* shield */}
        <polygon points={hex(62)} fill="rgba(8,6,24,0.85)" stroke="url(#vsg)" strokeWidth="2" />
        <polygon points={hex(54)} fill="none" stroke={col} strokeOpacity="0.25" />
        <g clipPath="url(#vclip)">
          {/* circuit traces */}
          {["70,80 88,80 88,92", "130,82 114,82 114,94", "72,122 90,122", "126,124 110,124 110,112"].map((pts) => (
            <polyline key={pts} points={pts} fill="none" stroke={col} strokeOpacity="0.35" strokeWidth="1" />
          ))}
          {/* scan beam */}
          <rect className="vs-scan" x="30" y="0" width="140" height="3" fill={col} opacity="0.8" />
        </g>
        {/* keyhole / open check */}
        {state === "open" ? (
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} d="M80 101 l14 14 l28 -30" fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <g className="vs-glitch">
            <circle cx="100" cy="92" r="13" fill="none" stroke={col} strokeWidth="4" />
            <path d="M93 102 h14 l4 24 h-22 z" fill={col} opacity="0.9" />
          </g>
        )}
      </svg>
      {/* orbiting particles */}
      {Array.from({ length: 10 }, (_, k) => (
        <span
          key={k}
          className="vs-dot absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
          style={{ background: k % 2 ? "#ff2bd6" : col, ["--r" as string]: `${size * (0.42 + (k % 3) * 0.05)}px`, animationDelay: `${-k * 0.9}s`, animationDuration: `${7 + (k % 4)}s` }}
        />
      ))}
    </div>
  );
}

/** SENTINEL — the vault's AI. An eye in a segmented ring that reacts to the unlock state. */
export function Sentinel({ mood = "idle", size = 120 }: { mood?: "idle" | "scan" | "grant" | "deny"; size?: number }) {
  const col = mood === "grant" ? "#3dff9a" : mood === "deny" ? "#ff3b5c" : mood === "scan" ? "#f2ff3c" : "#00f0ff";
  return (
    <motion.div
      style={{ width: size, height: size }}
      className="relative"
      animate={mood === "deny" ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="absolute inset-0 rounded-full blur-2xl transition-colors duration-500" style={{ background: `${col}40` }} />
      <svg viewBox="0 0 120 120" className="relative h-full w-full">
        <g className={mood === "scan" ? "vs-spin-fast" : "vs-spin"} style={{ transformOrigin: "60px 60px" }}>
          {Array.from({ length: 12 }, (_, k) => {
            const a0 = (k / 12) * Math.PI * 2, a1 = a0 + 0.36;
            const p = (a: number, r: number) => `${60 + Math.cos(a) * r} ${60 + Math.sin(a) * r}`;
            return <path key={k} d={`M${p(a0, 54)} A54 54 0 0 1 ${p(a1, 54)}`} stroke={col} strokeWidth={k % 3 ? 2 : 4} fill="none" opacity={k % 3 ? 0.5 : 1} style={{ transition: "stroke .4s" }} />;
          })}
        </g>
        <circle cx="60" cy="60" r="40" fill="#07051a" stroke={col} strokeOpacity="0.5" />
        {/* eye */}
        <motion.ellipse
          cx="60"
          cy="60"
          rx="26"
          animate={{ ry: mood === "grant" ? [12, 16, 12] : mood === "deny" ? 4 : [12, 12, 1, 12] }}
          transition={{ duration: mood === "idle" ? 4 : 1.2, repeat: Infinity, times: mood === "idle" ? [0, 0.9, 0.95, 1] : undefined }}
          fill="none"
          stroke={col}
          strokeWidth="2"
        />
        <motion.g animate={mood === "scan" ? { x: [-12, 12, -12] } : { x: 0 }} transition={{ duration: 1, repeat: mood === "scan" ? Infinity : 0, ease: "easeInOut" }}>
          <circle cx="60" cy="60" r="8" fill={col} style={{ transition: "fill .4s", filter: `drop-shadow(0 0 6px ${col})` }} />
          <circle cx="57" cy="57" r="2.2" fill="#fff" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

/** small file-type glyph */
export function FileGlyph({ ext, className = "" }: { ext: string; className?: string }) {
  const kind = /pdf/.test(ext) ? "PDF" : /png|jpe?g|webp|gif|avif|heic/.test(ext) ? "IMG" : /mp4|webm|mov/.test(ext) ? "VID" : /mp3|m4a|wav/.test(ext) ? "AUD" : /docx?|txt|md/.test(ext) ? "DOC" : /xlsx?|csv/.test(ext) ? "XLS" : /pptx?/.test(ext) ? "PPT" : /zip/.test(ext) ? "ZIP" : "BIN";
  const col = { PDF: "#ff3b5c", IMG: "#00f0ff", VID: "#ff2bd6", AUD: "#a78bfa", DOC: "#60a5fa", XLS: "#3dff9a", PPT: "#ffb020", ZIP: "#f2ff3c", BIN: "#8f8bab" }[kind];
  return (
    <svg viewBox="0 0 48 58" className={className}>
      <path d="M4 2h28l12 12v40a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="rgba(255,255,255,0.03)" stroke={col} strokeWidth="1.5" />
      <path d="M32 2v12h12" fill="none" stroke={col} strokeWidth="1.5" />
      <rect x="2" y="34" width="34" height="14" fill={col} />
      <text x="19" y="44.5" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="monospace" fill="#06050c">
        {kind}
      </text>
    </svg>
  );
}
