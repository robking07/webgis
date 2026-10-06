# Changelog

All notable changes to Mapwich (mapwich.org). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Phases and task numbers come from
`docs/roadmap.md`.

## [Unreleased] — Phase 0 · Foundations

### Added
- Agent guardrails: hooks block pushes to main, merges outside `scripts/merge-pr.sh` and reads of the local env file (G1, #47).
- Worker handbook and architecture map (F1, #50).
- Screenshot and review-page tools in `apps/web/e2e` (F4, #52).
- Progress log with a Lessons section (F8, #56).
- Dependabot config and a dependency-alert handbook section (G2, #57).
- Agent role definitions with model and effort (F6, #60).
- Link previews (share cards) for shared mapwich.org links (1.5, #65).
- Checks in GitHub CI: build, lint, e2e click-through, leaked-secret scan, Lighthouse (F2, #68).
- Alerts: Sentry browser errors, uptime and spend runbook (S3, #75).
- Download a dataset as CSV (1.4, #79).
- Prototype audit and this changelog (F9, F10, #88).

### Changed
- Approved roadmap mirrored into `docs/roadmap.md` (#45).
- CLAUDE.md trimmed; Mapbox skills removed (F7, #58).
- Share cards bundle Public Sans for even word spacing (#74).
- New logo: one-color stack with a toothpick (#82).
- Lint backlog fixed and lint made blocking in CI; block-group label (F3, #84).

## [v0.1-prototype] — 2026-10-03

The prototype, built 2026-09-30 to 2026-10-03 before the roadmap. A map-first viewer of about 60
public US datasets (ACS, CDC PLACES, NOAA climate, LODES, NBI, FARS and others) at state, county,
tract, block-group and block level: a MapLibre map over an OpenFreeMap basemap with boundary
PMTiles on Cloudflare R2, a YAML dataset registry, a local ingest pipeline to Supabase and static
JSON, the `packages/design` token system with a contrast gate, the redesigned map menus, dataset
and place pages, place search, Odd Pairings with hand review, and the first Specials (one draft).
