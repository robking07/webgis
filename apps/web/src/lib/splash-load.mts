// Splash questions loader (issue #224). Node-only: runs in scripts/prepare.mts before every dev and
// build, reads content/splash/questions.yaml, checks every question's link against the registry and
// the place names, and returns what src/generated/splash.json holds. A mistake fails the build with
// a message naming the question. Relative imports only: plain Node runs this.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SplashQuestion {
  text: string;
  /** /map?d=…[&b=…][&lv=…] or /compare/<A>/<B>?d=… */
  link: string;
  /** "{county}" in the text is a random county; the map opens centered on it. */
  county?: boolean;
}
export interface Splash { approved: boolean; questions: SplashQuestion[] }

type Datasets = Map<string, { geographyLevels: readonly string[] }>;
const LEVEL_BY_LENGTH: Record<number, string> = { 2: "state", 5: "county" };

/** Check the parsed YAML. Throws on a mistake. */
export function checkSplash(raw: unknown, datasets: Datasets, names: Record<string, string>): Splash {
  const fail = (msg: string): never => { throw new Error(`content/splash/questions.yaml: ${msg}`); };
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(r)) if (k !== "approved" && k !== "questions") fail(`unknown field "${k}"`);
  if (typeof r.approved !== "boolean") fail("approved must be true or false");
  if (!Array.isArray(r.questions) || !r.questions.length) fail("questions must be a list of at least one question");
  const questions = (r.questions as unknown[]).map((q, i): SplashQuestion => {
    const at = (msg: string): never => fail(`question ${i + 1}: ${msg}`);
    const o = (q ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(o)) if (!["text", "link", "county"].includes(k)) at(`unknown field "${k}"`);
    if (typeof o.text !== "string" || !o.text.trim().endsWith("?")) at("text must be a question ending in ?");
    const text = (o.text as string).trim();
    if (o.county !== undefined && o.county !== "random") at('county must be "random" (or left out)');
    const county = o.county === "random";
    if (county !== text.includes("{county}") || /\{(?!county\})/.test(text)) at('"{county}" goes in the text exactly when county: random is set');
    if (typeof o.link !== "string") at("link is missing");
    const url = new URL(o.link as string, "https://mapwich.org");
    const params = [...url.searchParams.keys()];
    const known = (id: string | null, what: string) => (id && datasets.get(id)) || at(`${what} "${id ?? ""}" is not a registry dataset`);
    if (url.pathname === "/map") {
      for (const k of params) if (!["d", "b", "lv"].includes(k)) at(`link: unknown map setting "${k}" (use d, b, lv)`);
      const d = known(url.searchParams.get("d"), "map");
      const b = url.searchParams.get("b");
      if (b !== null && known(b, "second map") && b === url.searchParams.get("d")) at("link: the second map is the first map");
      const lv = url.searchParams.get("lv");
      if (lv !== null && !d.geographyLevels.includes(lv)) at(`link: the map has no ${lv} level`);
      if (county && !d.geographyLevels.includes("county")) at("county: random needs a map with county values");
    } else {
      const m = url.pathname.match(/^\/compare\/(\d+)\/(\d+)$/);
      if (!m) at("link must start /map? or /compare/<A>/<B>?d=");
      if (county) at("county: random only works with a /map link");
      const [, a, b] = m!;
      const level = LEVEL_BY_LENGTH[a.length];
      if (!level || a.length !== b.length || a === b) at("link: compare two different states or two different counties");
      for (const g of [a, b]) if (!names[g]) at(`link: no place with code ${g}`);
      if (params.join() !== "d") at("link: a place comparison takes only ?d=<map>");
      if (!known(url.searchParams.get("d"), "map").geographyLevels.includes(level)) at(`link: the map has no ${level} values`);
    }
    return county ? { text, link: o.link as string, county: true } : { text, link: o.link as string };
  });
  return { approved: r.approved as boolean, questions };
}

/** Read and check the file. `drafts`: keep unapproved questions (every build but production). */
export function loadSplash(appDir: string, datasets: Datasets, names: Record<string, string>, drafts: boolean): Splash {
  const s = checkSplash(parseYaml(readFileSync(join(appDir, "content/splash/questions.yaml"), "utf8")), datasets, names);
  return s.approved || drafts ? s : { approved: false, questions: [] };
}
