// Feeds sample hook JSON to .claude/hooks/guardrails.mjs and checks the result.
//   npm run test:guardrails
// Exit 2 = blocked (message on stderr), exit 0 = allowed. Uses a fake env path, never the real file.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("../.claude/hooks/guardrails.mjs", import.meta.url));

// Fake main checkout for the write fence.
const ROOT = "/home/me/webgis";

function run(tool_name, tool_input, branch = "chore/x") {
  const r = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_name, tool_input, cwd: `${ROOT}/.claude/worktrees/x` }),
    encoding: "utf8",
    env: { ...process.env, GUARDRAILS_BRANCH: branch, GUARDRAILS_ROOT: ROOT },
  });
  return { code: r.status, err: r.stderr };
}

// [label, tool, input, expect ("block" | "allow"), hint expected in message, branch]
const bash = (command) => ({ command });
const UA = "Mozilla" + "/5.0 (Windows NT 10.0) Chrome" + "/120.0"; // split so this file doesn't trip the hook
const wt = (f) => `${ROOT}/.claude/worktrees/x/${f}`;
const cases = [
  // 1. main pushes, force pushes, --no-verify
  ["push origin main", "Bash", bash("git push origin main"), "block", "scripts/merge-pr.sh"],
  ["push HEAD:main", "Bash", bash("git push origin HEAD:main"), "block", "branch"],
  ["push refs/heads/main", "Bash", bash("git push origin HEAD:refs/heads/main"), "block", "branch"],
  ["push -u origin main", "Bash", bash("git push -u origin main"), "block", "branch"],
  ["bare push on main", "Bash", bash("git push"), "block", "branch", "main"],
  ["push origin HEAD on main", "Bash", bash("git push origin HEAD"), "block", "branch", "main"],
  ["push after && chain", "Bash", bash("git fetch origin && git push origin main"), "block", "branch"],
  ["push inside bash -c", "Bash", bash("bash -c 'git push origin main'"), "block", "branch"],
  ["git -C push main", "Bash", bash("git -C /tmp/x push origin main"), "block", "branch"],
  ["--force", "Bash", bash("git push --force origin chore/x"), "block", "force push"],
  ["-f", "Bash", bash("git push -f origin chore/x"), "block", "force push"],
  ["--force-with-lease", "Bash", bash("git push --force-with-lease origin chore/x"), "block", "force push"],
  ["+refspec", "Bash", bash("git push origin +chore/x"), "block", "force push"],
  ["--no-verify commit", "Bash", bash('git commit --no-verify -m "x"'), "block", "--no-verify"],
  ["--no-verify push", "Bash", bash("git push --no-verify -u origin chore/x"), "block", "--no-verify"],
  ["--no-verify merge", "Bash", bash("git merge --no-verify origin/main"), "block", "--no-verify"],
  // 2. merging PRs
  ["gh pr merge", "Bash", bash("gh pr merge 999"), "block", "bash scripts/merge-pr.sh"],
  ["gh pr merge flags", "Bash", bash("gh pr merge 12 --merge --delete-branch"), "block", "bash scripts/merge-pr.sh"],
  ["gh -R pr merge", "Bash", bash("gh -R robking07/webgis pr merge 5"), "block", "bash scripts/merge-pr.sh"],
  ["gh api merge", "Bash", bash("gh api -X PUT repos/robking07/webgis/pulls/12/merge"), "block", "bash scripts/merge-pr.sh"],
  ["gh api graphql merge", "Bash", bash("gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\"x\"}) { clientMutationId } }'"), "block", "bash scripts/merge-pr.sh"],
  // 3. .env.local
  ["Read .env.local", "Read", { file_path: "/home/me/webgis/.env.local" }, "block", ".env.example"],
  ["Edit .env.local", "Edit", { file_path: "/home/me/webgis/.env.local" }, "block", ".env.example"],
  ["cat .env.local", "Bash", bash("cat .env.local"), "block", ".env.example"],
  ["head ../.env.local", "Bash", bash("head -5 ../../.env.local"), "block", ".env.example"],
  ["less .env.local", "Bash", bash("less .env.local"), "block", ".env.example"],
  ["grep .env.local", "Bash", bash("grep SUPABASE .env.local"), "block", ".env.example"],
  ["source .env.local", "Bash", bash("set -a; source .env.local; set +a"), "block", ".env.example"],
  ["redirect < .env.local", "Bash", bash("while read l; do echo $l; done < .env.local"), "block", ".env.example"],
  ["$(cat .env.local) in quotes", "Bash", bash('echo "$(cat .env.local)"'), "block", ".env.example"],
  ["printenv", "Bash", bash("printenv"), "block", "environment"],
  ["bare env", "Bash", bash("env | sort"), "block", "environment"],
  // 4. browser user agents
  ["curl -A browser", "Bash", bash(`curl -A "${UA}" https://www.huduser.gov/x.zip`), "block", "manual-download"],
  ["wget --user-agent browser", "Bash", bash(`wget --user-agent="${UA}" https://x.gov/a.csv`), "block", "manual-download"],
  ["UA in heredoc script", "Bash", bash(`cat > fetch.sh <<'EOF'\ncurl -H "User-Agent: ${UA}" x\nEOF`), "block", "manual-download"],
  ["Write ingest with UA", "Write", { file_path: wt("data/ingest/src/hud.ts"), content: `headers: { "User-Agent": "${UA}" }` }, "block", "manual-download"],
  ["Edit ingest with UA", "Edit", { file_path: wt("data/ingest/src/hud.ts"), old_string: "a", new_string: UA }, "block", "manual-download"],
  // 5. write fence and main checkout
  ["Write outside project", "Write", { file_path: "/home/me/notes.txt", content: "x" }, "block", "inside ~/webgis"],
  ["Edit relative escape", "Edit", { file_path: "../../../../other/x.ts", old_string: "a", new_string: "b" }, "block", "inside ~/webgis"],
  ["Write to /mnt", "Write", { file_path: "/mnt/nas/x.txt", content: "x" }, "block", "inside ~/webgis"],
  ["Read from /mnt", "Read", { file_path: "/mnt/c/Users/x.txt" }, "block", "inside ~/webgis"],
  ["cp to /mnt", "Bash", bash("cp data.csv /mnt/nas/"), "block", "inside ~/webgis"],
  ["smb share", "Bash", bash("smbclient smb://nas/share"), "block", "inside ~/webgis"],
  ["UNC share", "Bash", bash("ls //nas/share/"), "block", "inside ~/webgis"],
  ["Edit main checkout", "Edit", { file_path: `${ROOT}/apps/web/src/x.ts`, old_string: "a", new_string: "b" }, "block", "worktree"],
  ["Write main CLAUDE.md", "Write", { file_path: `${ROOT}/CLAUDE.md`, content: "x" }, "block", "worktree"],
  // allowed
  ["Write in worktree", "Write", { file_path: wt("apps/web/src/x.ts"), content: "x" }, "allow"],
  ["Edit relative in worktree", "Edit", { file_path: "scripts/x.mjs", old_string: "a", new_string: "b" }, "allow"],
  ["Write drafts in main", "Write", { file_path: `${ROOT}/drafts/robbie.md`, content: "x" }, "allow"],
  ["Write data/cache in main", "Write", { file_path: `${ROOT}/data/cache/x.json`, content: "x" }, "allow"],
  ["Write scratchpad", "Write", { file_path: "/tmp/claude-1000/s/x.txt", content: "x" }, "allow"],
  ["Write memory", "Write", { file_path: `${process.env.HOME}/.claude/projects/p/memory/x.md`, content: "x" }, "allow"],
  ["Read main checkout", "Read", { file_path: `${ROOT}/docs/handbook.md` }, "allow"],
  ["Write doc about UA rule", "Write", { file_path: wt("docs/handbook.md"), content: UA }, "allow"],
  ["plain user agent", "Bash", bash('curl -A "Mapwich-ingest/1.0 (+https://mapwich.org)" https://x.gov/a.csv'), "allow"],
  ["https URL", "Bash", bash("curl -s https://example.gov/data.csv"), "allow"],
  // 6. old false alarms stay fixed
  ["preview host with git in it", "Bash", bash("curl -s https://webgis-git-ui-x-robking07.vercel.app/ | head"), "allow"],
  ["push branch then merge main", "Bash", bash("git push -u origin chore/x; git merge origin/main"), "allow"],
  ["worktree add", "Bash", bash("git worktree add .claude/worktrees/x -b chore/x origin/main"), "allow"],
  ["commit", "Bash", bash('git commit -m "Add thing (no-verify is bad)"'), "allow"],
  ["commit via heredoc mentioning main", "Bash", bash("git commit -m \"$(cat <<'EOF'\nNever git push origin main or gh pr merge\nEOF\n)\""), "allow"],
  ["push -u branch", "Bash", bash("git push -u origin chore/agent-guardrails"), "allow"],
  ["push HEAD on branch", "Bash", bash("git push origin HEAD"), "allow"],
  ["bare push on branch", "Bash", bash("git push"), "allow"],
  ["push branch named main-menu", "Bash", bash("git push -u origin ui/main-menu"), "allow"],
  ["merge origin/main", "Bash", bash("git fetch origin && git merge origin/main"), "allow"],
  ["gh pr create", "Bash", bash("gh pr create --draft --title x --body y"), "allow"],
  ["gh pr ready", "Bash", bash("gh pr ready 12"), "allow"],
  ["gh pr view", "Bash", bash("gh pr view 12 --json state"), "allow"],
  ["gh pr diff", "Bash", bash("gh pr diff 12"), "allow"],
  ["gh pr checks", "Bash", bash("gh pr checks 12"), "allow"],
  ["gh api PATCH pr", "Bash", bash("gh api -X PATCH repos/robking07/webgis/pulls/12 -f title=x"), "allow"],
  ["merge-pr.sh", "Bash", bash("bash scripts/merge-pr.sh 12"), "allow"],
  ["db-push.sh", "Bash", bash("bash scripts/db-push.sh"), "allow"],
  ["npm run db:migrate", "Bash", bash("npm run db:migrate"), "allow"],
  ["Read .env.example", "Read", { file_path: `${ROOT}/.env.example` }, "allow"],
  ["cat .env.example", "Bash", bash("cat .env.example"), "allow"],
  ["ls .env.local", "Bash", bash("ls -la .env.local"), "allow"],
  ["git check-ignore .env.local", "Bash", bash("git check-ignore .env.local"), "allow"],
  ["env with a command", "Bash", bash("env FOO=1 npm run build"), "allow"],
  ["Read normal file", "Read", { file_path: `${ROOT}/package.json` }, "allow"],
];

let failed = 0;
for (const [label, tool, input, expect, hint, branch] of cases) {
  const { code, err } = run(tool, input, branch);
  let ok;
  if (expect === "block") ok = code === 2 && err.includes("Blocked") && (!hint || err.includes(hint));
  else ok = code === 0 && err === "";
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${expect.padEnd(5)}  ${label}${ok ? "" : `  (exit ${code}: ${err.trim()})`}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
