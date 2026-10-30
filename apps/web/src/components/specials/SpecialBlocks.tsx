// Inline elements in a Special's text (D-122): focus maps, a bar chart by groups, and tables.
// Numbers are computed at build time (lib/special-blocks.mts, run by scripts/prepare.mts). Charts are real tables with bars
// drawn in, so screen readers and phones get the same numbers; colors are theme tokens only.
import Link from "next/link";
import { formatValue } from "@webgis/design";
import { rhoText } from "@/lib/insights";
import type { BinsChart, Block, CorrelationTable, CountyTable, FocusMap, Ref } from "@/lib/special-blocks.mts";
import { SpecialMap } from "./SpecialMap";
import { mapHref } from "./parts";

/** Percentages to one decimal (chart values differ by fractions of a point); other units as on the map. */
const fmt = (v: number, unit: Ref["unit"]) => (unit === "percent" ? `${v.toFixed(1)}%` : formatValue(v, unit));
const refLabel = (r: Ref) => (r.period ? `${r.title} (${r.period})` : r.title);

const frame = "flex flex-col gap-3 rounded-xl border bg-card p-3.5 md:p-5";
const titleCls = "text-[15px] font-bold leading-snug text-foreground md:text-base";
const captionCls = "text-[13px] leading-normal text-muted-foreground [&_a]:underline";
const th = "px-1.5 py-1.5 text-left align-bottom text-xs font-semibold text-muted-foreground first:pl-0 last:pr-0 md:px-2";
const td = "px-1.5 py-1.5 align-middle tabular-nums first:pl-0 last:pr-0 md:px-2";

function Caption({ html }: { html: string | null }) {
  return html ? <p className={captionCls} dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

function FocusMapBlock({ b }: { b: FocusMap }) {
  return (
    <figure className="flex flex-col gap-2">
      <SpecialMap datasets={b.datasets} at={b.at} level={b.level} legendBelow designWidth={700} className="aspect-[4/3] md:aspect-[3/2]">
        <Link href={mapHref({ datasets: b.datasets, at: b.at })}
          className="wg-block-link absolute top-3 right-3 z-10 inline-flex min-h-9 items-center rounded-lg border bg-card/95 px-3 text-[13px] font-semibold text-foreground shadow-sm hover:bg-muted">
          Open in the full map
        </Link>
      </SpecialMap>
      <figcaption dangerouslySetInnerHTML={{ __html: b.caption }} />
    </figure>
  );
}

function BinsBlock({ b }: { b: BinsChart }) {
  const max = Math.max(...b.rows.map((r) => r.value));
  const groupWord = b.rows.length === 10 ? "Tenth" : b.rows.length === 5 ? "Fifth" : "Group";
  const stat = b.stat === "mean" ? "Average" : "Median";
  return (
    <div role="figure" aria-label={b.title} className={frame}>
      <p className={titleCls}>{b.title}</p>
      <table className="w-full border-collapse text-[13px] md:text-sm">
        <caption className="sr-only">
          {b.title}. {b.n.toLocaleString()} counties split into {b.rows.length} equal groups by {refLabel(b.x).toLowerCase()}; {stat.toLowerCase()} {refLabel(b.y).toLowerCase()} in each.
        </caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className={th}>{groupWord} of counties by {b.x.title.toLowerCase()}</th>
            <th scope="col" className={`${th} w-[55%]`}>{stat} {b.y.title.toLowerCase()}</th>
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr key={i}>
              <th scope="row" className={`${td} text-left whitespace-nowrap font-normal text-foreground/85`}>
                <span className="sr-only">{i === 0 ? "Lowest" : i === b.rows.length - 1 ? "Highest" : `Group ${i + 1}`}: </span>
                {fmt(r.lo, b.x.unit)}–{fmt(r.hi, b.x.unit)}
              </th>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-3.5 rounded-sm bg-[var(--ui-accent)]" style={{ width: `${(r.value / max) * 78}%` }} />
                  <span className="font-semibold text-foreground">{fmt(r.value, b.y.unit)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={captionCls}>
        Each row is {b.rows.length === 10 ? "a tenth" : b.rows.length === 5 ? "a fifth" : "one group"} of the {b.n.toLocaleString()} counties with both values (about {Math.round(b.n / b.rows.length)} counties), from the lowest {b.x.title.toLowerCase()} to the highest. Bars start at zero.
      </p>
      <Caption html={b.caption} />
    </div>
  );
}

function CorrelationsBlock({ b }: { b: CorrelationTable }) {
  return (
    <div role="figure" aria-label={b.title} className={frame}>
      <p className={titleCls}>{b.title}</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={b.title}>
        <table className="w-full border-collapse text-[13px] md:text-sm">
          <caption className="sr-only">{b.title}. Spearman rank correlation across counties; −1 to 1, 0 means no link.</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className={th}>Across counties…</th>
              {b.with.map((c) => <th key={c.id + c.stop} scope="col" className={`${th} text-right`}>vs. {refLabel(c).toLowerCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r.ref.id + r.ref.stop} className="border-b border-[color-mix(in_srgb,var(--ui-border)_50%,transparent)] last:border-0">
                <th scope="row" className={`${td} text-left font-normal text-foreground`}>{refLabel(r.ref)}</th>
                {r.cells.map((c, i) => (
                  <td key={i} className={`${td} text-right ${c ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {c ? rhoText(c.rho) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={captionCls}>
        Spearman rank correlation (ρ) across counties with both values: 1 means the two always rise together, −1 that one always falls as the other rises, 0 no link.
      </p>
      <Caption html={b.caption} />
    </div>
  );
}

function CountiesBlock({ b }: { b: CountyTable }) {
  // All in one state: say it once in the header and keep the names short, so four columns fit a phone.
  const states = new Set(b.rows.map((r) => r.name.match(/, ([A-Z]{2})$/)?.[1]));
  const one = states.size === 1 ? [...states][0] ?? null : null;
  const short = (n: string) => (one ? n.replace(/, [A-Z]{2}$/, "").replace(/ County$/, "") : n);
  return (
    <div role="figure" aria-label={b.title} className={frame}>
      <p className={titleCls}>{b.title}</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={b.title}>
        <table className="w-full border-collapse text-xs sm:text-[13px] md:text-sm">
          <caption className="sr-only">{b.title}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className={th}>{one ? `County (${one})` : "County"}</th>
              {b.columns.map((c) => <th key={c.id + c.stop} scope="col" className={`${th} text-right`}>{refLabel(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r.geoid} className="border-b border-[color-mix(in_srgb,var(--ui-border)_50%,transparent)] last:border-0">
                <th scope="row" className={`${td} text-left font-normal`}>
                  <Link href={`/place/${r.geoid}`} className="wg-block-link" aria-label={r.name}>{short(r.name)}</Link>
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={`${td} text-right text-foreground`}>{v == null ? "No data" : fmt(v, b.columns[i].unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption html={b.caption} />
    </div>
  );
}

export function SpecialBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "map": return <FocusMapBlock b={block} />;
    case "bins": return <BinsBlock b={block} />;
    case "correlations": return <CorrelationsBlock b={block} />;
    case "counties": return <CountiesBlock b={block} />;
  }
}
