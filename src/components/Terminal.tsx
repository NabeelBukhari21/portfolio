"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { experience, projects, site, skills } from "@/content/profile";

type Line = { kind: "in" | "out" | "err"; text: string };

const SECTIONS = ["top", "map", "pipeline", "projects", "character", "ventures", "ask", "contact"];

export function Terminal({
  open,
  onClose,
  onSideQuests,
  onRecruiter,
}: {
  open: boolean;
  onClose: () => void;
  onSideQuests: () => void;
  onRecruiter: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: `nabeel.os terminal — type 'help' to see commands.` },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  function goto(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    onClose();
  }

  function run(raw: string) {
    const cmd = raw.trim();
    const out: Line[] = [{ kind: "in", text: cmd }];
    const [c, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ").toLowerCase();
    const say = (t: string) => out.push({ kind: "out", text: t });

    switch (c?.toLowerCase()) {
      case "":
        break;
      case "help":
        say(
          [
            "whoami            who is this guy",
            "ls                list projects",
            "open <project>    jump to a project (e.g. open rentos)",
            "goto <section>    " + SECTIONS.join(" | "),
            "skills            print the skill tree",
            "xp                work history",
            "neofetch          system info",
            "resume            download resume",
            "contact           how to reach me",
            "recruiter         switch to recruiter mode",
            "sidequests        ???",
            "clear / exit",
          ].join("\n"),
        );
        break;
      case "whoami":
        say(`${site.name} — ${site.headline}\n${site.tagline}`);
        break;
      case "ls":
        say(projects.map((p) => `${p.slug.padEnd(18)} ${p.name}`).join("\n"));
        break;
      case "open": {
        const p = projects.find((x) => x.slug === arg || x.name.toLowerCase().includes(arg));
        if (!arg || !p) out.push({ kind: "err", text: `open: no such project '${arg}'. try 'ls'.` });
        else {
          say(`opening ${p.name}…`);
          setTimeout(() => goto(`project-${p.slug}`), 300);
        }
        break;
      }
      case "goto":
      case "cd":
        if (SECTIONS.includes(arg)) {
          say(`→ ${arg}`);
          setTimeout(() => goto(arg), 200);
        } else out.push({ kind: "err", text: `goto: unknown section. options: ${SECTIONS.join(", ")}` });
        break;
      case "skills":
        say(Object.entries(skills).map(([k, v]) => `[${k}]\n  ${v.join(", ")}`).join("\n"));
        break;
      case "xp":
        say(experience.map((e) => `${e.period.padEnd(22)} ${e.title} @ ${e.company}`).join("\n"));
        break;
      case "neofetch":
        say(
          [
            `      ▲      ${site.short}@toronto`,
            `     ▲ ▲     -----------------`,
            `    ▲   ▲    OS: Nabeel.OS 2026.10`,
            `   ▲▲▲▲▲▲▲   Host: Seneca Polytechnic (grad 2026)`,
            `             Kernel: rugby-captain-6.x`,
            `             Shell: vibe-code (daily)`,
            `             Cloud: AWS · Supabase`,
            `             AI: Gemini · MediaPipe`,
            `             Uptime: 22 years`,
          ].join("\n"),
        );
        break;
      case "resume":
        say("downloading resume…");
        window.open(site.resumeUrl, "_blank");
        break;
      case "contact":
        say(`email: ${site.email}\nlinkedin: ${site.linkedin}\ngithub: ${site.github}`);
        break;
      case "recruiter":
        say("switching to recruiter mode…");
        setTimeout(() => {
          onRecruiter();
          onClose();
        }, 300);
        break;
      case "sidequests":
        say("unlocking hidden level… 🎮");
        setTimeout(() => {
          onSideQuests();
          onClose();
        }, 400);
        break;
      case "sudo":
        if (arg.startsWith("hire")) say("[sudo] password for recruiter: ********\n✓ permission granted. please email " + site.email);
        else out.push({ kind: "err", text: "nice try." });
        break;
      case "rm":
        out.push({ kind: "err", text: "rm: permission denied. this portfolio is load-bearing." });
        break;
      case "clear":
        setLines([]);
        setInput("");
        return;
      case "exit":
        onClose();
        break;
      default:
        out.push({ kind: "err", text: `command not found: ${c}. type 'help'.` });
    }
    setLines((l) => [...l, ...out]);
    if (cmd) setHistory((h) => [cmd, ...h].slice(0, 50));
    setHIdx(-1);
    setInput("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-void/70 p-3 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Terminal"
            className="cut panel w-full max-w-2xl shadow-[0_0_80px_-20px_rgba(0,240,255,0.6)]"
            initial={{ y: 30, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 30, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-[11px] text-dim">
              <span>~/nabeel — zsh</span>
              <button onClick={onClose} className="text-pink hover:underline">
                [esc]
              </button>
            </div>
            <div ref={bodyRef} className="h-[360px] overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed" onClick={() => inputRef.current?.focus()}>
              {lines.map((l, i) => (
                <pre key={i} className={`whitespace-pre-wrap ${l.kind === "in" ? "text-cyan" : l.kind === "err" ? "text-pink" : "text-ink/90"}`}>
                  {l.kind === "in" ? `❯ ${l.text}` : l.text}
                </pre>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(input);
                }}
                className="flex items-center gap-2"
              >
                <span className="text-ok">❯</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onClose();
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const n = Math.min(hIdx + 1, history.length - 1);
                      if (history[n]) {
                        setHIdx(n);
                        setInput(history[n]);
                      }
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const n = hIdx - 1;
                      setHIdx(Math.max(n, -1));
                      setInput(n >= 0 ? history[n] : "");
                    }
                  }}
                  aria-label="Terminal command"
                  className="flex-1 bg-transparent text-ink outline-none"
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
