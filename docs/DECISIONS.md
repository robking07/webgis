# Decisions & Open Questions

Every open question, stop-condition hit, and default taken goes here (see `CLAUDE.md` and SPEC §10).

Format: `ID · date · status (OPEN / DEFAULTED / DECIDED) · summary`, then details.

## Open decisions (SPEC §12, Robbie decides)

- **Q-1 · OPEN** · MapLibre vs. Mapbox as the long-term map library (MapLibre for now).
- **Q-2 · OPEN** · Project name and domain.
- **Q-3 · OPEN** · Which Phase 2 paid APIs to prioritize.
- **Q-4 · OPEN** · How edgy/humorous the Weird Insights tone should be.

## Findings from spec verification (2026-09-30)

- **D-01 · 2026-09-30 · OPEN** · **Where PMTiles are hosted.** The spec doesn't say. National tract tiles won't fit in Supabase's free 500 MB database or 1 GB storage, and large static files on Vercel are a poor fit. Proposed default: Cloudflare R2 (10 GB free, no egress fees) with HTTP range requests.
- **D-02 · 2026-09-30 · OPEN** · **Supabase free projects pause after 7 days idle.** That's bad for a public site. Options: a keep-alive ping (cron), the Pro plan ($25/mo), or keeping the public site's reads to static assets (tiles + precomputed JSON) so a paused database doesn't break viewing.
- **D-03 · 2026-09-30 · DEFAULTED** · **FHWA NHPN is stale** (v14.05, about 2014). Default: use current BTS NTAD layers (geodata.bts.gov) for the highway network, and keep NHPN only if Robbie wants it.
- **D-04 · 2026-09-30 · OPEN (§10 stop)** · **EJScreen was removed by EPA (Feb 2025).** It's only available from archives (Harvard Dataverse v4.0, PEDP, Social Explorer). Provenance and license for re-publishing are unclear, so it stays out until Robbie decides.
- **D-05 · 2026-09-30 · DECIDED** · **Repo location.** Moved from `/mnt/c/Users/rober/claude/webgis` to `~/webgis` in WSL, because `/mnt/c` (NTFS through WSL) is slow for node_modules and Next builds and C: is 89% full. Windows access: `\\wsl$\Ubuntu\home\blueLLM\webgis`. The old folder only holds a `MOVED.md` pointer.
- **D-06 · 2026-09-30 · OPEN** · **Local environment gaps.** Docker isn't available in WSL (enable Docker Desktop's WSL integration, or use hosted Supabase only). `tippecanoe`, GDAL/`ogr2ogr` and `gh` aren't installed. npm is Debian's 9.2; install current Node through nvm.
- **D-07 · 2026-09-30 · DEFAULTED** · **No official PostGIS agent skill exists.** Default: write a project-local `.claude/skills/postgis-analysis`.
- **D-08 · 2026-09-30 · DEFAULTED** · **The Anthropic API is paid.** Default: generate insight captions at build time and cache them, so viewers' page loads make no live API calls.
- **D-09 · 2026-09-30 · DECIDED** · **Hosted Supabase project.** Robbie supplied `https://luowvyoakocmlowquddh.supabase.co` (responds; 401 without a key, as expected). Stored as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` / `.env.example`. Robbie chose: develop against this hosted project only (no local Docker stack), which sidesteps the Docker part of D-06. Keys (anon, service role, DB connection string) still needed — Robbie pastes them into `.env.local` directly, not into chat.

## Verified OK

- Mapbox, MapLibre, Supabase (`supabase/agent-skills`) and Vercel (`vercel-labs/agent-skills`) skill repos exist and install with `npx skills add`.
- Supabase free tier is still 500 MB DB.
- Census API key signup URL works.
