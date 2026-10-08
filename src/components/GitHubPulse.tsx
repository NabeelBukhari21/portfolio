"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/content/profile";

type Day = { date: string; count: number; level: number };
type Commit = { repo: string; message: string; date: string; url: string };
type Payload = { user: string; total: number; days: Day[]; commits: Commit[]; feedOk?: boolean; fetchedAt: string };

const LEVEL = ["rgba(255,255,255,0.05)", "#0b4f63", "#0094b8", "#00f0ff", "#ff2bd6"];
const cut = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function stats(days: Day[]) {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // current streak: count back from today (today may still be empty)
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  const best = days.reduce((a, d) => (d.count > a.count ? d : a), days[0] ?? { date: "", count: 0, level: 0 });
  return { longest, current, best };
}

type View = { weeks: (Day | null)[][]; months: string[] };

/** the 53×7 grid — memoised so the once-a-second "synced Xs ago" tick doesn't re-render 371 cells */
const Heatmap = memo(function Heatmap({ view, seen, onTip }: { view: View; seen: boolean; onTip: (d: Day) => void }) {
  return (
    <div className="w-max">
      <div className="mb-1 flex gap-[3px] pl-0 font-mono text-[9px] text-dim">
        {view.months.map((m, i) => (
          <span key={i} className="w-[11px] overflow-visible whitespace-nowrap">
            {m}
          </span>
        ))}
      </div>
      <div className="flex gap-[3px]" style={{ perspective: 600 }}>
        {view.weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, di) => {
              const d = w[di];
              return (
                <span
                  key={di}
                  onMouseEnter={() => d && onTip(d)}
                  className={`block h-[11px] w-[11px] rounded-[2px] ${seen ? "gh-cell" : "opacity-0"}`}
                  style={{
                    background: d ? LEVEL[d.level] : "transparent",
                    boxShadow: d && d.level >= 3 ? `0 0 6px ${LEVEL[d.level]}` : undefined,
                    animationDelay: `${wi * 18 + di * 6}ms`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export function GitHubPulse() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [tip, setTip] = useState<Day | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/github")
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.error) setErr(j.error);
          else {
            setData(j);
            setErr(null);
          }
        })
        .catch(() => alive && setErr("GitHub is unreachable right now."));
    load();
    const poll = setInterval(load, 120_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  // phones: start the heatmap at the most recent weeks
  useEffect(() => {
    if (data && scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [data]);

  const view = useMemo(() => {
    if (!data?.days.length) return null;
    const days = data.days;
    const pad = new Date(days[0].date + "T00:00:00").getDay(); // GitHub weeks start on Sunday
    const cells: (Day | null)[] = [...Array(pad).fill(null), ...days];
    const weeks: (Day | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const months = weeks.map((w, i) => {
      const first = w.find(Boolean);
      if (!first) return "";
      const m = new Date(first.date + "T00:00:00").getMonth();
      const prev = weeks[i - 1]?.find(Boolean);
      return !prev || new Date(prev.date + "T00:00:00").getMonth() !== m ? MONTHS[m] : "";
    });
    return { weeks, months, ...stats(days) };
  }, [data]);

  const profile = site.github;

  return (
    <div ref={box} className="mt-10 p-px" style={{ clipPath: cut(18), background: "linear-gradient(120deg, rgba(0,240,255,0.7), rgba(255,255,255,0.08) 35%, rgba(255,43,214,0.6))" }}>
      <div className="relative overflow-hidden bg-[#07051a]/95" style={{ clipPath: cut(18) }}>
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)]" />

        {/* header */}
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 px-4 py-3 font-mono text-[11px] md:px-6">
          <span className="flex items-center gap-2 tracking-[0.25em] text-cyan">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
            </svg>
            GIT.LOG
          </span>
          <a href={profile} target="_blank" rel="noreferrer" className="text-dim hover:text-cyan">
            @{data?.user ?? profile.split("/").pop()} ↗
          </a>
          <span className="ml-auto flex items-center gap-2 text-dim">
            <span className={`h-1.5 w-1.5 rounded-full ${err ? "bg-[#ff3b5c]" : data ? "animate-pulse bg-ok" : "bg-volt"}`} />
            {err ? "SIGNAL LOST" : data ? `LIVE · synced ${ago(data.fetchedAt, now || Date.parse(data.fetchedAt))}` : "CONNECTING…"}
          </span>
        </div>

        {err && !data ? (
          <div className="relative px-6 py-10 text-center font-mono text-xs text-dim">
            {err}{" "}
            <a href={profile} target="_blank" rel="noreferrer" className="text-cyan hover:underline">
              Open my GitHub ↗
            </a>
          </div>
        ) : (
          <div className="relative grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* heatmap + stats */}
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [data ? data.total.toLocaleString() : "—", "contributions · last year", "#00f0ff"],
                  [view ? `${view.current}d` : "—", "current streak", "#3dff9a"],
                  [view ? `${view.longest}d` : "—", "longest streak", "#ff2bd6"],
                  [view?.best?.count ? String(view.best.count) : "—", "best day", "#f2ff3c"],
                ].map(([v, l, c]) => (
                  <div key={l} className="border-l-2 bg-white/[0.03] px-3 py-2" style={{ borderColor: c }}>
                    <div className="font-display text-2xl font-bold leading-none md:text-3xl" style={{ color: c, textShadow: `0 0 18px ${c}55` }}>
                      {v}
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">{l}</div>
                  </div>
                ))}
              </div>

              <div ref={scroller} className="mt-5 overflow-x-auto pb-2 [scrollbar-width:thin]" onMouseLeave={() => setTip(null)}>
                {view ? (
                  <Heatmap view={view} seen={seen} onTip={setTip} />
                ) : (
                  <div className="h-[104px] w-full animate-pulse bg-white/[0.03]" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-dim">
                <span className="min-h-[1em] text-ink/80">
                  {tip
                    ? `${tip.count} contribution${tip.count === 1 ? "" : "s"} · ${new Date(tip.date + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`
                    : "hover a cell"}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  less
                  {LEVEL.map((c) => (
                    <span key={c} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: c }} />
                  ))}
                  more
                </span>
              </div>
            </div>

            {/* live commit feed */}
            <div className="min-w-0 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-dim">
                <span className="text-[#ff3b5c]">RECENT COMMITS</span>
                <span>tail -f</span>
              </div>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {(data?.commits ?? []).map((c, i) => (
                    <motion.li key={c.url + i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <a href={c.url} target="_blank" rel="noreferrer" className="group block border-l-2 border-transparent px-2 py-1 transition hover:border-cyan hover:bg-white/[0.03]">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="truncate text-cyan">{c.repo}</span>
                          <span className="ml-auto shrink-0 text-dim">{ago(c.date, now || Date.parse(data!.fetchedAt))}</span>
                        </div>
                        <div className="truncate text-[12.5px] text-ink/85 group-hover:text-ink">{c.message}</div>
                      </a>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {data && !data.commits.length && (
                  <li className="font-mono text-[11px] text-dim">
                    {data.feedOk === false ? "Commit feed is catching its breath (GitHub rate limit) — " : "No public pushes recently — "}
                    <a href={`${profile}?tab=repositories`} target="_blank" rel="noreferrer" className="text-cyan hover:underline">
                      browse repos ↗
                    </a>
                  </li>
                )}
                {!data && !err && <li className="font-mono text-[11px] text-dim">connecting to github…</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
