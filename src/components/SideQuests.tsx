"use client";

import { AnimatePresence, motion } from "motion/react";
import { sideQuests } from "@/content/profile";

export function SideQuests({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Side quests"
            initial={{ scale: 0.9, rotate: -1 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="cut panel w-full max-w-lg p-6 shadow-[0_0_80px_-20px_rgba(242,255,60,0.5)]"
          >
            <div className="font-mono text-xs text-volt">★ HIDDEN LEVEL UNLOCKED</div>
            <h3 className="mt-1 font-display text-3xl font-bold uppercase">Side Quests</h3>
            <p className="mt-1 text-sm text-dim">
              The grind that paid for the code. Overnight freight, packed flea markets, lunch rushes — where I learned to work under pressure and talk to anyone.
            </p>
            <ul className="mt-5 space-y-3">
              {sideQuests.map((q) => (
                <li key={q.title + q.org} className="border-l-2 border-volt/60 pl-3">
                  <div className="font-display font-semibold">
                    {q.title} <span className="text-dim">· {q.org}</span>
                  </div>
                  <div className="font-mono text-[11px] text-dim">
                    {q.period} — {q.note}
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="mt-6 font-mono text-xs text-pink hover:underline">
              [ close ]
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
