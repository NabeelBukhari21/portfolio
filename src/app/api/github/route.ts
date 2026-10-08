import { site } from "@/content/profile";

/**
 * Live GitHub activity for the Channel section: the contribution calendar (last year) and the
 * latest commits. Everything here is already public on github.com.
 *
 * With GITHUB_TOKEN set (a fine-grained token with no extra permissions is enough) it uses the
 * official GraphQL API. Without it, it reads the public contributions page + public events feed.
 * Responses are cached for a few minutes so we stay far under GitHub's rate limits.
 */

export const revalidate = 300;

const USER = site.github.replace(/\/+$/, "").split("/").pop() ?? "";
const UA = { "User-Agent": "nabeel-portfolio" };

type Day = { date: string; count: number; level: number };
type Commit = { repo: string; message: string; date: string; url: string };
type Payload = { user: string; total: number; days: Day[]; commits: Commit[]; feedOk: boolean; source: "graphql" | "public"; fetchedAt: string };

const levelOf = (n: number, max: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / Math.max(1, max)) * 4)));

async function viaGraphQL(token: string): Promise<Payload> {
  const query = `query($login:String!){user(login:$login){
    contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}
    repositories(first:6, orderBy:{field:PUSHED_AT, direction:DESC}, ownerAffiliations:OWNER, privacy:PUBLIC){nodes{name url
      defaultBranchRef{target{... on Commit{history(first:4){nodes{messageHeadline committedDate url}}}}}}}}}`;
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...UA, Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USER } }),
    next: { revalidate },
  });
  if (!r.ok) throw new Error(`graphql ${r.status}`);
  const j = await r.json();
  const u = j?.data?.user;
  if (!u) throw new Error("no user");
  const cal = u.contributionsCollection.contributionCalendar;
  const flat: { date: string; count: number }[] = cal.weeks.flatMap((w: { contributionDays: { date: string; contributionCount: number }[] }) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
  );
  const max = Math.max(...flat.map((d) => d.count), 1);
  const commits: Commit[] = [];
  for (const repo of u.repositories.nodes ?? []) {
    for (const c of repo.defaultBranchRef?.target?.history?.nodes ?? []) {
      commits.push({ repo: repo.name, message: c.messageHeadline, date: c.committedDate, url: c.url });
    }
  }
  commits.sort((a, b) => b.date.localeCompare(a.date));
  return {
    user: USER,
    total: cal.totalContributions,
    days: flat.map((d) => ({ ...d, level: levelOf(d.count, max) })),
    commits: commits.slice(0, 8),
    feedOk: true,
    source: "graphql",
    fetchedAt: new Date().toISOString(),
  };
}

async function viaPublic(): Promise<Payload> {
  const [calRes, evRes] = await Promise.all([
    fetch(`https://github.com/users/${USER}/contributions`, { headers: UA, next: { revalidate } }),
    fetch(`https://api.github.com/users/${USER}/events/public?per_page=50`, { headers: { ...UA, Accept: "application/vnd.github+json" }, next: { revalidate } }),
  ]);
  if (!calRes.ok) throw new Error(`calendar ${calRes.status}`);
  const html = await calRes.text();

  // <td … data-date="2025-10-06" id="contribution-day-component-0-0" data-level="2" …>
  const cells = new Map<string, { date: string; level: number }>();
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="([\d-]+)"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const level = Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0);
    if (date && id) cells.set(id, { date, level });
  }
  // <tool-tip for="contribution-day-component-0-0" …>3 contributions on …</tool-tip>
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*(\d[\d,]*)\s+contribution/.exec(m[2]);
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: Day[] = [...cells.entries()]
    .map(([id, c]) => ({ date: c.date, level: c.level, count: counts.get(id) ?? (c.level ? c.level : 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) throw new Error("calendar format changed");
  const totalMatch = /([\d,]+)\s+contributions?\s+in the last year/i.exec(html);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : days.reduce((n, d) => n + d.count, 0);

  const commits: Commit[] = [];
  if (evRes.ok) {
    const events = (await evRes.json()) as { type: string; repo: { name: string }; created_at: string; payload: { ref?: string; head?: string; commits?: { sha: string; message: string }[] } }[];
    for (const e of events) {
      if (e.type !== "PushEvent") continue;
      const repo = e.repo.name.split("/").pop() ?? e.repo.name;
      const list = e.payload.commits ?? [];
      if (list.length) {
        for (const c of [...list].reverse())
          commits.push({ repo, message: c.message.split("\n")[0], date: e.created_at, url: `https://github.com/${e.repo.name}/commit/${c.sha}` });
      } else if (e.payload.head) {
        commits.push({ repo, message: `pushed to ${e.payload.ref?.replace("refs/heads/", "") ?? "main"}`, date: e.created_at, url: `https://github.com/${e.repo.name}/commit/${e.payload.head}` });
      }
      if (commits.length >= 8) break;
    }
  }
  return { user: USER, total, days, commits: commits.slice(0, 8), feedOk: evRes.ok, source: "public", fetchedAt: new Date().toISOString() };
}

export async function GET() {
  if (!USER) return Response.json({ error: "No GitHub profile set." }, { status: 404 });
  const token = process.env.GITHUB_TOKEN;
  try {
    const data = token ? await viaGraphQL(token).catch(() => viaPublic()) : await viaPublic();
    return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (e) {
    return Response.json({ error: `GitHub is unreachable right now (${(e as Error).message}).` }, { status: 502 });
  }
}
