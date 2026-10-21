// Shared pieces of the Specials pages (D-115, direction A on the Mapwich Specials canvas).
import Link from "next/link";
import { DATASET_BY_ID, type Dataset } from "@/lib/registry";
import { INSIGHT_BY_ID, isRegional, strengthLabel, strengthOf, STRENGTH_WORD, type Insight, type Strength } from "@/lib/insights";
import { formatDate, type Special } from "@/lib/specials";

/** The full map for a piece: its datasets, at its position. Same URL format as lib/url-state.ts
 *  (a client module, so not callable here). */
export function mapHref(s: Pick<Special, "datasets"> & Partial<Pick<Special, "at">>) {
  const q = [`d=${s.datasets[0]}`, ...(s.datasets[1] ? [`b=${s.datasets[1]}`] : [])];
  if (s.at) q.push(`at=${s.at.lon.toFixed(4)},${s.at.lat.toFixed(4)},${s.at.zoom.toFixed(2)}`);
  return `/map?${q.join("&")}`;
}

/** "U.S. Census Bureau · 2020–2024": publisher and years, short. */
export function shortSource(ds: Dataset) {
  const who = ds.source.name.split(",")[0].replace(/\s*\(.*\)$/, "").replace(/,? \d{4} release$/, "");
  const when = ds.vintage?.replace(/\s*\(.*\)$/, "");
  return when ? `${who} · ${when}` : who;
}

/** Signal bars: 3 strong, 2 moderate, 1 modest. Decorative; the label carries the meaning. */
export function StrengthBars({ level }: { level: Strength }) {
  const fill = (n: number) => (level >= n ? "var(--ui-accent)" : "var(--ui-border)");
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden className="shrink-0">
      <rect x="0" y="8" width="4" height="6" rx="1" fill={fill(1)} />
      <rect x="7" y="4" width="4" height="10" rx="1" fill={fill(2)} />
      <rect x="14" y="0" width="4" height="14" rx="1" fill={fill(3)} />
    </svg>
  );
}

/** A folded map: the pattern is mostly between regions. */
export function RegionalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ui-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14" /><path d="M15 6v14" />
    </svg>
  );
}

export function PairingIcons({ insight }: { insight: Insight }) {
  const label = strengthLabel(insight);
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-center gap-2">
      <StrengthBars level={strengthOf(insight.rho)} />
      {isRegional(insight) && <RegionalIcon />}
    </span>
  );
}

/** One-line key for the icons. */
export function PairingsKey() {
  return (
    <p className="flex flex-col gap-1.5 text-[13px] text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      <span className="inline-flex items-center gap-2"><StrengthBars level={2} />How strongly the two line up</span>
      <span className="inline-flex items-center gap-2"><RegionalIcon />Mostly a regional pattern</span>
    </p>
  );
}

export function PairingsList({ pairs }: { pairs: Insight[] }) {
  return (
    <ul className="divide-y divide-[color-mix(in_srgb,var(--ui-border)_60%,transparent)] rounded-[10px] border bg-card">
      {pairs.map((p) => (
        <li key={p.id} className="flex flex-col gap-1 px-4 py-3.5 sm:grid sm:grid-cols-[minmax(0,1fr)_64px_170px] sm:items-center sm:gap-4 sm:px-[18px]">
          <Link href={`/specials/${p.id}`} className="text-[15px] font-medium leading-snug text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {p.headline}
          </Link>
          <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums sm:contents">
            <PairingIcons insight={p} />
            <span className="sm:text-right sm:text-[13px]">Across {p.n.toLocaleString()} counties</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const eyebrow = "text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground";

/** "Data in this piece": each dataset, its source and years; and the pairing it grew from. */
export function DataBox({ special, showOrigin }: { special: Special; showOrigin?: boolean }) {
  const origin = special.pairing ? INSIGHT_BY_ID.get(special.pairing) : null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border bg-card p-[18px]">
      <p className={eyebrow}>Data in this piece</p>
      {special.datasets.map((id) => {
        const ds = DATASET_BY_ID.get(id)!;
        return (
          <div key={id} className="flex flex-col gap-0.5">
            <Link href={`/data/${id}`} className="text-[15px] font-semibold text-foreground hover:underline">{ds.title}</Link>
            <span className="text-[13px] text-muted-foreground">{shortSource(ds)}</span>
          </div>
        );
      })}
      {showOrigin && origin && (
        <p className="mt-1.5 border-t pt-2.5 text-[13px] leading-normal text-muted-foreground">
          Started from the Combination “<Link href={mapHref({ datasets: [origin.x, origin.y] })} className="hover:text-foreground hover:underline">{origin.headline}</Link>.”
        </p>
      )}
    </div>
  );
}

/** "How they line up": the pairing's strength in words, for a two-dataset piece. */
export function LineUpBox({ insight }: { insight: Insight }) {
  const level = strengthOf(insight.rho);
  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border bg-card p-[18px]">
      <p className={eyebrow}>How they line up</p>
      <p className="flex items-center gap-2.5 text-[15px] font-semibold">
        <PairingIcons insight={insight} />
        {STRENGTH_WORD[level]} link, across {insight.n.toLocaleString()} counties
      </p>
      <p className="text-sm leading-normal text-foreground/85">
        {insight.headline}. {isRegional(insight) ? "Much of it is regional: within the same state the link is weaker." : "It holds within states too."}
      </p>
      <p className="text-[13px] leading-normal text-muted-foreground">
        Correlation is not causation: both may reflect something else, such as how urban a county is.
      </p>
      <Link href={mapHref({ datasets: [insight.x, insight.y] })} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
        See this pair on the map →
      </Link>
    </div>
  );
}

/** A dataset title mid-sentence: lower-cased, except month names (as in the caption template). */
export const midSentence = (t: string) =>
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(t) ? t : t[0].toLowerCase() + t.slice(1);

/** "Binge drinking × January lows". */
export const pairName = (s: Special) => s.datasets.map((id) => DATASET_BY_ID.get(id)!.title).join(" × ");

/** "By Robbie King", but an author line that already says how it was made ("Drafted by Claude for
 *  Robbie King", D-122) is shown as written. */
export const byline = (author: string) => (/^(drafted|written|reported|compiled|by)\b/i.test(author) ? author : `By ${author}`);

export function DraftTag() {
  return <span className="rounded-full border border-dashed px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Draft</span>;
}

/** An earlier Special: headline first, then data and date, then the thumbnail (if it has one). */
export function SpecialCard({ special }: { special: Special }) {
  return (
    <Link href={`/specials/${special.slug}`} className="group flex flex-col gap-2 border-t py-3.5 text-foreground first:border-t-0 md:border-t-0 md:py-0">
      <span className="text-lg font-bold leading-tight tracking-tight group-hover:underline md:text-xl">{special.title}</span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-[13px]">
        {pairName(special)} · {formatDate(special.date)} {special.draft && <DraftTag />}
      </span>
      {special.image && (
        // eslint-disable-next-line @next/next/no-img-element -- static export of a small thumbnail
        <img src={special.image} alt={`Map: ${pairName(special)}`} className="mt-1 aspect-video w-full rounded-[10px] border object-cover" />
      )}
    </Link>
  );
}
