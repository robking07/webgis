# D-526: The Data run keeps its raw source downloads

PR #426, issue #368 (part 1). Date: 2026-10-31.

**Decision.** The "Data run" workflow's last step copies everything in `data/cache/` to R2 under
`raw/`, same relative path (run date added to the name when the path has no year). It never deletes
or overwrites: same size is skipped, a different file under a used key is saved beside it dated.
A failure warns and never fails the run.

**Why.** Handbook rule "keep raw downloads" holds on Robbie's machine; the GitHub runner threw its
copy away. Federal sources are being cut or changed, so the as-published file is worth a cent a month.

**Cost.** R2 storage is about $0.015 per GB-month. A run caches the inputs of the steps it ran,
roughly 0.1 to 1 GB (estimate, not measured), so a cent or less a month per run; no egress fee. Same
file twice costs nothing (skipped).

**Public.** The bucket is served at tiles.mapwich.org, so `raw/` is downloadable by anyone. The sources
are public domain.

**Known limits.** "Same file" is size only. Extracted copies of archives in the cache are saved too.
