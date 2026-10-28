#!/usr/bin/env node
// Project guardrails (task G1, docs/branching.md "Guardrails").
// A Claude Code PreToolUse hook. Claude Code pipes JSON to stdin:
//   { tool_name, tool_input: { command | file_path | path ... }, cwd, ... }
// Exit 0 = allow. Exit 2 = block; stderr is shown to Claude as the reason.
// Dependency-free (Node only). Test: npm run test:guardrails
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN = new Set(["main", "master"]);
const ENV_FILE = /(^|[\\/=])\.env\.local$/;
// A browser's user-agent string; a plain one like "Mapwich-ingest/1.0" is fine.
const BROWSER_UA = /Mozilla\/\d|AppleWebKit\/|Chrome\/\d|Safari\/\d|Firefox\/\d/;
const NETWORK = (t) => t.startsWith("/mnt/") || /^smb:\/\//i.test(t) || /^(\/\/|\\\\)[\w.-]+[\\/]/.test(t);
// Main checkout edits are allowed only here (CLAUDE.md: work in worktrees).
const MAIN_OK = ["drafts", "data/cache", ".claude/worktrees"];

class Block extends Error {}
const block = (msg) => {
  throw new Block(msg);
};

const MSG = {
  push:
    "Blocked: pushing to main. Work on a branch and push that: `git push -u origin <branch>`, " +
    "then open a draft PR. Merge only with `bash scripts/merge-pr.sh <n>` (docs/branching.md).",
  force:
    "Blocked: force push. Never rewrite shared history. Merge origin/main into your branch " +
    "(`git fetch origin && git merge origin/main`) and push normally (docs/branching.md).",
  verify:
    "Blocked: --no-verify. Hooks and checks must run. Fix what the check reports instead of skipping it.",
  merge:
    "Blocked: merging a PR directly. Merge with `bash scripts/merge-pr.sh <n>` (docs/branching.md); " +
    "it refuses if the branch is behind main or a check is red.",
  env:
    "Blocked: .env.local holds secrets and must not be read or printed. Read `.env.example` for the " +
    "variable names. Scripts that need the values (e.g. `bash scripts/db-push.sh`) load it themselves.",
  envdump:
    "Blocked: dumping the environment can print secrets loaded from .env.local. Check one variable " +
    'by name instead, without printing its value (e.g. `[ -n "$NAME" ] && echo set`).',
  ua:
    "Blocked: don't disguise scripts as a browser. If a site blocks scripts, stop and write the " +
    "manual-download steps for Robbie.",
  fence: "Blocked: Mapwich work stays inside ~/webgis (and the session scratchpad). Never touch the NAS or network shares.",
  mainCheckout:
    "Blocked: editing the main checkout. Work in your own worktree under .claude/worktrees/ " +
    "(docs/branching.md); only drafts/ and data/cache/ are edited in place.",
};

// ---- shell tokenizer: splits into segments of words, respecting quotes ----
function segments(cmd) {
  // Drop heredoc bodies so commit messages / notes are not scanned as commands.
  cmd = cmd.replace(
    /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g,
    (m) => m.split("\n")[0].replace(/<<-?\s*['"]?\w+['"]?/, ""),
  );
  const segs = [];
  let words = [];
  let cur = null;
  const fresh = () => ({ t: "", q: new Set() });
  const push = () => {
    if (cur) {
      words.push(cur);
      cur = null;
    }
  };
  const end = () => {
    push();
    if (words.length) segs.push(words);
    words = [];
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'") {
      cur ??= fresh();
      cur.q.add("s");
      for (i++; i < cmd.length && cmd[i] !== "'"; i++) cur.t += cmd[i];
    } else if (c === '"') {
      cur ??= fresh();
      cur.q.add("d");
      for (i++; i < cmd.length && cmd[i] !== '"'; i++) {
        if (cmd[i] === "\\" && i + 1 < cmd.length) i++;
        cur.t += cmd[i];
      }
    } else if (c === "\\" && i + 1 < cmd.length) {
      if (cmd[i + 1] !== "\n") {
        cur ??= fresh();
        cur.t += cmd[i + 1];
      }
      i++;
    } else if (c === "\n" || c === ";" || c === "&" || c === "|" || c === "(" || c === ")") {
      end();
    } else if (/\s/.test(c)) {
      push();
    } else if (c === "<" || c === ">") {
      // Keep redirection operators as their own word so "< .env.local" is visible.
      push();
      words.push({ t: c, q: new Set() });
    } else {
      cur ??= fresh();
      cur.t += c;
    }
  }
  end();
  return segs;
}

const WRAPPERS = new Set(["sudo", "command", "exec", "time", "nohup", "nice", "builtin", "xargs"]);

function stripPrefix(w) {
  let i = 0;
  while (i < w.length) {
    const t = w[i].t;
    if (/^\w+=/.test(t) && !w[i].q.size) i++;
    else if (WRAPPERS.has(t)) i++;
    else if (t === "env" && w.length > i + 1) {
      i++;
      while (i < w.length && (/^\w+=/.test(w[i].t) || w[i].t.startsWith("-"))) i++;
    } else break;
  }
  return w.slice(i);
}

function currentBranch(cwd) {
  if (process.env.GUARDRAILS_BRANCH) return process.env.GUARDRAILS_BRANCH;
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: cwd || process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// The main checkout, also when the hook runs from a worktree.
function projectRoot() {
  if (process.env.GUARDRAILS_ROOT) return process.env.GUARDRAILS_ROOT;
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd: dirname(fileURLToPath(import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return dirname(common);
  } catch {
    return "";
  }
}

function checkPath(p, cwd, writing) {
  if (ENV_FILE.test(p)) block(MSG.env);
  if (NETWORK(p)) block(MSG.fence);
  if (!writing) return;
  const root = projectRoot();
  if (!root) return;
  const abs = resolve(cwd || process.cwd(), p);
  const under = (dir) => abs === dir || abs.startsWith(dir + sep);
  if (abs.startsWith("/tmp/claude-") || under(resolve(homedir(), ".claude", "projects"))) return;
  if (!under(root)) block(MSG.fence);
  if (!MAIN_OK.some((d) => under(resolve(root, d)))) block(MSG.mainCheckout);
}

function checkGit(args, cwd) {
  // args: words after "git". Find the subcommand, skipping global options.
  let i = 0;
  let dir = cwd;
  while (i < args.length && args[i].startsWith("-")) {
    if (["-C", "-c", "--git-dir", "--work-tree"].includes(args[i])) {
      if (args[i] === "-C") dir = args[i + 1];
      i += 2;
    } else i++;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (rest.includes("--no-verify") || (sub === "commit" && rest.includes("-n"))) block(MSG.verify);
  if (sub !== "push") return;

  const pos = [];
  for (const a of rest) {
    if (
      a === "--force" ||
      a === "-f" ||
      a.startsWith("--force-with-lease") ||
      a === "--force-if-includes" ||
      /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a)
    )
      block(MSG.force);
    if (a === "--mirror" || a === "--all") block(MSG.push);
    if (!a.startsWith("-")) pos.push(a);
  }
  const refspecs = pos.slice(1); // pos[0] is the remote
  if (refspecs.length === 0) {
    // Bare `git push` / `git push origin` pushes the current branch.
    if (MAIN.has(currentBranch(dir))) block(MSG.push);
    return;
  }
  for (const r of refspecs) {
    if (r.startsWith("+")) block(MSG.force);
    let dst = r.includes(":") ? r.split(":").pop() : r;
    if (dst === "HEAD" || dst === "@") dst = currentBranch(dir);
    dst = dst.replace(/^refs\/heads\//, "");
    if (MAIN.has(dst)) block(MSG.push);
  }
}

function checkSegment(w, cwd, depth) {
  w = stripPrefix(w);
  if (!w.length) return;
  const cmd = w[0].t.split("/").pop();
  const args = w.slice(1).map((x) => x.t);
  const text = w.map((x) => x.t);

  // Command substitution inside double-quoted words.
  for (const x of w) {
    if (x.q.has("s") || !/\$\(|`/.test(x.t)) continue;
    for (const m of x.t.matchAll(/\$\(([^)]*)\)|`([^`]*)`/g)) checkCommand(m[1] ?? m[2], cwd, depth + 1);
  }

  // Nested shells: bash -c "...", eval "..."
  if (depth < 4 && /^(bash|sh|zsh|dash)$/.test(cmd)) {
    const ci = args.indexOf("-c");
    if (ci >= 0 && args[ci + 1]) checkCommand(args[ci + 1], cwd, depth + 1);
  }
  if (depth < 4 && cmd === "eval") checkCommand(args.join(" "), cwd, depth + 1);

  if (cmd === "git") checkGit(args, cwd);

  if (cmd === "gh") {
    const ga = args.filter((a, i) => !["-R", "--repo"].includes(a) && !["-R", "--repo"].includes(args[i - 1]));
    const nf = ga.filter((a) => !a.startsWith("-"));
    if (nf[0] === "pr" && nf[1] === "merge") block(MSG.merge);
    if (
      nf[0] === "api" &&
      ga.some((a) => /\/merge(\b|$)|mergePullRequest|enablePullRequestAutoMerge/.test(a))
    )
      block(MSG.merge);
  }

  // Secrets: environment dumps and anything that reads .env.local.
  if (
    cmd === "printenv" ||
    (cmd === "env" && args.length === 0) ||
    (cmd === "export" && args.includes("-p")) ||
    (cmd === "declare" && args.includes("-x")) ||
    (cmd === "set" && args.length === 0)
  )
    block(MSG.envdump);
  // Naming the file is fine for existence checks and git (e.g. check-ignore); reading it is not.
  if (text.some((t) => ENV_FILE.test(t)) && !["ls", "test", "[", "[[", "stat", "git", "echo", "printf"].includes(cmd))
    block(MSG.env);
  for (let i = 0; i < text.length - 1; i++) if (text[i] === "<" && ENV_FILE.test(text[i + 1])) block(MSG.env);
  if (text.some(NETWORK)) block(MSG.fence);
}

function checkCommand(cmd, cwd, depth = 0) {
  // Raw text, so a user agent inside a heredoc-written script is caught too.
  if (BROWSER_UA.test(cmd)) block(MSG.ua);
  for (const w of segments(cmd)) checkSegment(w, cwd, depth);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const ti = input.tool_input ?? {};
  try {
    if (input.tool_name === "Bash") checkCommand(String(ti.command ?? ""), input.cwd);
    else {
      const writing = ["Write", "Edit", "NotebookEdit"].includes(input.tool_name);
      for (const k of ["file_path", "notebook_path", "path"])
        if (typeof ti[k] === "string") checkPath(ti[k], input.cwd, writing);
      // Docs may describe the rule; code may not contain a browser user agent.
      const body = [ti.content, ti.new_string, ti.new_source].filter((x) => typeof x === "string").join("\n");
      if (writing && !/\.md$/.test(ti.file_path ?? "") && BROWSER_UA.test(body)) block(MSG.ua);
    }
  } catch (e) {
    if (e instanceof Block) {
      process.stderr.write(e.message + "\n");
      process.exit(2);
    }
    throw e;
  }
  process.exit(0);
}
main();
