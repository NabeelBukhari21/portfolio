"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { site, skills } from "@/content/profile";
import { Hero } from "./Hero";
import { ArchitectureMap } from "./ArchitectureMap";
import { Pipeline } from "./Pipeline";
import { Projects } from "./Projects";
import { CharacterSelect } from "./CharacterSelect";
import { Ventures } from "./Ventures";
import { AskNabeel } from "./AskNabeel";
import { Contact } from "./Contact";
import { Terminal } from "./Terminal";
import { SideQuests } from "./SideQuests";
import { RecruiterView } from "./RecruiterView";
import { NeuralHUD } from "./neural/NeuralHUD";
import { HandCursor } from "./neural/HandCursor";
import { Vault } from "./vault/Vault";
import { Nav } from "./Nav";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];



function SkillMarquee() {
  const all = Object.values(skills).flat();
  const row = [...all, ...all];
  return (
    <div className="relative overflow-hidden border-y border-line bg-panel/60 py-3" aria-hidden>
      <div className="marquee flex w-max gap-8 font-mono text-sm text-dim">
        {row.map((s, i) => (
          <span key={i} className="whitespace-nowrap">
            <span className="text-pink">◆</span> {s}
          </span>
        ))}
      </div>
    </div>
  );
}

const noopSubscribe = () => () => {};

export function Shell() {
  // ?mode=recruiter deep link — put this URL on your resume
  const urlRecruiter = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("mode") === "recruiter",
    () => false,
  );
  const [override, setRecruiter] = useState<boolean | null>(null);
  const recruiter = override ?? urlRecruiter;
  const [term, setTerm] = useState(false);
  const [quests, setQuests] = useState(false);

  // Every visit or refresh starts on the landing page (the browser doesn't restore an old scroll spot)
  useEffect(() => {
    if (recruiter) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    const top = () => window.scrollTo({ top: 0, behavior: "instant" });
    top();
    // again after fonts, images and lazy sections settle
    const t1 = setTimeout(top, 120);
    const t2 = setTimeout(top, 600);
    const stop = () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // the visitor started scrolling — don't yank them back
    addEventListener("wheel", stop, { once: true, passive: true });
    addEventListener("touchstart", stop, { once: true, passive: true });
    addEventListener("keydown", stop, { once: true });
    return () => {
      stop();
      removeEventListener("wheel", stop);
      removeEventListener("touchstart", stop);
      removeEventListener("keydown", stop);
    };
  }, [recruiter]);

  // Keyboard: ` opens terminal, Konami code unlocks side quests
  useEffect(() => {
    let seq: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if (!typing && e.key === "`") {
        e.preventDefault();
        setTerm((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setTerm(false);
        setQuests(false);
      }
      if (typing) return;
      seq = [...seq, e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => seq[i]?.toLowerCase() === k.toLowerCase())) {
        setQuests(true);
        seq = [];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleRecruiter() {
    const next = !recruiter;
    setRecruiter(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("mode", "recruiter");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <Nav recruiter={recruiter} onToggleRecruiter={toggleRecruiter} onTerminal={() => setTerm(true)} />

      {recruiter ? (
        <RecruiterView />
      ) : (
        <main>
          <Hero />
          <SkillMarquee />
          <ArchitectureMap />
          <Pipeline />
          <Projects />
          <CharacterSelect />
          <Ventures />
          <AskNabeel />
          <Vault />
          <Contact />
        </main>
      )}

      <footer className="border-t border-line py-8 text-center font-mono text-[11px] text-dim print:hidden">
        <div>
          © {new Date().getFullYear()} {site.name} · built with Next.js, deployed on Vercel ·{" "}
          <button onClick={() => setTerm(true)} className="text-cyan hover:underline">
            press ` for terminal
          </button>
        </div>
        <div className="mt-1 font-jp text-dim/60">コードで未来を作る</div>
      </footer>

      <button
        onClick={() => setTerm(true)}
        className="cut-sm fixed right-4 bottom-4 z-40 bg-cyan px-3 py-2 font-mono text-xs font-semibold text-void shadow-[0_0_24px_rgba(0,240,255,0.5)] sm:hidden"
        aria-label="Open terminal"
      >
        &gt;_
      </button>

      <Terminal open={term} onClose={() => setTerm(false)} onSideQuests={() => setQuests(true)} onRecruiter={() => !recruiter && toggleRecruiter()} />
      <SideQuests open={quests} onClose={() => setQuests(false)} />
      <NeuralHUD />
      <HandCursor />
    </>
  );
}
