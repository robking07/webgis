import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const metadata: Metadata = { title: "Support Mapwich · Mapwich" };

// Copy is Robbie's, verbatim from drafts/site-copy/support.md. A plain link: no widget or third-party script.
export default function SupportPage() {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Support Mapwich</h1>
        <p>Mapwich is free to use, has no ads, and is not a business. It&apos;s a non-commercial, educational project built by one map guy with a lot of help from AI.</p>
        <p>Keeping it running costs a little each month: hosting the site, and storing and serving the map files behind every view. If Mapwich has helped you answer a question, you can chip in for those costs.</p>
        <p>
          <a href="https://buymeacoffee.com/mapwich" target="_blank" rel="noopener" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>Buy me a coffee</a>
        </p>
        <p>Every donation goes to running costs. The site stays free, ad-free and non-commercial either way.</p>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
