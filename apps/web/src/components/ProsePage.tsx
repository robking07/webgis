import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";

// Shared shell for plain-text pages (About, Methods): h1, then h2 sections of paragraphs, lists and tables.
export function ProsePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="[&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_table]:mt-3 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_td]:border-t [&_td]:py-1.5 [&_td]:pr-3 [&_th]:py-1.5 [&_th]:pr-3 [&_.tbl]:overflow-x-auto">
          {children}
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
