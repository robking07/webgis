import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";

// The splash page (D-193): the logo on black and a tagline, nothing else. The only indexable page.
// Title and share card come from the root layout.
export const metadata: Metadata = { robots: { index: true, follow: false } };

export default function Splash() {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden" style={{ background: "var(--ui-splash-bg)" }}>
      <div className="flex flex-col items-center gap-6 px-6">
        <LogoMark size={120} title="Mapwich" ink="var(--ui-splash-ink)" />
        <p className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ color: "var(--ui-splash-tagline)" }}>which map?</p>
      </div>
    </main>
  );
}
