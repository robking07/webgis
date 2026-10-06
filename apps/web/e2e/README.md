# End-to-end tests

`menus.spec.mjs` drives the real app in headless Chromium (Playwright, via `playwright-core`) and
asserts how the map menus behave (issue #34, D-135) at a phone (390 × 844), a laptop (1366 × 768)
and a monitor (1920 × 1080): filters, mid-pan behavior, the phone dataset sheet, the details'
"inside" links, zoom levels, contrast of on-map chrome (light and dark), console errors, and a few
earlier regressions, and that state and county details and place pages never call the database
(D-198). It checks behavior, not screenshots.

## Run it

```sh
npm run build              # from the repo root (the tests run against the production build)
npm run test:e2e -w web    # starts `next start` on port 3199, runs every test, stops the server
```

It prints one line per test and exits non-zero if any fail. A run takes about 5 minutes.

Options (environment variables):

| Variable | What it does |
| --- | --- |
| `BASE=http://localhost:3000` | Test a server that's already running instead of starting one. |
| `E2E_PORT=3199` | Port for the server the test starts. If something already answers on it (another worktree's server), the test runs against that instead; pick a free port or use `BASE`. |
| `ONLY=contrast` | Run only the tests whose names contain this text. |
| `CHROMIUM_PATH=…` | The Chromium (or Chrome) binary to use. |
| `CONTRAST_LOG=/tmp/contrast.json` | Write every measured contrast ratio to a file. |
| `HEADED=1` | Show the browser. |

## Chromium

`playwright-core` doesn't download a browser. Either install Playwright's Chromium once
(`npx playwright-core install chromium`; the test finds it by itself) or point `CHROMIUM_PATH` at a
Chrome/Chromium binary, e.g.
`CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

On a bare Linux or WSL machine Chromium may fail to start with
`error while loading shared libraries: libnss3.so` (or `libnspr4.so`). Install them with
`sudo apt install libnss3 libnspr4`, or, without root, unpack the two `.deb` files
(`apt download libnss3 libnspr4`, then `dpkg -x <file>.deb ./libs`) and run with
`LD_LIBRARY_PATH=./libs/usr/lib/x86_64-linux-gnu npm run test:e2e -w web`.

The browser uses software WebGL (`--use-gl=swiftshader`), so no GPU is needed.

## Tiles from tiles.mapwich.org

Boundary tiles and every data file (values, names, search, details; D-210) come from the tiles base:
`/tiles` locally (the `public/tiles` link to `data/tiles`, so a filled `data/tiles` runs offline), or
`https://tiles.mapwich.org` (Cloudflare R2) when the build sets `NEXT_PUBLIC_TILES_BASE_URL`, as CI does. R2's
CORS rules only allow the production origins. A page on `localhost` would be refused, so the test
intercepts every request to `tiles.mapwich.org`: it answers the CORS preflight itself and adds
`Access-Control-Allow-Origin: *` to the real responses (the tiles are still fetched for real, so a
network connection is required). Nothing on R2 changes.

## Things it ignores

- `/_vercel/insights/script.js` 404s locally (Vercel Web Analytics only exists on Vercel); that
  console error is skipped. Every other console error or page error fails the test it happened in.

## Adding a test

Call `test(name, async (open) => { … })`; `open(viewport, path, { scheme })` returns `{ page }`
with `window.__wgMap` (the MapLibre map, exposed by `?debug=1`) ready and its tiles loaded. Use
`expect(condition, message)` for assertions. Helpers: `immerse`, `dragStart`/`dragEnd` (held
mid-drag), `tapLonLat`, `mapIdle`, and `contrastInPage` (contrast of an element's text, icons and
edge against the backing it actually sits on).

## Screenshots and review pages

For UI proposals Robbie reviews real screenshots, not mockups: today's live site next to the
proposed version on a preview link. Two scripts (same Chromium setup as above, no new dependencies):

- `screenshots.mjs` captures every view in a JSON file at a phone (390 × 844, 2x) and a laptop
  (1440 × 900), after the map has finished drawing. Output goes to `e2e/shots/` (git-ignored).
- `review-page.mjs` joins two runs and a notes file into one self-contained HTML file: each view
  side by side, phone at true 1:1 (390 px wide), laptop at full width (click to zoom), with
  numbered notes beside the pair. Light and dark.

```sh
cd apps/web
npm run shots -- --base https://mapwich.org --views e2e/views.example.json --out e2e/shots/live
npm run shots -- --base https://<preview>.vercel.app --views e2e/views.example.json --out e2e/shots/preview
npm run review-page -- --before e2e/shots/live --after e2e/shots/preview \
  --notes e2e/notes.example.json --out e2e/shots/review.html
```

Use the same views file for both runs so the map position matches. `shots` options: `--only a,b`
(view names), `--sizes phone` or `laptop`. A view is `{ "name", "path", "theme"?, "steps"? }`;
`path` is the app's URL (`/map?d=<dataset>&at=<lon>,<lat>,<zoom>&lv=<level>`), `steps` are clicks and
waits (`click`, `clickText`, `waitFor`, `press`, `wait`, `optional`); see `views.example.json`.
In `notes.example.json` each note's optional `x`/`y` (percent of the screenshot) puts a numbered
pin on both images. Previews behind Vercel login need a bypass link from the project settings.
