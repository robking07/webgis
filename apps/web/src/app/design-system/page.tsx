import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { renderMarkdown } from "@/lib/specials";

export const metadata: Metadata = { title: "Design system · Mapwich" };

// Renders docs/design-system.md (generated from packages/design) at build time, so the page never drifts
// from the tokens. Its relative SVG images are inlined as data URIs.
// shortcut: reads ../../docs from the repo checkout (build runs there); move to prepare.mts if the app is ever built alone.
const docs = join(process.cwd(), "../../docs");
const html = renderMarkdown(readFileSync(join(docs, "design-system.md"), "utf8")).replace(
  /src="(design-system\/[^"]+\.svg)"/g,
  (_, f) => `src="data:image/svg+xml;base64,${readFileSync(join(docs, f)).toString("base64")}"`,
);

export default function DesignSystemPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <div
          className="wg-prose [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm [&_th]:text-left [&_th]:pr-4 [&_td]:pr-4 [&_td]:py-1 [&_img]:max-w-full [&_code]:text-[0.9em] [&_code]:break-words [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:text-muted-foreground [&_h1]:text-3xl [&_h1]:font-bold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
