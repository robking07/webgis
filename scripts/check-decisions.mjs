#!/usr/bin/env node
// Decision-number check (docs/branching.md). Runs in CI on every PR and locally:
//   node scripts/check-decisions.mjs            # duplicates and ranges only
//   PR_NUMBER=12 node scripts/check-decisions.mjs  # also: files this PR adds must be D-112
//
// Legacy decisions (D-01 to D-99) live in docs/DECISIONS.md and are frozen.
// New decisions are one file each: docs/decisions/D-<PR number + 100>-<slug>.md.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const OFFSET = 100;
const errors = [];
const seen = new Map(); // id -> where

function claim(id, where) {
  if (seen.has(id)) errors.push(`D-${id} is used twice: ${seen.get(id)} and ${where}`);
  else seen.set(id, where);
}

const legacy = readFileSync("docs/DECISIONS.md", "utf8").split("\n");
legacy.forEach((line, i) => {
  const m = line.match(/^- \*\*D-(\d+)\b/);
  if (!m) return;
  const id = Number(m[1]);
  if (id >= OFFSET) errors.push(`docs/DECISIONS.md:${i + 1} adds D-${id}; new decisions go in docs/decisions/ as their own file`);
  claim(id, `docs/DECISIONS.md:${i + 1}`);
});

const files = readdirSync("docs/decisions").filter((f) => f.endsWith(".md") && f !== "README.md");
for (const f of files) {
  const m = f.match(/^D-(\d+)-[a-z0-9-]+\.md$/);
  if (!m) {
    errors.push(`docs/decisions/${f}: name must be D-<number>-<lowercase-slug>.md`);
    continue;
  }
  const id = Number(m[1]);
  if (id <= OFFSET) errors.push(`docs/decisions/${f}: number must be PR number + ${OFFSET}`);
  const heading = readFileSync(`docs/decisions/${f}`, "utf8").split("\n")[0];
  if (!heading.startsWith(`# D-${id} `)) errors.push(`docs/decisions/${f}: first line must start with "# D-${id} "`);
  claim(id, `docs/decisions/${f}`);
}

const pr = process.env.PR_NUMBER;
if (pr) {
  const base = process.env.BASE_REF ?? "origin/main";
  const added = execFileSync("git", ["diff", "--name-only", "--diff-filter=A", `${base}...HEAD`, "--", "docs/decisions"], { encoding: "utf8" })
    .split("\n")
    .filter((p) => p.endsWith(".md") && !p.endsWith("README.md"));
  const want = `D-${Number(pr) + OFFSET}-`;
  for (const p of added) {
    if (!p.split("/").pop().startsWith(want)) {
      errors.push(`${p}: this is PR #${pr}, so its decision must be ${want}<slug>.md`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`::error::${e}`);
  process.exit(1);
}
console.log(`Decision numbers OK (${seen.size} decisions).`);
