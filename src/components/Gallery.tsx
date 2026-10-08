"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Shot } from "@/content/profile";
import { Photo } from "./ui";

/** Fullscreen viewer: ← → to move, Esc to close, swipe-friendly buttons on mobile. */
export function Lightbox({
  shots,
  index,
  title,
  onClose,
  onIndex,
}: {
  shots: Shot[];
  index: number | null;
  title: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index !== null;
  const i = index ?? 0;
  const go = useCallback((d: number) => onIndex((i + d + shots.length) % shots.length), [i, shots.length, onIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col bg-void/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={`${title} screenshots`}
          onClick={onClose}
        >
          <div className="flex items-center justify-between px-4 py-3 font-mono text-xs text-dim" onClick={(e) => e.stopPropagation()}>
            <span>
              <span className="text-cyan">{title}</span> · {i + 1}/{shots.length}
            </span>
            <button onClick={onClose} className="border border-pink px-2 py-1 text-pink hover:bg-pink hover:text-void">
              close [esc]
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-14" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.div
                key={shots[i].src}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex max-h-full max-w-6xl items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shots[i].src} alt={shots[i].caption || title} className="max-h-[72vh] w-auto max-w-full border border-line object-contain" />
              </motion.div>
            </AnimatePresence>
            {shots.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Previous screenshot"
                  className="cut-sm absolute left-1 top-1/2 -translate-y-1/2 border border-cyan/50 bg-panel/90 px-3 py-4 font-mono text-cyan hover:bg-cyan hover:text-void sm:left-3"
                >
                  ←
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Next screenshot"
                  className="cut-sm absolute right-1 top-1/2 -translate-y-1/2 border border-cyan/50 bg-panel/90 px-3 py-4 font-mono text-cyan hover:bg-cyan hover:text-void sm:right-3"
                >
                  →
                </button>
              </>
            )}
          </div>

          <div className="px-4 pt-3 text-center text-sm text-ink/90" onClick={(e) => e.stopPropagation()}>
            {shots[i].caption}
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 py-3" onClick={(e) => e.stopPropagation()}>
            {shots.map((s, n) => (
              <button
                key={s.src}
                onClick={() => onIndex(n)}
                aria-label={`Show screenshot ${n + 1}`}
                className={`h-12 w-20 shrink-0 overflow-hidden border transition ${n === i ? "border-cyan" : "border-line opacity-50 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt="" className="h-full w-full object-cover object-top" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Cover image + thumbnail strip that opens the lightbox. */
export function GalleryPreview({ shots, title, onOpen }: { shots: Shot[]; title: string; onOpen: (i: number) => void }) {
  const [hover, setHover] = useState(0);
  if (!shots.length) return <Photo alt={`${title} screenshot`} className="aspect-video w-full" />;
  const cover = shots[hover] ?? shots[0];
  const thumbs = shots.slice(0, 5);
  const more = shots.length - thumbs.length;

  return (
    <div>
      <button onClick={() => onOpen(hover)} className="group/cover relative block w-full overflow-hidden" aria-label={`Open ${title} screenshots`}>
        <Photo src={cover.src} alt={cover.caption || `${title} screenshot`} className="aspect-video w-full object-top transition duration-500 group-hover/cover:scale-[1.02]" />
        {shots.length > 1 && (
          <span className="absolute right-2 bottom-2 bg-void/85 px-2 py-1 font-mono text-[11px] text-cyan opacity-90 group-hover/cover:opacity-100">
            ⤢ {shots.length} screenshots
          </span>
        )}
      </button>
      {shots.length > 1 && (
        <div className="flex gap-1.5 border-t border-line bg-panel-2/60 p-1.5">
          {thumbs.map((s, n) => (
            <button
              key={s.src}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => onOpen(n)}
              aria-label={s.caption || `Screenshot ${n + 1}`}
              className={`h-10 flex-1 overflow-hidden border transition ${n === hover ? "border-cyan" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
            </button>
          ))}
          {more > 0 && (
            <button onClick={() => onOpen(thumbs.length)} className="flex h-10 flex-1 items-center justify-center border border-line font-mono text-[11px] text-dim hover:text-cyan">
              +{more}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
