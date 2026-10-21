import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { rampColors, RAMPS, UNIT_LABEL, type RampId, type Unit } from "@webgis/design";
import { TERM_BY_ID } from "@/lib/glossary";
import { describeMethod } from "@webgis/registry/describe";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { DATASETS, DATASET_BY_ID } from "@/lib/registry";
import { sourceOf, datasetHref } from "@/lib/sources";
import { approvedInsights } from "@/lib/approvals";
import { shareMeta } from "@/lib/share-meta";
import { CsvDownload } from "@/components/CsvDownload";
import { CSV_LEVELS } from "@/lib/csv";
import layersManifest from "@/generated/layers.json";

export function generateStaticParams() {
  return DATASETS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/data/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = DATASET_BY_ID.get(id);
  return d
    ? { title: `${d.title} · Data · Mapwich`, description: d.description, ...shareMeta({ title: `${d.title} · Mapwich`, description: d.description, path: `/data/${d.id}`, image: `/og/data/${d.id}` }) }
    : { title: "Data · Mapwich" };
}

const LEVEL_LABEL: Record<string, string> = { state: "States", county: "Counties", tract: "Census tracts", block_group: "Block groups" };
const CLASSIFY_LABEL: Record<string, string> = { quantile: "Quantile", equalInterval: "Equal interval", jenks: "Natural breaks (Jenks)", manual: "Fixed breaks" };

export default async function DatasetProfilePage({ params }: PageProps<"/data/[id]">) {
  const { id } = await params;
  const d = DATASET_BY_ID.get(id);
  if (!d) notFound();
  const source = sourceOf(d);
  const ramp = RAMPS[d.symbology.ramp as RampId];
  const n = Math.min(Math.max(d.symbology.classes, ramp.minClasses), ramp.maxClasses);
  const colors = rampColors(d.symbology.ramp as RampId, n);
  const insights = (await approvedInsights()).filter((i) => i.x === d.id || i.y === d.id);
  const siblings = source.datasets.filter((s) => s.id !== d.id);
  const featureCount = (layersManifest as Record<string, { featureCount?: number }>)[d.id]?.featureCount;
  const modelInputs = d.modelInputs.map((m) => DATASET_BY_ID.get(m)).filter((x) => !!x);

  const csvLevels = d.measure.kind === "features" ? [] : CSV_LEVELS.filter((l) => d.geographyLevels.includes(l));

  const facts: Array<[string, React.ReactNode]> = [
    ["Source", <a key="s" href={d.source.url} rel="noopener" className="text-primary underline-offset-2 hover:underline">{d.source.name} ↗</a>],
    ["Vintage", d.vintage],
    ["Geography", d.measure.kind === "features" ? `Road segments${featureCount ? ` (${featureCount.toLocaleString()})` : ""}` : d.geographyLevels.map((l) => LEVEL_LABEL[l]).join(", ")],
    ["Measures", d.universe],
    ["Unit", UNIT_LABEL[d.unit as Unit] ?? d.unit],
    ["Updated", d.updateCadence],
    ["License", d.license],
    ["Cite as", d.source.citation],
    ["Use here", "Shown for non-commercial, educational purposes, with attribution to the source."],
  ];

  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <p className="text-sm"><Link href="/data" className="text-primary underline-offset-2 hover:underline">← All data</Link></p>
      <header className="mb-6 mt-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.category} › {d.subcategory} · {source.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d.title}</h1>
        <p className="mt-2 text-muted-foreground">{d.description}</p>
        <a href={`/map?d=${d.id}`} className="mt-4 inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Map it
        </a>
      </header>

      <section aria-labelledby="facts" className="mb-8">
        <h2 id="facts" className="sr-only">About this dataset</h2>
        <dl className="divide-y rounded-xl border bg-card text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {csvLevels.length > 0 && <CsvDownload dataset={d} levels={csvLevels} />}

      <section aria-labelledby="method" className="mb-8">
        <h2 id="method" className="mb-2 text-base font-semibold">How it’s computed</h2>
        <p className="text-sm leading-relaxed">
          {/* The method text is shared with the Markdown doc: render its `code` spans. */}
          {describeMethod(d).split("`").map((part, i) => (i % 2 ? <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{part}</code> : part))}
        </p>
      </section>

      {d.terms.length > 0 && (
        <section aria-labelledby="explainers" className="mb-8">
          <h2 id="explainers" className="mb-2 text-base font-semibold">Explainers</h2>
          <dl className="space-y-3 text-sm">
            {d.terms.map((id) => TERM_BY_ID.get(id)).filter((t) => !!t).map((t) => (
              <div key={t!.id} id={`term-${t!.id}`}>
                <dt className="font-semibold">{t!.term}</dt>
                <dd className="m-0 mt-0.5 leading-relaxed text-muted-foreground">
                  {t!.long}{t!.source && <> <a href={t!.source} rel="noopener" className="text-primary underline-offset-2 hover:underline">Learn more ↗</a></>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {d.facets.length > 0 && (
        <section aria-labelledby="facets" className="mb-8">
          <h2 id="facets" className="mb-2 text-base font-semibold">Filters on the map</h2>
          {d.facets.map((f) => (
            <div key={f.field} className="mb-4">
              <h3 className="text-sm font-semibold">{f.label}</h3>
              <p className="mb-1.5 text-sm text-muted-foreground">{f.explainer}</p>
              <ul className="divide-y rounded-xl border bg-card text-sm">
                {f.values.map((v) => (
                  <li key={String(v.value)} className="grid gap-0.5 px-4 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
                    <span className="font-medium">{v.label}</span><span className="text-muted-foreground">{v.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {(d.coverageNote || modelInputs.length > 0) && (
        <section aria-labelledby="caveats" className="mb-8">
          <h2 id="caveats" className="mb-2 text-base font-semibold">Caveats</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {d.coverageNote && <li>{d.coverageNote}</li>}
            {modelInputs.length > 0 && (
              <li>
                Built using {modelInputs.map((m, i) => <span key={m!.id}>{i > 0 && ", "}<a href={datasetHref(m!.id)} className="text-primary underline-offset-2 hover:underline">{m!.title.toLowerCase()}</a></span>)}, so Combinations never pairs it with {modelInputs.length > 1 ? "those" : "that"}: they’d line up partly by design.
              </li>
            )}
          </ul>
        </section>
      )}

      <section aria-labelledby="symbology" className="mb-8">
        <h2 id="symbology" className="mb-2 text-base font-semibold">How it’s drawn</h2>
        <div className="flex items-center gap-3">
          <span className="flex overflow-hidden rounded" aria-hidden>{colors.map((c) => <span key={c} className="h-4 w-8" style={{ background: c }} />)}</span>
          <span className="text-sm text-muted-foreground">
            {ramp.label} · {CLASSIFY_LABEL[d.symbology.classification]}, {n} classes
            {d.symbology.breaks ? ` (${d.symbology.breaks.map((b) => b.toLocaleString()).join(" / ")})` : ""}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Colors pass the site’s color-blind and contrast checks. See the <a href="/design-system" className="underline">design system</a>.</p>
      </section>

      {insights.length > 0 && (
        <section aria-labelledby="insights" className="mb-8">
          <h2 id="insights" className="mb-2 text-base font-semibold">In Combinations</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {insights.map((i) => {
              const other = DATASET_BY_ID.get(i.x === d.id ? i.y : i.x)!;
              return (
                <li key={i.id}>
                  <a href={`/specials/${i.id}`} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted">
                    <span>× {other.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">ρ = {i.rho.toFixed(2)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {siblings.length > 0 && (
        <section aria-labelledby="more" className="mb-8">
          <h2 id="more" className="mb-2 text-base font-semibold">More from {source.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.id}><a href={datasetHref(s.id)} className="inline-block rounded-full border px-3 py-1 text-xs hover:bg-muted">{s.title}</a></li>
            ))}
          </ul>
        </section>
      )}
      <SiteFooter />
    </main>
    </>
  );
}
