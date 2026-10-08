import { education, experience, projects, skills } from "@/content/profile";

/**
 * Builds the System graph straight from content/profile.ts:
 *   core (you) → projects & roles (inner shell) → skills (outer shell)
 * Edges between work and skills are inferred from each item's `stack`.
 */

export type NodeKind = "core" | "cloud" | "ai" | "app" | "web" | "data" | "work" | "school" | "skill";

export type GNode = {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  tier: 0 | 1 | 2;
  color: string;
  ref?: { type: "project"; slug: string } | { type: "role"; slug: string } | { type: "school" } | { type: "skill"; group: string };
};

export const KIND_COLOR: Record<string, string> = {
  core: "#f2ff3c",
  cloud: "#00f0ff",
  ai: "#ff2bd6",
  app: "#a78bfa",
  web: "#60a5fa",
  data: "#3dff9a",
  work: "#ffb020",
  school: "#c9c4ea",
};

export const GROUP_COLOR: Record<string, string> = {
  Cloud: "#00f0ff",
  "AI & ML": "#ff2bd6",
  Data: "#3dff9a",
  Development: "#7aa2ff",
  Practices: "#c9c4ea",
};

/** keywords (lower-case substrings of stack items) that count as using a skill */
const ALIASES: Record<string, string[]> = {
  "AWS (EC2, S3, IAM, ECS, Cognito)": ["aws", "ecs", "ecr", "s3", "cognito", "alb", "cloudwatch"],
  Docker: ["docker", "localstack"],
  "GitHub Actions": ["github actions"],
  "CI/CD": ["github actions", "ci/cd"],
  Linux: ["linux"],
  Supabase: ["supabase", "edge functions"],
  "LLM integration (Gemini)": ["gemini", "llm"],
  "AI agents": ["ai agents", "llm", "email automation"],
  "MediaPipe / computer vision": ["mediapipe"],
  "Prompt design": ["gemini", "llm"],
  SQL: ["sql", "postgres", "bigquery", "h2", "hibernate"],
  PostgreSQL: ["postgres"],
  MySQL: ["mysql"],
  Oracle: ["oracle"],
  MongoDB: ["mongo"],
  DynamoDB: ["dynamo"],
  "Schema design": ["postgres", "mongo", "hibernate", "dynamo", "supabase"],
  "Query optimization": ["postgres", "mysql", "bigquery"],
  TypeScript: ["typescript"],
  JavaScript: ["javascript", "node", "react", "next.js", "vite", "express"],
  Python: ["python"],
  Java: ["java 17", "javafx", "hibernate", "guice"],
  "Swift / SwiftUI": ["swift"],
  "C/C++": ["=c", "robotc"],
  "Node.js": ["node", "express"],
  React: ["react", "next.js", "tanstack"],
  "Next.js": ["next.js"],
  "REST APIs": ["express", "edge functions", "api"],
  "Agile / Jira": ["agile"],
  "Code review": ["code review"],
  "Git & PRs": ["git"],
  "Production support": ["magento"],
  "Technical documentation": [],
};

function uses(stack: string[], skill: string) {
  const keys = ALIASES[skill] ?? [skill.toLowerCase()];
  return stack.some((s) => {
    const t = s.toLowerCase();
    return keys.some((k) => (k.startsWith("=") ? t === k.slice(1) : t.includes(k)));
  });
}

const SUB: Record<string, string> = {
  rentos: "ios · ai copilot",
  insightboard: "llm + vision",
  xeveora: "aws ecs cluster",
  "grizzly-ecom": "magento · ops",
  handouts: "hackathon · bigquery",
  "bbq-revival": "supabase · portals",
  criticalminers: "freelance site",
  zensalt: "freelance · en/fr",
  "ai-support-agent": "ai inference",
  maxdal: "shopify storefront",
  robotics: "robotc · sensors",
  hotel: "java · javafx",
  legoland: "postgres + mongo",
};

export function buildGraph() {
  const nodes: GNode[] = [{ id: "core", label: "NABEEL", sub: "core · control plane", kind: "core", tier: 0, color: KIND_COLOR.core }];
  const stacks: Record<string, string[]> = {};

  for (const p of projects) {
    if (p.tagline.startsWith("TODO")) continue;
    nodes.push({
      id: p.slug,
      label: p.name.replace(" E-Commerce", "").replace("Hotel Management System", "Hotel System").replace("Autonomous Robot Navigation", "Robotics"),
      sub: SUB[p.slug] ?? p.kind,
      kind: p.kind,
      tier: 1,
      color: KIND_COLOR[p.kind] ?? KIND_COLOR.web,
      ref: { type: "project", slug: p.slug },
    });
    stacks[p.slug] = p.stack;
  }
  for (const r of experience) {
    if (!r.stack || r.slug === "grizzly-blades") continue; // Grizzly is shown as its project
    nodes.push({ id: r.slug, label: r.company, sub: r.title.toLowerCase(), kind: "work", tier: 1, color: KIND_COLOR.work, ref: { type: "role", slug: r.slug } });
    stacks[r.slug] = r.stack;
  }
  nodes.push({ id: "seneca", label: "Seneca", sub: education[0].credential.split("—")[0].trim().toLowerCase(), kind: "school", tier: 1, color: KIND_COLOR.school, ref: { type: "school" } });
  stacks.seneca = ["java 17", "javascript", "sql", "oracle", "python", "aws", "linux", "react", "node", "git", "agile"];

  const edges: [number, number][] = [];
  const tier1 = nodes.map((n, i) => [n, i] as const).filter(([n]) => n.tier === 1);
  tier1.forEach(([, i]) => edges.push([0, i]));

  for (const [group, list] of Object.entries(skills)) {
    for (const s of list) {
      const idx = nodes.length;
      nodes.push({ id: `skill:${s}`, label: s, sub: group, kind: "skill", tier: 2, color: GROUP_COLOR[group] ?? "#c9c4ea", ref: { type: "skill", group } });
      for (const [n, i] of tier1) if (uses(stacks[n.id] ?? [], s)) edges.push([i, idx]);
    }
  }
  return { nodes, edges };
}
