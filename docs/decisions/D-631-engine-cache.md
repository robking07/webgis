# D-631 · MapLibre engine files: versioned path, cached for a year

- **Date:** 2026-11-03
- **Status:** DEFAULTED (worker, issue #511; the lead decides at merge)
- **PR:** #531

Follow-up to D-609. The map worker and its shared chunk were served at fixed names with
`max-age=0`, so every visit re-checked them. They now live at `/maplibre/<maplibre-gl version>/…`
and are served `Cache-Control: public, max-age=31536000, immutable` (`headers()` in
`apps/web/next.config.ts`). The version comes from the installed `maplibre-gl` package
(`NEXT_PUBLIC_MAPLIBRE_VERSION`, set in `next.config.ts`); `scripts/prepare.mts` copies the files into
`public/maplibre/<version>/` and clears older folders. An upgrade changes the URL, so nothing stale is served.
The old fixed paths are gone. Nothing a visitor sees changes.

Response headers for the worker, local production build: before `max-age=0` (Next's default for
public files); after `public, max-age=31536000, immutable`.

## Tried and reverted: start the viewer chunk at module load

Calling `import("./Viewer")` at the top of `ViewerShell.tsx`. Throttled phone (390x844, empty cache,
562.5 ms RTT, 1.47 Mbit/s, CPU 1x, local build), measured as time until `map.loaded()` and tiles loaded
(not the D-609 colors-on-screen frame; software WebGL here makes that ~25 s): 24.9 / 24.7 / 24.9 s
before, 24.9 / 24.8 / 24.7 s after. Median 24.9 vs 24.8: no gain near the 0.3 s bar. Reverted.
