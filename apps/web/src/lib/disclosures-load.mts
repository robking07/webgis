// Build-time loaders for the /disclosures page (roadmap 1.6): the usage table from the
// "## Finished" section of docs/progress.md and the agent roles from .claude/agents/*.md.
// Called by scripts/prepare.mts, which writes src/generated/disclosures.json.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type UsageRow = {
  task: string; issue: string; pr: string; sizeBudget: string;
  actualText: string; /** Tokens, or null when the cell has no number ("not recorded"). */ tokens: number | null;
  ratio: string; model: string; date: string;
};
export type AgentRole = { name: string; model: string; effort: string; description: string };

/** "163k" -> 163000; "97k + 40k review" -> 137000 (parts add up); "1.2M" -> 1200000; no number -> null. */
export function parseTokens(text: string): number | null {
  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*([kKmM])\b/g)];
  if (!parts.length) return null;
  return Math.round(parts.reduce((sum, [, n, unit]) => sum + Number(n) * (unit.toLowerCase() === "m" ? 1e6 : 1e3), 0));
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** Rows of the first table under "## Finished". Rows with too few cells are skipped. */
export function parseFinished(markdown: string): UsageRow[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Finished\s*$/.test(l));
  if (start < 0) return [];
  const rows: UsageRow[] = [];
  let header = 0;
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (!line.trim().startsWith("|")) { if (header && rows.length) break; continue; }
    if (header < 2) { header++; continue; } // column names, then the |---| rule
    const c = cells(line);
    if (c.length < 8) continue;
    const [task, issue, pr, sizeBudget, actualText, ratio, model, date] = c;
    rows.push({ task, issue, pr, sizeBudget, actualText, tokens: parseTokens(actualText), ratio, model, date });
  }
  return rows;
}

export function totals(rows: UsageRow[]) {
  const counted = rows.filter((r) => r.tokens !== null);
  return { rows: rows.length, counted: counted.length, noNumber: rows.length - counted.length, tokens: counted.reduce((s, r) => s + (r.tokens ?? 0), 0) };
}

/** Front matter of one agent file (`key: value` lines between the --- fences). */
export function parseAgent(markdown: string): AgentRole | null {
  const m = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const f: Record<string, string> = {};
  for (const l of m[1].split(/\r?\n/)) { const i = l.indexOf(":"); if (i > 0) f[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  if (!f.name) return null;
  return { name: f.name, model: f.model ?? "", effort: f.effort ?? "", description: f.description ?? "" };
}

export function loadAgents(root: string): AgentRole[] {
  const dir = join(root, ".claude/agents");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
    .map((f) => parseAgent(readFileSync(join(dir, f), "utf8"))).filter((a): a is AgentRole => !!a);
}

export function loadDisclosures(root: string) {
  const rows = parseFinished(readFileSync(join(root, "docs/progress.md"), "utf8"));
  return { rows, totals: totals(rows), agents: loadAgents(root) };
}
