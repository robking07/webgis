// Build one self-contained HTML review page from two screenshot runs (screenshots.mjs output).
//
//   node e2e/review-page.mjs --before e2e/shots/live --after e2e/shots/preview \
//        --notes e2e/notes.example.json --out e2e/shots/review.html
//
// Each view shows before and after side by side: the phone shots at true 1:1 size (the PNGs are
// 2x, shown at 390 CSS px) and the laptop shots at full width (click one to see it at 1:1).
// Numbered notes sit beside the pair. Images are inlined as data URIs, so the single HTML file can
// be published as a page. Views come from the "before" run's manifest.json (or the notes file).
//
// Notes file: { "title", "intro", "beforeLabel", "afterLabel",
//   "views": { "<view name>": { "title", "notes": [ { "n": 1, "text": "…", "x"?: 0-100, "y"?: 0-100 } ] } } }
// x and y (percent of the screenshot) place a numbered pin on both images; leave them out for a
// note with no pin. "size": "phone" or "laptop" puts the pin on that size's shots only;
// "at": { "phone": [x, y], "laptop": [x, y] } places it per size (the layouts differ). Views listed in the notes file but missing from a run are skipped with a warning.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
if (!args.before || !args.after) {
  console.error("Usage: node e2e/review-page.mjs --before <dir> --after <dir> [--notes notes.json] [--out review.html]");
  process.exit(2);
}
const beforeDir = resolve(args.before), afterDir = resolve(args.after);
const out = resolve(args.out || "review.html");
const notes = args.notes ? JSON.parse(readFileSync(resolve(args.notes), "utf8")) : {};
const manifest = (d) => JSON.parse(readFileSync(join(d, "manifest.json"), "utf8"));
const mb = manifest(beforeDir), ma = manifest(afterDir);

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const img = (dir, file) => {
  if (!file || !existsSync(join(dir, file))) return null;
  return `data:image/png;base64,${readFileSync(join(dir, file)).toString("base64")}`;
};
const beforeLabel = notes.beforeLabel || "Before (live)";
const afterLabel = notes.afterLabel || "After (preview)";

function pins(list, cls) {
  return (list || []).map((n) => ({ n: n.n, xy: n.at ? n.at[cls] : n.x != null && n.y != null && (!n.size || n.size === cls) ? [n.x, n.y] : null }))
    .filter((p) => p.xy)
    .map((p) => `<span class="pin" style="left:${+p.xy[0]}%;top:${+p.xy[1]}%">${esc(p.n)}</span>`).join("");
}
function shot(src, cls, label, list) {
  if (!src) return `<figure class="${cls} missing"><figcaption>${esc(label)}</figcaption><div class="none">No screenshot</div></figure>`;
  return `<figure class="${cls}"><figcaption>${esc(label)}</figcaption><div class="frame"><img src="${src}" alt="${esc(label)}"${cls === "laptop" ? ' tabindex="0" role="button" title="Click to zoom to 1:1"' : ""}>${pins(list, cls)}</div></figure>`;
}

const names = [...new Set([...Object.keys(notes.views || {}), ...mb.views.map((v) => v.name)])];
let sections = "";
for (const name of names) {
  const vb = mb.views.find((v) => v.name === name), va = ma.views.find((v) => v.name === name);
  if (!vb && !va) { console.warn(`skipping "${name}": in neither run`); continue; }
  const n = notes.views?.[name] || {};
  const list = n.notes || [];
  const f = (v, s) => v?.files?.[s];
  sections += `
<section>
  <h2>${esc(n.title || name)}</h2>
  <div class="layout">
    <div class="pairs">
      <div class="pair phones">${shot(img(beforeDir, f(vb, "phone")), "phone", beforeLabel, list)}${shot(img(afterDir, f(va, "phone")), "phone", afterLabel, list)}</div>
      <div class="pair laptops">${shot(img(beforeDir, f(vb, "laptop")), "laptop", beforeLabel, list)}${shot(img(afterDir, f(va, "laptop")), "laptop", afterLabel, list)}</div>
    </div>
    <ol class="notes">${list.map((x) => `<li value="${esc(x.n)}">${esc(x.text)}</li>`).join("") || '<li class="empty">No notes for this view.</li>'}</ol>
  </div>
  <p class="src">${esc(vb?.path || va?.path)}</p>
</section>`;
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(notes.title || "UI review")}</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#1c2024;--muted:#5d6670;--line:#d8dde3;--card:#f5f7f9;--pin:#d6336c;--pinfg:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#14171a;--fg:#e8ebee;--muted:#9aa4ad;--line:#2d343b;--card:#1d2226;--pin:#ff6b9a;--pinfg:#14171a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px}
h1{margin:0 0 4px;font-size:1.6rem}h2{margin:40px 0 12px;font-size:1.25rem;border-top:1px solid var(--line);padding-top:24px}
.intro{color:var(--muted);margin:0 0 8px;max-width:60ch}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
.pair{display:flex;gap:16px;margin-bottom:24px}
.phones{flex-wrap:wrap}
.laptops{flex-direction:column}
figure{margin:0}figcaption{font-size:.8rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
.frame{position:relative;border:1px solid var(--line);line-height:0}
.phone .frame{width:390px}.phone img{width:390px;height:auto;display:block}
.laptop .frame{width:100%;max-width:1440px}.laptop img{width:100%;height:auto;display:block;cursor:zoom-in}
.pin{position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:var(--pin);color:var(--pinfg);font:700 13px/26px system-ui;text-align:center;box-shadow:0 0 0 2px var(--bg);pointer-events:none}
.none{padding:40px;border:1px dashed var(--line);color:var(--muted)}
.notes{margin:0;padding:16px 16px 16px 40px;background:var(--card);border:1px solid var(--line);border-radius:8px;position:sticky;top:16px}
.notes li{margin:0 0 12px}.notes li::marker{color:var(--pin);font-weight:700}.notes .empty{list-style:none;color:var(--muted)}
.src{color:var(--muted);font:12px ui-monospace,monospace;word-break:break-all}
#zoom{position:fixed;inset:0;background:rgba(0,0,0,.85);overflow:auto;display:none;z-index:9;cursor:zoom-out}
#zoom.on{display:block}#zoom img{display:block;max-width:none;width:auto}
@media (max-width:1000px){.layout{grid-template-columns:1fr}.notes{position:static}}
</style></head><body><main>
<h1>${esc(notes.title || "UI review")}</h1>
<p class="intro">${esc(notes.intro || "Real screenshots, not mockups. Phones are shown at true size (390 px wide); click a laptop shot to see it at 1:1.")}</p>
<p class="intro">${esc(beforeLabel)}: ${esc(mb.base)} &middot; ${esc(afterLabel)}: ${esc(ma.base)}</p>
${sections}
</main>
<div id="zoom" aria-hidden="true"><img alt=""></div>
<script>
const z=document.getElementById("zoom"),zi=z.querySelector("img");
const show=(i)=>{zi.src=i.src;zi.style.width=i.naturalWidth+"px";z.classList.add("on")};
document.querySelectorAll(".laptop img").forEach(i=>{i.addEventListener("click",()=>show(i));i.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();show(i)}})});
z.addEventListener("click",()=>z.classList.remove("on"));
addEventListener("keydown",e=>{if(e.key==="Escape")z.classList.remove("on")});
</script></body></html>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1048576).toFixed(1)} MB, ${names.length} view(s))`);
