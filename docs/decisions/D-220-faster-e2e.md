# D-220 · Click-through tests in four parallel shards

- **Date:** 2026-10-06
- **Status:** DEFAULTED (worker, issue #119)
- **PR:** #120

**Problem.** After D-210 the CI `click-through` job took 17m50s against a 20-minute limit
(run 37565061293): 38 tests run one after another for 1,007 s, plus about a minute of setup. CI's
runners draw the map with software WebGL, so each test is CPU-bound and slow; the time was spread
across every test (the slowest, the data-files checks, were 67 s and 107 s), not lost in one
fixed sleep or retry.

**Decided.**

1. **Shard across jobs, not inside one.** `menus.spec.mjs` takes `SHARD=k/n` and runs tests
   k, k+n, k+2n, … of its list. Round-robin keeps the slow tests apart (on the measured durations it
   splits 257 / 281 / 232 / 235 s) and needs no timing table to maintain. CI runs shards 1/4 to 4/4
   as a matrix (`click-through 1/4` … `4/4`), each with its own `next start` and browser on the
   shared build artifact. Running tests concurrently in one job was not chosen: the private-repo
   runner has two cores, and the mid-pan and fade checks are timing-sensitive.
2. **One check name kept.** A small `click-through` job passes only when every shard passed, so
   `scripts/merge-pr.sh` and the handbook's check list keep working unchanged. It is skipped for
   drafts and docs-only PRs, like before.
3. **Headless shell only.** Chromium's headless runs use the headless shell, so CI installs that
   (`--only-shell`) and skips the 187 MB full-browser download in each shard.

**Result.** Run 37567277375 (PR #120): shards took 5m08s, 5m39s, 4m51s and 4m31s (tests 234, 280,
231, 219 s); all 38 tests passed. The check finishes about 5m40s after the build instead of 17m50s.
Same tests and assertions; nothing dropped.

**Cost.** Four runners bill about 22 Actions minutes per ready-PR run instead of about 18 (each job
rounds up and repeats `npm ci` and the browser install). Private repos on the free plan get a
monthly pool of Actions minutes; if it ever gets tight, use three shards (about 8 minutes) or two;
the shard count is set in the `click-through-shard` job in `ci.yml`.
