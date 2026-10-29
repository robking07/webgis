// Similar counties on a county's profile (#291): the five counties that rank closest across every
// county measure, worked out at ingest (`ingest similar`, D-499) and rendered on the server,
// so the browser fetches nothing extra. Each links to Compare, opened on a measure they share.
import { compareHref, shortName } from "@/lib/compare";
import { placeName } from "@/lib/place-name";
import { isRaceRow } from "@/lib/place";
import { DATASET_BY_ID } from "@/lib/registry";
import { fetchRetry, staticUrl } from "@/lib/static-files";

type Match = [string, number, number[], number[]];
// "residents" isn't a registry dataset (the population map's counts, under People).
// Race and ethnicity measures stay in the match but are never named high or low (#414).
// shortcut: filtered here, not at ingest, so a race measure can still take its topic's one slot; move into findSimilar if that matters.
const named = (idx: number[], measures: string[]) => idx.filter((i) => !isRaceRow(DATASET_BY_ID.get(measures[i])));
const titles = (idx: number[], measures: string[]) => idx.map((i) => DATASET_BY_ID.get(measures[i])?.title ?? "Residents").join(", ");

// Published on R2 by the Data run (`publish-similar`, #401). Any failure just leaves the section out.
async function load(): Promise<{ measures: string[]; counties: Record<string, Match[]> } | null> {
  try {
    const r = await fetchRetry(staticUrl("similar/similar.json"), { next: { revalidate: 86400 } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export async function SimilarPlaces({ geoid }: { geoid: string }) {
  const data = await load();
  if (!data) return null;
  const { measures, counties } = data;
  const matches = (counties[geoid] ?? []).filter(([b]) => placeName(b));
  const name = placeName(geoid);
  if (!matches.length || !name) return null;
  return (
    <section aria-labelledby="similar-places" className="mb-6" data-similar-places="">
      <h2 id="similar-places" className="text-base font-semibold">Similar counties</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The counties that rank closest to {shortName(name)} across {measures.length} measures, from income, housing and health to climate, commuting, and race and ethnicity, each topic counted equally.
        “Both high” or “both low” means both counties are in the top or bottom quarter of U.S. counties.
      </p>
      {/* Robbie approved this sentence verbatim, 2026-10-29 (D-499). */}
      <p className="mt-1 text-xs text-muted-foreground">
        Many of these measures, including income, housing costs, health and density, track closely with race and ethnicity in the U.S., because of a long history of where people were allowed to live, work and buy homes. So counties that match on one often match on the others.
      </p>
      <ul className="mt-2 space-y-2">
        {matches.map(([b, , h, l]) => { const high = named(h, measures), low = named(l, measures); return (
          <li key={b} className="text-sm">
            <a href={compareHref({ a: geoid, b, d: measures[high[0] ?? low[0]] ?? null })}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
              {placeName(b)}
            </a>
            <span className="block text-xs text-muted-foreground">
              {[high.length && `Both high: ${titles(high, measures)}.`, low.length && `Both low: ${titles(low, measures)}.`].filter(Boolean).join(" ")}
            </span>
          </li>
        ); })}
      </ul>
    </section>
  );
}
