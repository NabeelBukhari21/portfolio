import { character } from "@/content/profile";
import type { VaultSession } from "./client";

/** One line of "what did this key just unlock, and where on the site is it". */
export type ManifestRow = { key: string; icon: string; label: string; detail: string; where: string; href: string; color: string };

export function manifestOf(s: VaultSession | null): ManifestRow[] {
  if (!s) return [];
  const rows: ManifestRow[] = [];
  const names = new Set(s.docs.filter((d) => d.category === "arcs").map((d) => d.name));

  // Story Mode photos, counted per episode
  const perArc = character.arcs
    .map((a) => ({ name: a.name.replace(/^The /, "").replace(/ Arc$/, ""), n: a.gallery.filter((g) => "vault" in g && g.vault && names.has(g.vault)).length }))
    .filter((a) => a.n);
  const arcTotal = perArc.reduce((n, a) => n + a.n, 0);
  if (arcTotal)
    rows.push({
      key: "arcs",
      icon: "◩",
      label: `${arcTotal} classified photo${arcTotal === 1 ? "" : "s"}`,
      detail: perArc.map((a) => `${a.name} ×${a.n}`).join(" · "),
      where: "Character Select → Story Mode",
      href: "#episodes",
      color: "#ff2bd6",
    });

  const gym = s.docs.filter((d) => d.category === "gym").length;
  if (gym)
    rows.push({
      key: "gym",
      icon: "◆",
      label: `${gym} training photo${gym === 1 ? "" : "s"}`,
      detail: "physique archive",
      where: "Character Select → Passive Abilities",
      href: "#character",
      color: "#f2ff3c",
    });

  const docs = s.docs.filter((d) => d.category !== "arcs" && d.category !== "gym");
  if (docs.length) {
    const kinds = new Map<string, number>();
    for (const d of docs) {
      const k = d.type === "application/pdf" ? "PDF" : d.type.startsWith("image/") ? "image" : d.type.startsWith("video/") ? "video" : d.type.startsWith("audio/") ? "audio" : "file";
      kinds.set(k, (kinds.get(k) ?? 0) + 1);
    }
    rows.push({
      key: "docs",
      icon: "▤",
      label: `${docs.length} document${docs.length === 1 ? "" : "s"}`,
      detail: [...kinds].map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`).join(" · "),
      where: "Vault → Secure Database",
      href: "#vault",
      color: "#00f0ff",
    });
  }

  const line = [s.contact.phone && "phone", s.contact.address && "address"].filter(Boolean);
  if (line.length)
    rows.push({ key: "line", icon: "☎", label: "Direct line", detail: line.join(" · "), where: "Vault → Direct Line", href: "#vault", color: "#3dff9a" });

  return rows;
}
