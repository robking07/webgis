import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";
import { SplashQuestions } from "@/components/SplashQuestions";
import splash from "@/generated/splash.json";

// The splash page (D-193): the logo on black. The only indexable page. Title and share card come from
// the root layout. Issue #224: under the logo, questions type out, each a link into the map. Until
// content/splash/questions.yaml is approved, production keeps "which map?" (its builds carry no
// questions) and previews show the questions at /?splash=preview.
export const metadata: Metadata = { robots: { index: true, follow: false } };

const tagline = <p className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ color: "var(--ui-splash-tagline)" }}>which map?</p>;

export default function Splash() {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden" style={{ background: "var(--ui-splash-bg)" }}>
      <h1 className="sr-only">Mapwich</h1>
      <div className="flex w-full flex-col items-center gap-6 px-4 sm:px-6">
        <LogoMark size={120} title="Mapwich" ink="var(--ui-splash-ink)" />
        {splash.questions.length ? <SplashQuestions questions={splash.questions} approved={splash.approved} fallback={tagline} /> : tagline}
      </div>
    </main>
  );
}
