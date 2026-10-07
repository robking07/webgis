import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import disclosures from "@/generated/disclosures.json";
import type { AgentRole, UsageRow, totals as totalsFn } from "@/lib/disclosures-load.mts";

// The JSON types an empty list as never[], so give it its real shape.
type DisclosuresData = { rows: UsageRow[]; totals: ReturnType<typeof totalsFn>; agents: AgentRole[] };

export const metadata: Metadata = {
  title: "Disclosures · Mapwich",
  description: "How Mapwich is built with AI: who does what, what a human checks, and what it costs in tokens.",
};

// Roadmap 1.6. DRAFT wording: Robbie edits it before it ships. The usage table and the agent roles
// come from docs/progress.md and .claude/agents/*.md at build time (scripts/prepare.mts).

const ROLE_TITLES: Record<string, string> = {
  lead: "Project lead",
  "review-lead": "Review lead",
  "ui-engineer": "UI engineer",
  "data-engineer": "Data engineer",
  "data-scout": "Data scout",
  editor: "Editor",
};
const ROLE_JOBS: Record<string, string> = {
  lead: "Turns Robbie's ideas into tasks, assigns them, checks the results and merges them.",
  "review-lead": "A skeptic with fresh context who reads a proposal and the live site before work starts and at each phase gate.",
  "ui-engineer": "Builds pages, menus and the map interface.",
  "data-engineer": "Adds and updates datasets, from the registry entry to the published files.",
  "data-scout": "Researches possible datasets and reports their sources and licenses. Never adds anything itself.",
  editor: "Drafts Specials from verified data. Drafts stay drafts, with an honest byline.",
};
const ROLE_ORDER = Object.keys(ROLE_TITLES);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1e3)}k`);

export default function DisclosuresPage() {
  const { rows, totals, agents } = disclosures as DisclosuresData;
  const roles = [...agents].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name));
  const h2 = "text-xl font-semibold tracking-tight";
  const th = "px-3 py-2 text-left font-semibold whitespace-nowrap";
  const td = "px-3 py-2 align-top";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <header className="mb-8 max-w-2xl">
          <p className="mb-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft wording</p>
          <h1 className="text-2xl font-semibold tracking-tight">Disclosures</h1>
          <p className="mt-2 text-muted-foreground">
            Mapwich is built with the help of AI. This page says plainly how: what the AI does, what people check, and what it costs.
          </p>
        </header>

        <section aria-labelledby="purpose" className="mb-10 max-w-2xl space-y-2">
          <h2 id="purpose" className={h2}>Purpose</h2>
          <p>
            Mapwich is a non-commercial, educational map of U.S. public data. The map comes first. It is made for planners first and
            for the public second, and it aims to be clean, sourced and honest about what the numbers can and cannot say.
          </p>
        </section>

        <section aria-labelledby="how" className="mb-10 space-y-3">
          <h2 id="how" className={h2}>How AI builds it</h2>
          <p className="max-w-2xl">
            Work is split among AI roles. Each one has a narrow job and runs on a set model and effort level, read from the project&apos;s agent
            files when this page is built. A task can override its role&apos;s default; the usage log below shows what each task actually used.
          </p>
          {roles.length === 0 ? <p className="text-sm text-muted-foreground">Role list unavailable in this build</p> : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-muted"><tr><th className={th}>Role</th><th className={th}>What it does</th><th className={th}>Model</th><th className={th}>Effort</th></tr></thead>
              <tbody className="divide-y">
                {roles.map((a) => (
                  <tr key={a.name}>
                    <td className={`${td} font-medium whitespace-nowrap`}>{ROLE_TITLES[a.name] ?? a.name}</td>
                    <td className={td}>{ROLE_JOBS[a.name] ?? a.description}</td>
                    <td className={td}>{cap(a.model)}</td>
                    <td className={td}>{cap(a.effort || "default")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>

        <section aria-labelledby="review" className="mb-10 max-w-2xl space-y-2">
          <h2 id="review" className={h2}>Human review</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Robbie decides what users see: the product, scope, editorial voice and data judgment. AI drafts of Specials stay drafts until he approves them.</li>
            <li>The project lead verifies each task and merges it through a script that refuses to merge while checks are failing.</li>
            <li>
              Every change runs automatic checks: the build, lint, click-through tests of the menus and map, a secret scan,
              and speed and accessibility checks.
            </li>
            <li>A review lead with fresh context checks every phase gate before the next phase starts.</li>
          </ul>
        </section>

        <section aria-labelledby="usage" className="mb-6 space-y-3">
          <h2 id="usage" className={h2}>Usage log</h2>
          <p className="max-w-2xl">
            Every finished task, with the size and token budget it was given and the tokens it actually used. Ratio is actual divided by budget.
            Read from the project&apos;s progress log when this page is built.
          </p>
          <p className="text-sm">
            <strong>{tokens(totals.tokens)} tokens</strong> across {totals.counted} of {totals.rows} tasks.{" "}
            {totals.noNumber > 0
              ? `${totals.noNumber} ${totals.noNumber === 1 ? "task has" : "tasks have"} no recorded number and ${totals.noNumber === 1 ? "is" : "are"} not counted.`
              : "Every task has a number."}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className={th}>Task</th><th className={th}>Size / budget</th><th className={th}>Actual tokens</th>
                  <th className={th}>Ratio</th><th className={th}>Model / effort</th><th className={th}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={`${r.pr}-${i}`}>
                    <td className={td}>{r.task} <span className="text-muted-foreground">{r.pr}</span></td>
                    <td className={`${td} whitespace-nowrap`}>{r.sizeBudget}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.actualText}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.ratio}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.model}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
