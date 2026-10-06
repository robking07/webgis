// Prints Lighthouse CI scores as a Markdown table (for the CI job summary).
//   node scripts/lighthouse-summary.mjs .lighthouseci
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const manifest = join(process.argv[2] ?? ".lighthouseci", "reports", "manifest.json");
if (!existsSync(manifest)) {
  console.log("Lighthouse produced no reports (see the job log).");
  process.exit(0);
}
const runs = JSON.parse(readFileSync(manifest, "utf8")).filter((r) => r.isRepresentativeRun);
const pct = (v) => (v == null ? "–" : String(Math.round(v * 100)));
console.log("### Lighthouse (mobile emulation, local production build)\n");
console.log("| Page | Performance | Accessibility | Best practices | SEO |");
console.log("| --- | --- | --- | --- | --- |");
for (const { url, summary: s } of runs) {
  console.log(`| ${new URL(url).pathname} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s["best-practices"])} | ${pct(s.seo)} |`);
}
console.log("\nAccessibility below 90 fails the check; the others only warn.");
