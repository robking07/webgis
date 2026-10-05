// Capture real screenshots of a Mapwich site (live, a preview link or localhost) for UI reviews.
//
//   node e2e/screenshots.mjs --base https://mapwich.org --views e2e/views.example.json --out e2e/shots/live
//
// Options: --base <url> (or BASE)   --views <json> (default e2e/views.example.json)
//          --out <dir> (default e2e/shots/run)   --only <name,name>   --sizes phone,laptop
// Env:     CHROMIUM_PATH, HEADED=1 (same as menus.spec.mjs). Output folders are git-ignored.
//
// Views file: { "views": [ { "name", "path", "theme"?, "steps"? } ] }. `path` is a URL path with
// query or hash (the app keeps its state in the query: ?d=&at=lon,lat,zoom&lv=&theme=). `steps`
// run in order before the shot: { "click": css } | { "clickText": "label" } | { "wait": ms } |
// { "waitFor": css } | { "press": "Escape" }; add "optional": true to skip a step that finds nothing.
// Every shot waits for MapLibre to be idle (style loaded, tiles in, nothing moving).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) continue;
  const next = argv[i + 1];
  args[argv[i].slice(2)] = next && !next.startsWith("--") ? next : "1";
}
const BASE = (args.base || process.env.BASE || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Usage: node e2e/screenshots.mjs --base <url> [--views file.json] [--out dir] [--only a,b] [--sizes phone,laptop]");
  process.exit(2);
}
const viewsFile = resolve(args.views || join(here, "views.example.json"));
const outDir = resolve(args.out || join(here, "shots", "run"));
const only = args.only ? args.only.split(",") : null;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const sizes = (args.sizes || "phone,laptop").split(",").filter((s) => SIZES[s]);
const views = JSON.parse(readFileSync(viewsFile, "utf8")).views.filter((v) => !only || only.includes(v.name));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "*" };

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: !process.env.HEADED,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

/** Wait until MapLibre has a style, its tiles are in and nothing is moving. */
async function mapIdle(page, max = 30000) {
  await page.waitForFunction(() => !!window.__wgMap, null, { timeout: max });
  await page.waitForFunction(() => { const m = window.__wgMap; return m.isStyleLoaded() && m.areTilesLoaded() && !m.isMoving(); }, null, { timeout: max, polling: 200 });
  await wait(600);
}

const manifest = { base: BASE, taken: new Date().toISOString(), views: [] };
for (const v of views) {
  const entry = { name: v.name, path: v.path, files: {} };
  for (const size of sizes) {
    const ctx = await browser.newContext({ ...SIZES[size], colorScheme: v.theme === "dark" ? "dark" : "light" });
    // tiles.mapwich.org only allows the production origins; answer CORS so previews/localhost draw.
    await ctx.route(/tiles\.mapwich\.org/, async (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      try {
        const res = await route.fetch();
        await route.fulfill({ response: res, headers: { ...res.headers(), ...CORS } });
      } catch { await route.abort().catch(() => {}); }
    });
    const page = await ctx.newPage();
    const url = new URL(v.path.startsWith("/") ? v.path : `/${v.path}`, `${BASE}/`);
    if (v.theme) url.searchParams.set("theme", v.theme);
    url.searchParams.set("debug", "1"); // exposes window.__wgMap so we can tell when the map is drawn
    try {
      await page.goto(url.href, { waitUntil: "load" });
      await mapIdle(page);
      for (const s of v.steps ?? []) {
        const t = s.optional ? 3000 : 10000;
        try {
          if (s.click) await page.locator(s.click).first().click({ timeout: t });
          else if (s.clickText) await page.getByText(s.clickText, { exact: false }).first().click({ timeout: t });
          else if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: t });
          else if (s.press) await page.keyboard.press(s.press);
          else if (s.wait) await wait(s.wait);
        } catch (e) {
          if (!s.optional) throw e;
          console.warn(`  skipped optional step ${JSON.stringify(s)}`);
        }
        await mapIdle(page).catch(() => {});
      }
      const file = `${v.name}-${size}.png`;
      await page.screenshot({ path: join(outDir, file) });
      entry.files[size] = file;
      console.log(`ok   ${v.name} ${size} -> ${join(outDir, file)}`);
    } catch (e) {
      console.error(`FAIL ${v.name} ${size}: ${e.message.split("\n")[0]}`);
      process.exitCode = 1;
    }
    await ctx.close();
  }
  manifest.views.push(entry);
}
await browser.close();
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
