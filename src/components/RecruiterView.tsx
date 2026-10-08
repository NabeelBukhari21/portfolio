"use client";

import { education, experience, projects, site, skills, summary } from "@/content/profile";

/** Clean, fast, printable one-pager. Linkable via ?mode=recruiter */
export function RecruiterView() {
  const shown = projects.filter((p) => !p.tagline.startsWith("TODO"));
  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-20 md:px-6 print:pt-4">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-4xl font-bold uppercase">{site.name}</h1>
        <div className="mt-1 text-lg text-cyan">{site.headline}</div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm text-dim">
          <span>{site.location}</span>
          <a href={`mailto:${site.email}`} className="hover:text-cyan">
            {site.email}
          </a>
          <a href={site.linkedin} className="hover:text-cyan">
            LinkedIn
          </a>
          <a href={site.github} className="hover:text-cyan">
            GitHub
          </a>
          <a href={site.resumeUrl} className="text-pink hover:underline">
            Resume PDF ↓
          </a>
        </div>
        <p className="mt-4 text-ink/90">{summary.join(" ")}</p>
      </header>

      <Section title="Experience">
        {experience.map((r) => (
          <div key={r.slug} className="mb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-semibold">
                {r.title} · <span className="text-cyan">{r.company}</span>
              </div>
              <div className="font-mono text-xs text-dim">{r.period}</div>
            </div>
            <div className="font-mono text-xs text-dim">
              {r.type} · {r.location}
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
              {r.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Projects">
        {shown.map((p) => (
          <div key={p.slug} className="mb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-semibold">
                {p.name} <span className="text-dim">— {p.tagline}</span>
              </div>
              <div className="font-mono text-xs text-dim">{p.period}</div>
            </div>
            <div className="font-mono text-xs text-cyan">{p.stack.join(" · ")}</div>
            {(p.links.github || p.links.demo || p.links.report || p.links.devpost || p.links.post) && (
              <div className="mt-0.5 flex gap-3 font-mono text-xs">
                {p.links.github && <a href={p.links.github} className="text-pink hover:underline">source ↗</a>}
                {p.links.demo && <a href={p.links.demo} className="text-pink hover:underline">live demo ↗</a>}
                {p.links.report && <a href={p.links.report} className="text-pink hover:underline">report (PDF) ↗</a>}
                {p.links.devpost && <a href={p.links.devpost} className="text-pink hover:underline">devpost ↗</a>}
                {p.links.post && <a href={p.links.post} className="text-pink hover:underline">write-up ↗</a>}
              </div>
            )}
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
              {p.bullets.slice(0, 2).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Skills">
        {Object.entries(skills).map(([k, v]) => (
          <div key={k} className="mb-1 text-sm">
            <span className="font-semibold text-cyan">{k}:</span> <span className="text-ink/85">{v.join(", ")}</span>
          </div>
        ))}
      </Section>

      <Section title="Education">
        {education.slice(0, 2).map((e) => (
          <div key={e.school} className="mb-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">
                {e.credential} · {e.school}
              </span>
              <span className="font-mono text-xs text-dim">{e.period}</span>
            </div>
            {e.notes.length > 0 && <div className="text-ink/75">{e.notes.join(" · ")}</div>}
          </div>
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-pink">{title}</h2>
      {children}
    </section>
  );
}
