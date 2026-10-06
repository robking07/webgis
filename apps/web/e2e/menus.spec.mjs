// End-to-end checks for the map menus (issue #34, D-135): run against a production build with
// `npm run test:e2e -w web` (see e2e/README.md). Asserts behavior at a phone (390 × 844), a laptop
// (1366 × 768) and a monitor (1920 × 1080); it does not compare screenshots.
//
// Env: BASE=<url> tests an already running server instead of starting `next start`;
// E2E_PORT (default 3199); CHROMIUM_PATH (default: playwright-core's own Chromium);
// ONLY=<substring> runs only the tests whose names contain it; HEADED=1 shows the browser.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const PORT = Number(process.env.E2E_PORT || 3199);
let BASE = process.env.BASE?.replace(/\/$/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Server ─────────────────────────────────────────────────────────────────────
let server = null;
if (!BASE) {
  BASE = `http://localhost:${PORT}`;
  const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { cwd: app, stdio: ["ignore", "pipe", "pipe"] })
    .on("error", () => {});
  let out = "";
  server.stdout.on("data", (d) => { out += d; });
  server.stderr.on("data", (d) => { out += d; });
  const t0 = Date.now();
  for (;;) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ }
    if (Date.now() - t0 > 60000 || server.exitCode != null) {
      console.error(`next start didn't come up on ${BASE} (run \`npm run build -w web\` first?)\n${out}`);
      process.exit(2);
    }
    await wait(500);
  }
}

// ── Browser ────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: !process.env.HEADED,
  // Software WebGL, so MapLibre draws in headless Chrome without a GPU.
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const VP = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1366, height: 768 } },
  monitor: { viewport: { width: 1920, height: 1080 } },
};
const phoneAt = (width) => ({ ...VP.phone, viewport: { width, height: 844 } });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "*" };

/** Open a page. Boundary tiles come from tiles.mapwich.org, whose CORS rules only allow the
 *  production origins, so the test answers the preflight itself and adds the CORS headers to the
 *  real responses (the tiles are still fetched for real). */
async function open(vp, path, { scheme = "light", ready = true } = {}) {
  const ctx = await browser.newContext({ ...(typeof vp === "string" ? VP[vp] : vp), colorScheme: scheme });
  await ctx.route(/tiles\.mapwich\.org/, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    try {
      const res = await route.fetch();
      await route.fulfill({ response: res, headers: { ...res.headers(), ...CORS } });
    } catch { await route.abort().catch(() => {}); }
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.requests = [];
  page.on("request", (r) => page.requests.push(r.url()));
  page.on("pageerror", (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Vercel Web Analytics only exists on Vercel; locally its script 404s.
    if ((m.location()?.url ?? "").includes("/_vercel/")) return;
    page.errors.push(`console: ${m.text()} ${m.location()?.url ?? ""}`);
  });
  page.isPhone = (typeof vp === "string" ? VP[vp] : vp).isMobile === true;
  const sep = path.includes("?") ? "&" : "?";
  await page.goto(`${BASE}${path}${sep}theme=${scheme}&debug=1`, { waitUntil: "load" });
  if (ready) await mapIdle(page);
  return { ctx, page };
}

/** Wait until MapLibre has a style, its tiles are in and nothing is moving. */
async function mapIdle(page, max = 30000) {
  await page.waitForFunction(() => !!window.__wgMap, null, { timeout: max });
  await page.waitForFunction(() => { const m = window.__wgMap; return m.isStyleLoaded() && m.areTilesLoaded() && !m.isMoving(); }, null, { timeout: max, polling: 200 });
  await wait(400);
}

// ── Gestures ───────────────────────────────────────────────────────────────────
/** Start a one-finger drag (phones, real touch events) or a mouse drag, and hold it. */
async function dragStart(page, dx = -80, dy = -40) {
  const { width, height } = page.viewportSize();
  const x = width / 2, y = height * 0.6;
  if (page.isPhone) {
    const cdp = await page.context().newCDPSession(page);
    page.cdp = cdp;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12, id: 1 }] });
      await wait(25);
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 12 });
  }
  await wait(350);
}
async function dragEnd(page) {
  if (page.cdp) { await page.cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.cdp.detach(); page.cdp = null; }
  else await page.mouse.up();
}
/** The first gesture "immerses" the page (D-25): a tiny drag. */
async function immerse(page) {
  await dragStart(page, 0, -40);
  await dragEnd(page);
  await wait(1500);
  await mapIdle(page);
}
/** Put a point at the middle of the screen (clear of every panel) and tap or click it. */
async function tapLonLat(page, lon, lat) {
  await page.evaluate(([lon, lat]) => window.__wgMap.jumpTo({ center: [lon, lat] }), [lon, lat]);
  await mapIdle(page);
  const [x, y] = await page.evaluate(([lon, lat]) => { const p = window.__wgMap.project([lon, lat]); return [p.x, p.y]; }, [lon, lat]);
  await tapAt(page, x, y);
}
const HENNEPIN = [-93.4752, 45.0061];
async function tapAt(page, x, y) {
  if (page.isPhone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}

// ── Measuring ──────────────────────────────────────────────────────────────────
/** Runs in the page: contrast of an element's text (and icons, and its edge) against the backing it
 *  actually sits on: the first ancestor with a background, alpha-composited down to an opaque color.
 *  Reaching the map without one means halo-only text over the map, which fails. */
const contrastInPage = (sel) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const g = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  /** The opaque color behind `el`, and the element that provides it (null if it's the map). */
  const backing = (el) => {
    const layers = [];
    let opacity = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      opacity *= parseFloat(cs.opacity);
      if (n.classList.contains("maplibregl-map") || n.querySelector?.(":scope > canvas.maplibregl-canvas")) return { color: null, by: null, opacity };
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) { layers.push({ c, n }); if (c[3] >= 0.999) break; }
    }
    if (!layers.length || layers[layers.length - 1].c[3] < 0.999) return { color: null, by: layers[0]?.n ?? null, opacity };
    let col = layers[layers.length - 1].c;
    for (let i = layers.length - 2; i >= 0; i--) col = over(layers[i].c, col);
    return { color: col, by: layers[0].n, opacity };
  };
  const out = [];
  for (const root of document.querySelectorAll(sel)) {
    if (!root.getClientRects().length) continue;
    const b = backing(root);
    const textEls = [root, ...root.querySelectorAll("*")].filter((n) => [...n.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim()) && n.getClientRects().length);
    for (const n of textEls) {
      const nb = backing(n);
      const fg = rgba(getComputedStyle(n).color);
      out.push({ sel, kind: "text", text: [...n.childNodes].filter((t) => t.nodeType === 3).map((t) => t.textContent).join("").trim().slice(0, 40),
        ratio: nb.color ? ratio(over(fg, nb.color), nb.color) : 0, backed: !!nb.color });
    }
    for (const svg of root.querySelectorAll("svg")) {
      if (!svg.getClientRects().length) continue;
      const nb = backing(svg);
      const fg = rgba(getComputedStyle(svg).color);
      out.push({ sel, kind: "icon", text: svg.getAttribute("class")?.split(" ").find((c) => c.startsWith("lucide-")) ?? "svg", ratio: nb.color ? ratio(over(fg, nb.color), nb.color) : 0, backed: !!nb.color });
    }
    const cs = getComputedStyle(root);
    if (parseFloat(cs.borderTopWidth) > 0 && b.color) {
      const edge = rgba(cs.borderTopColor);
      out.push({ sel, kind: "edge", text: "border", ratio: ratio(over(edge, b.color), b.color), backed: true });
    }
  }
  return out;
};

// ── Harness ────────────────────────────────────────────────────────────────────
const results = [];
const notes = [];
const only = process.env.ONLY;
class Fail extends Error {}
function expect(cond, msg) { if (!cond) throw new Fail(msg); }
const queue = [];
function test(name, fn) { if (!only || name.includes(only)) queue.push([name, fn]); }
async function run(name, fn) {
  const t0 = Date.now();
  const opened = [];
  const o = async (...a) => { const r = await open(...a); opened.push(r); return r; };
  try {
    await fn(o);
    for (const { page } of opened) expect(page.errors.length === 0, `console errors:\n      ${page.errors.join("\n      ")}`);
    results.push({ name, ok: true });
    console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    results.push({ name, ok: false, msg: e.message });
    console.log(`  ✗ ${name}\n      ${e instanceof Fail ? e.message : e.stack?.split("\n").slice(0, 3).join("\n      ")}`);
  } finally {
    for (const { ctx } of opened) await ctx.close().catch(() => {});
  }
}
const live = (page) => page.locator("[data-filter-button]:not([inert] *)").first();
const opacityOf = (loc) => loc.evaluate((el) => { let o = 1; for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; });

// ── Tests ──────────────────────────────────────────────────────────────────────
console.log(`Map menus e2e against ${BASE}`);

for (const vp of ["phone", "laptop", "monitor"]) {
  test(`${vp}: landing draws states and shows the Filters button`, async (o) => {
    const { page } = await o(vp, "/map");
    const states = await page.evaluate(() => window.__wgMap.queryRenderedFeatures({ layers: window.__wgMap.getStyle().layers.filter((l) => l.id.startsWith("state-fill")).map((l) => l.id) }).length);
    expect(states > 20, `expected states drawn, got ${states} features`);
    expect(await live(page).isVisible(), "Filters button not visible");
  });
}

/** The phone card: one line each for the meta and the actions, and no line starting with "·". */
async function cardLines(page) {
  return page.evaluate(() => {
    const card = document.querySelector('section[aria-label="Mapped dataset"]');
    const one = (el) => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
      const span = el.querySelector(".truncate") ?? el;
      const text = span.textContent;
      // Where the visible part ends: the first character past the span's right edge.
      let cutBefore = text.length;
      const node = span.firstChild;
      const right = span.getBoundingClientRect().right;
      if (node?.nodeType === 3) for (let i = 0; i < text.length; i++) {
        const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1);
        if (r.getBoundingClientRect().right > right + 0.5) { cutBefore = i; break; }
      }
      return { h: el.getBoundingClientRect().height, lh, overflow: span.scrollWidth > span.clientWidth + 1, text: el.textContent,
        ellipsis: getComputedStyle(span).textOverflow === "ellipsis", cutBefore, sourceStart: text.lastIndexOf(" · ") + 3 };
    };
    // Every "·" separator: is it the first thing on its line?
    const lineStart = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const i = t.textContent.indexOf("·");
      if (i < 0) continue;
      const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
      const box = r.getBoundingClientRect();
      const line = t.parentElement.closest("p, h1, div, section");
      const lr = line.getBoundingClientRect();
      const cs = getComputedStyle(line);
      if (box.left - (lr.left + parseFloat(cs.paddingLeft)) < 4) lineStart.push(line.textContent.slice(0, 50));
    }
    return { meta: one(card.querySelector("[data-card-meta]")), actions: one(card.querySelector("[data-card-actions]")), lineStart, titleLines: Math.round(card.querySelector("h1").getBoundingClientRect().height / parseFloat(getComputedStyle(card.querySelector("h1 button")).lineHeight)) };
  });
}
test("phone card: meta and actions never wrap at 360, 390 and 430 px, long names included", async (o) => {
  // The longest titles and the longest meta lines in the registry.
  const ids = ["median_household_income", "pct_nhpi_nh", "pct_aian_nh", "cejst_disadvantaged_tracts", "census2020_pop_density", "ice_287g_agreements", "aadt", "bridges_poor_condition", "traffic_fatalities", "annual_precipitation", "obesity", "job_density"];
  const bad = [];
  for (const w of [360, 390, 430]) for (const id of ids) {
    const { page, ctx } = await o(phoneAt(w), `/map?d=${id}`, { ready: false });
    await page.waitForSelector("[data-card-meta]");
    await wait(300);
    const r = await cardLines(page);
    if (r.meta.h > r.meta.lh * 1.5) bad.push(`${w}px ${id}: meta wraps (${r.meta.text})`);
    // Last resort: the source (last on the line) may end in an ellipsis; the level and period may not.
    if (r.meta.overflow && !r.meta.ellipsis) bad.push(`${w}px ${id}: meta cut off without an ellipsis (${r.meta.text})`);
    if (r.meta.overflow && r.meta.cutBefore < r.meta.sourceStart) bad.push(`${w}px ${id}: meta cut before the source (${r.meta.text})`);
    if (r.meta.overflow) notes.push(`${w}px ${id}: source ends in an ellipsis ("${r.meta.text}")`);
    if (r.actions.h > r.actions.lh * 1.5) bad.push(`${w}px ${id}: actions wrap (${r.actions.text})`);
    if (r.lineStart.length) bad.push(`${w}px ${id}: a line starts with "·": ${r.lineStart.join(" | ")}`);
    if (r.titleLines > 3) bad.push(`${w}px ${id}: title takes ${r.titleLines} lines`);
    await ctx.close();
  }
  for (const n of notes) console.log(`      note: ${n}`);
  expect(!bad.length, bad.join("\n      "));
});

test("phone filters: staged until Apply, then the count and the map filter", async (o) => {
  const { page } = await o("phone", "/map?d=aadt&at=-93.27,44.97,11");
  await immerse(page);
  await live(page).click();
  await page.waitForSelector('#filters-panel[role="dialog"]');
  await wait(500);
  for (const label of ["County road", "City or local road"]) await page.locator("#filters-panel label", { hasText: label }).first().click();
  const before = await page.evaluate(() => window.__wgMap.getFilter("aadt-line"));
  expect(!before, `the map is filtered before Apply: ${JSON.stringify(before)}`);
  expect((await page.getByRole("button", { name: /^Apply filters/ }).innerText()).includes("(2)"), "Apply doesn't count 2 changes");
  await page.getByRole("button", { name: /^Apply filters/ }).click();
  await page.waitForSelector("#filters-panel", { state: "detached" });
  const btn = live(page);
  expect((await btn.getAttribute("aria-label")) === "Filters, 2 set", `button label: ${await btn.getAttribute("aria-label")}`);
  expect((await btn.innerText()).includes("2"), "the button doesn't show 2");
  const after = JSON.stringify(await page.evaluate(() => window.__wgMap.getFilter("aadt-line")));
  expect(after && after.includes("road_type"), `map filter after Apply: ${after}`);
  expect((await page.locator("[data-filter-note]:not([inert] *)").first().innerText()).includes("2 road types hidden"), "note doesn't say 2 road types hidden");
});

for (const vp of ["laptop", "monitor"]) {
  test(`${vp} filters: sidebar applies live, closes, and the count stays`, async (o) => {
    const { page } = await o(vp, "/map?d=aadt&at=-93.27,44.97,11");
    await live(page).click();
    const side = page.locator("section#filters-panel");
    await side.waitFor();
    expect(await side.evaluate((el) => el.classList.contains("wg-glass")), "sidebar isn't the glass panel");
    await page.locator("#filters-panel label", { hasText: "County road" }).first().click();
    await wait(300);
    const f = JSON.stringify(await page.evaluate(() => window.__wgMap.getFilter("aadt-line")));
    expect(f && f.includes("road_type"), `sidebar change didn't apply live: ${f}`);
    await page.getByRole("button", { name: "Close filters" }).click();
    await side.waitFor({ state: "detached" });
    expect((await live(page).getAttribute("aria-label")) === "Filters, 1 set", `count after close: ${await live(page).getAttribute("aria-label")}`);
    const f2 = JSON.stringify(await page.evaluate(() => window.__wgMap.getFilter("aadt-line")));
    expect(f2 === f, "filter dropped when the sidebar closed");
  });
}

for (const vp of ["phone", "laptop", "monitor"]) {
  test(`${vp} filters: year and level change the map and the legend`, async (o) => {
    const { page } = await o(vp, "/map?d=median_household_income&at=-93.6,45.3,6.4");
    await live(page).click();
    await page.locator("#filters-panel").waitFor();
    await wait(400);
    await page.locator('#filters-panel [role=radiogroup][aria-label=Years] [role=radio]', { hasText: "2010–2014" }).first().click();
    await page.locator("#filters-panel label", { hasText: /^Counties/ }).first().click();
    // The selected level stays readable (regression: it once rendered pale).
    const lvl = await page.evaluate(contrastInPage, '#filters-panel label:has(input[type=radio]:checked)');
    expect(lvl.length && lvl.every((r) => r.ratio >= 4.5), `selected level contrast: ${JSON.stringify(lvl)}`);
    if (page.isPhone) await page.getByRole("button", { name: /^Apply filters/ }).click();
    else await page.getByRole("button", { name: "Close filters" }).click();
    await page.waitForSelector("#filters-panel", { state: "detached" });
    await wait(800);
    await mapIdle(page);
    const url = new URL(page.url());
    expect(url.searchParams.get("lv") === "county" && url.searchParams.get("t") === "2014", `URL: ${url.search}`);
    const counties = await page.evaluate(() => window.__wgMap.queryRenderedFeatures({ layers: window.__wgMap.getStyle().layers.filter((l) => l.id.startsWith("county-fill")).map((l) => l.id) }).length);
    expect(counties > 10, `counties not drawn (${counties})`);
    if (page.isPhone) {
      const strip = await page.locator("button[data-legend]").innerText();
      expect(strip.includes("2010–2014"), `legend strip doesn't name the year: ${strip}`);
      await page.locator("button[data-legend]").click();
    }
    const legend = await page.locator('section[aria-label="Legend"]').innerText();
    expect(legend.includes("Median household income") && legend.includes("2010–2014") && legend.includes("County"), `legend: ${legend.slice(0, 120)}`);
    // The note beside the button says "Counties" (regression: "Countys").
    const note = await page.locator("[data-filter-note]").first().innerText();
    expect(note.trim().startsWith("Counties"), `level note: ${note}`);
  });
}

for (const [vp, hides] of [["phone", true], ["laptop", true], ["monitor", false]]) {
  test(`${vp} mid-pan: menus ${hides ? "step aside and return" : "and sidebar stay put"}`, async (o) => {
    const { page } = await o(vp, "/map?d=median_household_income&at=-93.27,44.97,9");
    await immerse(page);
    const menu = page.getByRole("button", { name: "Show navigation" });
    if (!page.isPhone) { await live(page).click(); await page.locator("section#filters-panel").waitFor(); await wait(300); }
    const side = page.locator("section#filters-panel");
    await dragStart(page);
    const during = { menu: await opacityOf(menu), side: page.isPhone ? null : await opacityOf(side) };
    await dragEnd(page);
    await wait(1500);
    // Slow machines (CI's software WebGL) can still be mid-fade here; let CSS transitions finish.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 5000 }).catch(() => {});
    const after = { menu: await opacityOf(menu), side: page.isPhone ? null : await opacityOf(side) };
    if (vp === "phone") {
      expect(during.menu === 0, `menu button visible mid-pan (${during.menu})`);
      expect(after.menu === 1, `menu button didn't return (${after.menu})`);
      expect(await live(page).isVisible(), "Filters button gone after the pan");
    } else if (vp === "laptop") {
      expect(during.side === 0, `sidebar visible mid-pan (${during.side})`);
      expect(during.menu < 1, `menu button not dimmed mid-pan (${during.menu})`);
      expect(after.side === 1 && after.menu === 1, `didn't return: ${JSON.stringify(after)}`);
    } else {
      expect(during.side === 1 && during.menu === 1, `monitor chrome moved mid-pan: ${JSON.stringify(during)}`);
    }
  });
}

test("monitor: an open dataset drop-down closes on pan and sits above the sidebar", async (o) => {
  const { page } = await o("monitor", "/map?d=median_household_income&at=-93.27,44.97,9");
  await immerse(page);
  await live(page).click();
  await page.locator("section#filters-panel").waitFor();
  await page.getByRole("button", { name: /other .* datasets/ }).click();
  const menu = page.locator('[role=menu][aria-label="Categories"]');
  await menu.waitFor();
  await wait(400);
  // Regression: the dataset list must not sit under (or tangle with) the filters sidebar.
  const onTop = await page.evaluate(() => {
    const panel = document.querySelector('[role=menu][aria-label="Categories"]').parentElement;
    const r = panel.getBoundingClientRect();
    const pts = [[r.left + 20, r.top + 20], [r.left + r.width / 2, r.top + r.height / 2], [r.right - 20, r.bottom - 20]];
    return pts.every(([x, y]) => panel.contains(document.elementFromPoint(x, y)));
  });
  expect(onTop, "the dataset list is covered by another panel");
  const side = page.locator("section#filters-panel");
  const sideShown = (await side.count()) ? await opacityOf(side) : 0;
  if (sideShown > 0) {
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('[role=menu][aria-label="Categories"]').parentElement.getBoundingClientRect();
      const b = document.querySelector("section#filters-panel").getBoundingClientRect();
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
    expect(!overlap, "the dataset list overlaps the visible filters sidebar");
  }
  await dragStart(page);
  await dragEnd(page);
  await wait(400);
  expect((await menu.count()) === 0, "drop-down still open after a pan");
});

test("phone dataset sheet: chips, pick switches the map, sheet and details close each other", async (o) => {
  const { page } = await o("phone", "/map?d=median_household_income&lv=county&at=-93.4752,45.0061,7.2");
  await immerse(page);
  // Details first, then the list: opening the list closes the details.
  await tapLonLat(page, ...HENNEPIN);
  await page.locator('section[aria-label^="Details for Hennepin County"]').waitFor();
  await page.getByRole("button", { name: /other .* datasets/ }).click();
  const sheet = page.locator('section[aria-label="Dataset list"]');
  await sheet.waitFor();
  expect((await page.locator('section[aria-label^="Details for"]').count()) === 0, "details still open under the dataset list");
  const chips = sheet.locator('[role=radiogroup][aria-label=Categories] [role=radio]');
  expect((await chips.count()) >= 8, `only ${await chips.count()} category chips`);
  expect((await sheet.locator("[role=radio][aria-checked=true]").innerText()).trim() === "Income & poverty", "current category chip not selected");
  await chips.filter({ hasText: "Commuting" }).click();
  await sheet.getByRole("menuitemradio", { name: /Work from home/i }).first().click();
  await sheet.waitFor({ state: "detached" });
  await page.waitForFunction(() => new URL(location.href).searchParams.get("d") === "pct_work_from_home");
  await mapIdle(page);
  expect((await page.locator("[data-dataset-heading]").innerText()).includes("from home"), "heading didn't switch");
  // And the other way: details close the list.
  await page.getByRole("button", { name: /other .* datasets/ }).click();
  await sheet.waitFor();
  await page.locator('section[aria-label="Dataset list"] button[aria-label="Close the dataset list"]').click();
  await sheet.waitFor({ state: "detached" });
  await page.getByRole("button", { name: /other .* datasets/ }).click();
  await sheet.waitFor();
  // Tapping the map above the sheet opens details, which closes the list.
  // The sheet covers the lower part of the screen: tap the map just above it.
  const top = await sheet.evaluate((el) => el.getBoundingClientRect().top);
  await tapAt(page, page.viewportSize().width / 2, top - 40);
  await page.locator('section[aria-label^="Details for"]').waitFor();
  expect((await sheet.count()) === 0, "dataset list still open with the details");
});

for (const vp of ["phone", "laptop"]) {
  test(`${vp} details: Hennepin County has "Minnesota ›", which frames Minnesota; no Census Reporter`, async (o) => {
    const { page } = await o(vp, "/map?d=median_household_income&lv=county&at=-93.4752,45.0061,8");
    await immerse(page);
    await tapLonLat(page, ...HENNEPIN);
    const det = page.locator('section[aria-label^="Details for Hennepin County"]');
    await det.waitFor();
    const nav = det.locator('nav[aria-label="Places this sits inside"]');
    await nav.waitFor();
    const navText = (await nav.innerText()).replace(/\s+/g, " ");
    expect(/Minnesota ›/.test(navText), `inside links: ${navText}`);
    expect((await det.locator("a[href*=censusreporter]").count()) === 0, "Census Reporter link in the details");
    expect(!/Census Reporter/i.test(await det.innerText()), "Census Reporter mentioned in the details");
    await nav.getByRole("button", { name: "Minnesota" }).click();
    await wait(800);
    await mapIdle(page);
    const b = await page.evaluate(() => { const m = window.__wgMap; const c = m.getBounds(); return { w: c.getWest(), e: c.getEast(), s: c.getSouth(), n: c.getNorth(), z: m.getZoom() }; });
    // Minnesota spans about -97.2..-89.5 W, 43.5..49.4 N: framing it shows all of that, not a sliver.
    expect(b.w < -96.5 && b.e > -90 && b.s < 44 && b.n > 49, `view after "Minnesota": ${JSON.stringify(b)}`);
    await page.locator('section[aria-label^="Details for Minnesota"]').waitFor();
  });
}

test("no Census Reporter link for any ACS dataset (registry)", async (o) => {
  void o;
  const { default: entries } = await import(join(app, "src/generated/registry.json"), { with: { type: "json" } });
  const cr = entries.filter((d) => (d.learnMore ?? []).some((l) => /censusreporter/i.test(l.url) || /Census Reporter/i.test(l.label)));
  expect(cr.length === 0, `still linking Census Reporter: ${cr.map((d) => d.id).join(", ")}`);
  const keep = ["aadt", "cejst_disadvantaged_tracts", "cejst_pct_pop_disadvantaged"].filter((id) => !(entries.find((d) => d.id === id)?.learnMore ?? []).length);
  expect(keep.length === 0, `lost their Learn more links: ${keep.join(", ")}`);
});

test("splash at /, old map links forward to /map (D-193)", async (o) => {
  const { page: splash } = await o("phone", "/", { ready: false });
  expect((await splash.locator("main").innerText()).trim() === "which map?", "splash shows only 'which map?'");
  expect((await splash.locator("a, nav, header, footer").count()) === 0, "splash has no links, nav, header or footer");
  const { page } = await o("laptop", "/?d=median_household_income");
  const u = new URL(page.url());
  expect(u.pathname === "/map" && u.searchParams.get("d") === "median_household_income", `old link ended at ${u.pathname}${u.search}`);
});

test('details with no links show no "Learn more" heading', async (o) => {
  const { page } = await o("laptop", "/map?d=pct_poverty&lv=county&at=-93.4752,45.0061,8");
  await immerse(page);
  await tapLonLat(page, ...HENNEPIN);
  const det = page.locator('section[aria-label^="Details for"]');
  await det.waitFor();
  await wait(800);
  expect(!/Learn more/i.test(await det.innerText()), "an empty Learn more heading rendered");
});

/** State and county details come from static files (S1, D-198): no request may reach the database. */
const dbCalls = (page) => page.requests.filter((u) => /supabase\.co|\/rest\/v1\//.test(u));
for (const vp of ["phone", "laptop"]) {
  test(`${vp} static details: state and county clicks and place pages never call the database`, async (o) => {
    for (const [path, at, want] of [["/map?d=median_household_income&lv=county&at=-93.4752,45.0061,8", HENNEPIN, "Hennepin"],
      ["/map?d=median_household_income&lv=state&at=-94.32,46.22,5", [-94.32, 46.22], "Minnesota"]]) {
      const { page } = await o(vp, path);
      await immerse(page);
      await tapLonLat(page, ...at);
      const det = page.locator('section[aria-label^="Details for"]');
      await det.waitFor();
      expect((await det.getAttribute("aria-label")).includes(want), `details opened for ${await det.getAttribute("aria-label")}, not ${want}`);
      await page.waitForFunction(() => /\$\d/.test(document.querySelector('section[aria-label^="Details for"]')?.innerText ?? ""), null, { timeout: 15000 });
      expect(page.requests.some((u) => u.includes("/details/27.json")), "no request for the state's details file");
      expect(!dbCalls(page).length, `database calls: ${dbCalls(page).join(", ")}`);
    }
    for (const [geoid, name] of [["27053", "Hennepin County, MN"], ["27", "Minnesota"]]) {
      const { page } = await o(vp, `/place/${geoid}`, { ready: false });
      await page.locator("main h1").waitFor({ timeout: 20000 });
      expect((await page.locator("main h1").innerText()) === name, `place ${geoid}: heading "${await page.locator("main h1").innerText()}"`);
      const meta = await page.locator("main header p").last().innerText();
      expect(/^[1-9]\d* datasets · [\d,.]+ sq mi of land$/.test(meta), `place ${geoid}: "${meta}"`);
      expect(!dbCalls(page).length, `database calls: ${dbCalls(page).join(", ")}`);
    }
  });
}

for (const vp of ["phone", "laptop", "monitor"]) {
  test(`${vp} zoom levels: block groups never draw at the national view, even pinned`, async (o) => {
    const { page } = await o(vp, "/map?d=median_household_income&lv=block_group");
    const r = await page.evaluate(() => {
      const m = window.__wgMap;
      const ids = m.getStyle().layers.filter((l) => l.id.startsWith("block_group-fill")).map((l) => l.id);
      return { z: m.getZoom(), n: ids.length ? m.queryRenderedFeatures({ layers: ids }).length : 0, ids: ids.length };
    });
    expect(r.z < 5, `not at the national view (zoom ${r.z})`);
    expect(r.n === 0, `${r.n} block groups drawn at zoom ${r.z.toFixed(1)}`);
  });
}

/** Phone chrome over the map: every text, icon and edge against its own backing. */
const PHONE_ON_MAP = ["[data-dataset-heading]", "[data-filter-button]:not([inert] *)", "[data-filter-note]:not([inert] *)", "button[data-legend]",
  'button[aria-label="Show navigation"]', 'button[aria-label="Back to the previous view"]', ".wg-credits", 'section[aria-label="Mapped dataset"]'];
const contrastLog = [];
for (const scheme of ["light", "dark"]) {
  test(`phone contrast (${scheme}): on-map text ≥ 4.5:1, icons and edges ≥ 3:1, all on a backing`, async (o) => {
    // At rest (the card), then immersed with Back showing (after a click zoomed somewhere).
    const { page } = await o("phone", "/map?d=median_household_income&lv=county&at=-93.4752,45.0061,7.2", { scheme });
    let rows = await page.evaluate(contrastInPage, 'section[aria-label="Mapped dataset"]');
    await immerse(page);
    await tapLonLat(page, ...HENNEPIN);
    await page.locator('section[aria-label^="Details for"]').waitFor();
    await page.locator('button[aria-label="Close details"]').click();
    await page.locator('section[aria-label^="Details for"]').waitFor({ state: "detached" });
    await wait(800);
    for (const sel of PHONE_ON_MAP.slice(0, -1)) rows = rows.concat(await page.evaluate(contrastInPage, sel));
    const seen = new Set(rows.map((r) => r.sel));
    const missing = PHONE_ON_MAP.filter((s) => !seen.has(s));
    expect(!missing.length, `not on screen to measure: ${missing.join(", ")}`);
    const bad = rows.filter((r) => !r.backed || r.ratio < (r.kind === "text" ? 4.5 : 3));
    for (const r of rows) contrastLog.push({ scheme, ...r, ratio: +r.ratio.toFixed(2) });
    expect(!bad.length, `below AA or with no backing:\n      ${bad.map((r) => `${r.sel} ${r.kind} "${r.text}" ${r.backed ? r.ratio.toFixed(2) : "no backing"}`).join("\n      ")}`);
  });
}
for (const vp of ["laptop", "monitor"]) {
  test(`${vp} contrast: heading, note, zoom and legend on backings (light and dark)`, async (o) => {
    for (const scheme of ["light", "dark"]) {
      const { page, ctx } = await o(vp, "/map?d=median_household_income&at=-93.27,44.97,9", { scheme });
      await immerse(page);
      let rows = [];
      for (const sel of ["[data-dataset-heading]", "[data-filter-button]:not([inert] *)", "[data-filter-note]:not([inert] *)", ".wg-panel.flex-col", 'button[aria-label="Show navigation"]', 'section[aria-label="Legend"]', ".wg-credits"]) rows = rows.concat(await page.evaluate(contrastInPage, sel));
      const bad = rows.filter((r) => !r.backed || r.ratio < (r.kind === "text" ? 4.5 : r.kind === "icon" ? 3 : 1));
      for (const r of rows) contrastLog.push({ scheme, vp, ...r, ratio: +r.ratio.toFixed(2) });
      expect(!bad.length, `${scheme}: ${bad.map((r) => `${r.sel} ${r.kind} "${r.text}" ${r.backed ? r.ratio.toFixed(2) : "no backing"}`).join("; ")}`);
      await ctx.close();
    }
  });
}

/** S2 (D-210): every data file (values at every level, names, search, tract geography) comes from
 *  the tiles base (R2, or the /tiles link to data/tiles locally), never the site's own /data folder,
 *  and a tract place page needs no database. */
const ownDataFiles = (page) => page.requests.filter((u) => u.startsWith(`${BASE}/data/values`) || u.startsWith(`${BASE}/data/geo`));
for (const vp of ["phone", "laptop"]) {
  test(`${vp} data files: every level and the tract page read the tiles base, not /data`, async (o) => {
    for (const [path, at, want] of [
      ["/map?d=median_household_income&lv=state&at=-94.32,46.22,5", [-94.32, 46.22], "Minnesota"],
      ["/map?d=median_household_income&lv=county&at=-93.4752,45.0061,8", HENNEPIN, "Hennepin"],
      ["/map?d=median_household_income&lv=tract&at=-93.2650,44.9778,11", [-93.2650, 44.9778], "Tract"],
      ["/map?d=median_household_income&lv=block_group&at=-93.2650,44.9778,12.5", [-93.2650, 44.9778], "Block Group"],
    ]) {
      const { page, ctx } = await o(vp, path);
      const level = new URL(path, BASE).searchParams.get("lv");
      expect(page.requests.some((u) => new RegExp(`/values/median_household_income/${level}\\.json`).test(u)), `${level}: no values request (${page.requests.filter((u) => u.includes("values")).join(", ") || "none"})`);
      const drawn = await page.evaluate((lv) => {
        const m = window.__wgMap;
        const ids = m.getStyle().layers.filter((l) => l.id.startsWith(`${lv}-fill`)).map((l) => l.id);
        return ids.length ? m.queryRenderedFeatures({ layers: ids }).length : 0;
      }, level);
      expect(drawn > 0, `${level}: nothing drawn`);
      await immerse(page);
      await tapLonLat(page, ...at);
      const det = page.locator('section[aria-label^="Details for"]');
      await det.waitFor();
      expect((await det.getAttribute("aria-label")).includes(want), `${level}: details opened for ${await det.getAttribute("aria-label")}, not ${want}`);
      await page.waitForFunction(() => /\$\d/.test(document.querySelector('section[aria-label^="Details for"]')?.innerText ?? ""), null, { timeout: 15000 });
      expect(!ownDataFiles(page).length, `${level}: requests to the site's data folder: ${ownDataFiles(page).join(", ")}`);
      expect(!dbCalls(page).length, `${level}: database calls: ${dbCalls(page).join(", ")}`);
      await ctx.close();
    }
    const { page } = await o(vp, "/place/27053100200", { ready: false });
    await page.locator("main h1").waitFor({ timeout: 20000 });
    expect((await page.locator("main h1").innerText()) === "Tract 1002, Hennepin County, MN", `tract page heading "${await page.locator("main h1").innerText()}"`);
    const meta = await page.locator("main header p").last().innerText();
    expect(/^[1-9]\d* datasets · 0\.6 sq mi of land$/.test(meta), `tract page: "${meta}"`);
    expect(page.requests.some((u) => u.includes("/geo/tracts/27053.json")), "no request for the county's tract geography file");
    expect(!ownDataFiles(page).length, `tract page: requests to the site's data folder: ${ownDataFiles(page).join(", ")}`);
    expect(!dbCalls(page).length, `tract page: database calls: ${dbCalls(page).join(", ")}`);
  });
}

test("laptop CSV download: state, county, tract and block group files have rows", async (o) => {
  const { page } = await o("laptop", "/data/median_household_income", { ready: false });
  const want = { States: 50, Counties: 3000, "Census tracts": 80000, "Block groups": 200000 };
  for (const [label, min] of Object.entries(want)) {
    const button = page.getByRole("button", { name: `${label} (CSV)` });
    await button.waitFor({ timeout: 20000 });
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), button.click()]);
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(await dl.path(), "utf8");
    const rows = text.split("\r\n").filter((l) => /^\d/.test(l)).length;
    expect(rows >= min, `${label}: ${rows} rows (want at least ${min})`);
  }
  expect(!ownDataFiles(page).length, `requests to the site's data folder: ${ownDataFiles(page).join(", ")}`);
});

// ── Run ────────────────────────────────────────────────────────────────────────
const t0 = Date.now();
try {
  for (const [name, fn] of queue) await run(name, fn);
} finally {
  await browser.close().catch(() => {});
  server?.kill();
}
if (process.env.CONTRAST_LOG) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.CONTRAST_LOG, JSON.stringify(contrastLog, null, 1));
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(failed.length ? 1 : 0);
