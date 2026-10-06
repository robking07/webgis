// The 1200x630 link-preview card (issue #37): Mapwich name, a page title and a one-line summary.
// Colors come from the light theme tokens in @webgis/design; the font is Public Sans (bundled
// woff files in src/assets/fonts, SIL OFL), the same face as the site. Cards are static or computed from
// data shipped in the build, so nothing is fetched at share time.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEMES } from "@webgis/design";

export const OG_SIZE = { width: 1200, height: 630 };
const T = THEMES.light;

const font = (name: string) => readFile(join(process.cwd(), "src/assets/fonts", name));
const fonts = () =>
  Promise.all([
    font("public-sans-latin-400-normal.woff"),
    font("public-sans-latin-700-normal.woff"),
  ]).then(([r, b]) => [
    { name: "Public Sans", data: r, weight: 400 as const, style: "normal" as const },
    { name: "Public Sans", data: b, weight: 700 as const, style: "normal" as const },
  ]);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function ogCard({ kicker, title, summary }: { kicker: string; title: string; summary: string }) {
  const long = title.length > 48;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "Public Sans", background: T.ui.bg, color: T.ui.text, padding: "64px 72px", borderLeft: `24px solid ${T.ui.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 24 24">
            <path d="M3 10.6C3 6.9 7 4.4 12 4.4s9 2.5 9 6.2v.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill={T.ui.brandBread} />
            <path d="M12 14.3l8 2.3-8 2.3-8-2.3z" fill={T.ui.accent} opacity="0.45" />
            <path d="M12 12.6l8 2.3-8 2.3-8-2.3z" fill={T.ui.accent} />
            <rect x="3" y="19.6" width="18" height="3" rx="1.5" fill={T.ui.brandBread} />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>Mapwich</div>
          <div style={{ fontSize: 28, color: T.ui.textMuted, marginLeft: "auto" }}>{kicker}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: long ? 64 : 80, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>{clip(title, 90)}</div>
          <div style={{ display: "flex", fontSize: 34, lineHeight: 1.3, color: T.ui.textMuted }}>{clip(summary, 150)}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: T.ui.accent, fontWeight: 600 }}>mapwich.org</div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
