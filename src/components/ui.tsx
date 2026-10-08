"use client";

import { useState } from "react";

/** Image that falls back to a neon placeholder when the file isn't there yet. */
export function Photo({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`grid-bg flex items-center justify-center border border-dashed border-line bg-panel-2 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="px-3 font-mono text-[10px] leading-relaxed text-dim">
          <div className="text-pink">[ photo slot ]</div>
          {src ? <div>public{src}</div> : <div>{alt}</div>}
        </div>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className={`object-cover ${className}`} />
  );
}

export function SectionTitle({ index, jp, title, kicker }: { index: string; jp: string; title: string; kicker?: string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 font-mono text-xs tracking-[0.3em] text-cyan">
        <span>{index}</span>
        <span className="h-px w-12 bg-cyan/50" />
        <span className="font-jp tracking-normal text-pink">{jp}</span>
      </div>
      <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">{title}</h2>
      {kicker && <p className="mt-3 max-w-2xl text-dim">{kicker}</p>}
    </div>
  );
}

export function Chip({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "pink" | "volt" }) {
  const tones = {
    cyan: "border-cyan/40 text-cyan",
    pink: "border-pink/40 text-pink",
    volt: "border-volt/40 text-volt",
  };
  return <span className={`inline-block border px-2 py-0.5 font-mono text-[11px] ${tones[tone]}`}>{children}</span>;
}

export function NeonButton({
  href,
  onClick,
  children,
  tone = "cyan",
  external,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  tone?: "cyan" | "pink";
  external?: boolean;
}) {
  const cls =
    tone === "cyan"
      ? "bg-cyan text-void hover:shadow-[0_0_24px_rgba(0,240,255,0.7)]"
      : "border border-pink text-pink hover:bg-pink hover:text-void";
  const base = `cut-sm inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-wider transition ${cls}`;
  if (href)
    return (
      <a href={href} className={base} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={base}>
      {children}
    </button>
  );
}
