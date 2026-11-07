// Cities of 100,000 people or more and their published values, for the dataset pages' key numbers
// (issue #244). Not part of the build; run by hand after `ingest areas` refreshes the city files:
//   node apps/web/scripts/big-cities.mjs
// Population: the Census Bureau's July 1, 2024 city estimates (Vintage 2024, public CSV, no key; the
// usual "cities over 100,000" list). Values: each city's areas/<code>.json on tiles.mapwich.org (D-475).
// Only incorporated places with a city file (no CDPs, D-475), so e.g. Urban Honolulu is left out.
// Writes apps/web/src/generated/cities.json: [[code, name, population, { dataset: [value, moe] }], …].
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://tiles.mapwich.org";
const MIN_POP = 100000;
const get = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

const csv = await fetch("https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv").then((r) => r.text());
const [head, ...rows] = csv.trim().split(/\r?\n/).map((l) => l.split(",")); // no quoted commas in the columns read here
const [lev, st, pl, p] = ["SUMLEV", "STATE", "PLACE", "POPESTIMATE2024"].map((k) => head.indexOf(k));
// SUMLEV 162 = an incorporated place, one row each.
const pop = new Map(rows.filter((r) => r[lev] === "162" && +r[p] >= MIN_POP).map((r) => [`place${r[st]}${r[pl]}`, +r[p]]));
// City names as search shows them ("Minneapolis, MN"); only rows with a code have a city file.
const names = new Map((await get(`${BASE}/geo/search.json`)).filter((r) => pop.has(r[2])).map((r) => [r[2], r[0]]));

const out = [];
const codes = [...names.keys()];
for (let i = 0; i < codes.length; i += 20) {
  await Promise.all(codes.slice(i, i + 20).map(async (code) => {
    const r = await fetch(`${BASE}/areas/${code}.json`);
    if (r.ok) out.push([code, names.get(code), pop.get(code), (await r.json()).v]);
  }));
}
out.sort((a, b) => b[2] - a[2]);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/generated/cities.json"), JSON.stringify(out));
console.log(`${pop.size} places of ${MIN_POP.toLocaleString()}+; ${out.length} with a city file written`);
