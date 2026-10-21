// Light and dark themes. UI chrome and the basemap both read from these tokens;
// `scripts/check.ts` enforces the contrast pairs listed in `CONTRAST_RULES`.

export type ThemeName = "light" | "dark";

export interface Theme {
  name: ThemeName;
  ui: {
    bg: string;
    surface: string;
    surfaceRaised: string;
    border: string;
    /** Edge of a control drawn over the map on phones (issue #34): strong enough to pick the
     *  control out of any map, where the quiet `border` disappears into the basemap. */
    controlEdge: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
    /** The "Comparing two maps" strip on the dataset card and the Exit button in full-screen (issue #198):
     *  a pale accent wash, so compare reads as a mode you are in. */
    compareTint: string;
    focus: string;
    danger: string;
    /** Bread in the Mapwich logo (the map layer between the slices is `accent`). */
    brandBread: string;
    /** Splash page at mapwich.org (D-193): always black with light ink, in both themes (Robbie's call). */
    splashBg: string;
    splashInk: string;
    splashTagline: string;
  };
  map: {
    /** Land outside the U.S. (drawn as the style background): pale land in light, a soft gray in
     *  dark, neutral so it reads as a map but the colored U.S. data stands out (issue #201). */
    background: string;
    land: string;
    /** Oceans, lakes and rivers everywhere: soft aqua in light, a muted blue-gray in dark. Kept ΔE ≥ 10
     *  from every sequential class (check:design), which rules out a plain blue next to the Blues ramp. */
    water: string;
    waterLine: string;
    park: string;
    road: string;
    roadMajor: string;
    boundary: string;
    boundaryMajor: string;
    label: string;
    labelMuted: string;
    /** Labels outside the U.S.: deliberately quiet (D-37). */
    labelForeign: string;
    labelHalo: string;
    /** Outline drawn around every choropleth polygon. */
    featureOutline: string;
    /** Casing under data lines (e.g. AADT), so even the class nearest the land color stays visible. */
    featureLineCasing: string;
    /** Outline for the hovered / selected feature. */
    highlight: string;
    /** Halo under the highlight outline, so the selection reads on any fill, light or dark. */
    highlightHalo: string;
    /** Fill for features with no value. */
    noData: string;
    /** No-data fill on change maps: darker in light themes, so the near-white "no clear change"
     *  middle of the diverging ramp never reads as missing (design check). */
    noDataChange: string;
    /** Reference overlays drawn above thematic fills (cased so they read over any fill). */
    interstate: string;
    interstateCasing: string;
    river: string;
    riverCasing: string;
    /** Route number on a highway shield. */
    shieldText: string;
    /** Fill of the Interstate and U.S. route shields in the OpenFreeMap sprite (white in both themes).
     *  Fixed by the sprite, not by the style; listed so the check can test the number on it. */
    shieldFill: string;
    /** U.S. land: lighter than other countries in light mode, darker in dark mode, so the lower 48 reads at a glance. */
    focusLand: string;
    /** Drill-down (issue #203): the wash over everything outside the focused place, at FOCUS_DIM.opacity. */
    focusDim: string;
    /** Shoreline drawn around water bodies. */
    coastline: string;
    /** National boundary (and its halo). */
    countryLine: string;
    countryHalo: string;
    /** State lines on the basemap (under data). */
    stateLine: string;
    /** Reliability hatching (D-222): paired dark and light stripes, so the hatch reads over the
     *  palest and darkest class alike. Drawn at HATCH.opacity over the fill, which still shows. */
    hatchDark: string;
    hatchLight: string;
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    ui: {
      bg: "#f6f5f2",
      surface: "#ffffff",
      surfaceRaised: "#ffffff",
      border: "#d9d6cf",
      controlEdge: "#858179",
      text: "#1b1c1e",
      textMuted: "#5b5d63",
      accent: "#1f5fa8",
      accentText: "#ffffff",
      compareTint: "#e2ecf7",
      focus: "#1f5fa8",
      danger: "#b3261e",
      brandBread: "#a8652a",
      splashBg: "#000000",
      splashInk: "#ececee",
      splashTagline: "#a3a6ad",
    },
    map: {
      background: "#e5e2d6",
      land: "#e5e2d6",
      water: "#c0e7e8",
      waterLine: "#a6d6d8",
      park: "#e4e8dc",
      road: "#ffffff",
      roadMajor: "#e6dfd2",
      boundary: "#a39f97",
      boundaryMajor: "#77736c",
      label: "#2e2f33",
      labelMuted: "#5f6168",
      labelForeign: "#8b8d93",
      labelHalo: "#ffffff",
      featureOutline: "#ffffff",
      featureLineCasing: "#8b8780",
      highlight: "#111111",
      highlightHalo: "#ffffff",
      noData: "#d9d6cf",
      noDataChange: "#aeaaa1",
      interstate: "#4a4d55",
      interstateCasing: "#ffffff",
      river: "#5b8fbf",
      riverCasing: "#eef4f9",
      shieldText: "#1b1c1e",
      shieldFill: "#ffffff",
      focusLand: "#f6f4ef",
      focusDim: "#f6f4ef",
      coastline: "#7f9fba",
      countryLine: "#5d6169",
      countryHalo: "#ffffff",
      stateLine: "#b3aea5",
      hatchDark: "#1b1c1f",
      hatchLight: "#ffffff",
    },
  },
  dark: {
    name: "dark",
    ui: {
      bg: "#121316",
      surface: "#1b1d21",
      surfaceRaised: "#24272c",
      border: "#353941",
      controlEdge: "#767a83",
      text: "#ececee",
      textMuted: "#a3a6ad",
      accent: "#7fb2ec",
      accentText: "#0d1b2a",
      compareTint: "#1d3048",
      focus: "#7fb2ec",
      danger: "#f2b8b5",
      brandBread: "#e0a25c",
      splashBg: "#000000",
      splashInk: "#ececee",
      splashTagline: "#a3a6ad",
    },
    map: {
      background: "#3a3e45",
      land: "#3a3e45",
      water: "#182b38",
      waterLine: "#274456",
      park: "#39443d",
      road: "#42464e",
      roadMajor: "#4c5058",
      boundary: "#4a4e56",
      boundaryMajor: "#6b707a",
      label: "#d4d6da",
      labelMuted: "#9a9ea6",
      labelForeign: "#73777f",
      labelHalo: "#16181b",
      featureOutline: "#16181b",
      featureLineCasing: "#6f737b",
      highlight: "#ffffff",
      highlightHalo: "#111111",
      noData: "#3a3d43",
      noDataChange: "#3a3d43",
      interstate: "#c9ccd2",
      interstateCasing: "#16181b",
      river: "#6fa8dc",
      riverCasing: "#0f1a24",
      shieldText: "#1b1c1e",
      shieldFill: "#ffffff",
      focusLand: "#22252b",
      focusDim: "#141619",
      coastline: "#3d6a8e",
      countryLine: "#8b919c",
      countryHalo: "#182b38",
      stateLine: "#41454d",
      hatchDark: "#0b0c0e",
      hatchLight: "#f2f3f5",
    },
  },
};

/** [foreground, background, minimum WCAG ratio, purpose] — checked for both themes. */
export const CONTRAST_RULES: Array<[keyof Theme["ui"] | `map.${keyof Theme["map"]}`, keyof Theme["ui"] | `map.${keyof Theme["map"]}`, number, string]> = [
  ["text", "bg", 7, "body text"],
  ["text", "surface", 7, "panel text"],
  ["textMuted", "surface", 4.5, "secondary text"],
  ["textMuted", "bg", 4.5, "secondary text on page"],
  ["accent", "surface", 4.5, "links and accent text"],
  ["accentText", "accent", 4.5, "text on accent buttons"],
  ["focus", "surface", 3, "focus ring (non-text)"],
  ["splashInk", "splashBg", 7, "splash logo on black"],
  ["splashTagline", "splashBg", 4.5, "splash tagline on black"],
  ["brandBread", "bg", 3, "logo bread on the page (non-text)"],
  ["brandBread", "surface", 3, "logo bread on panels (non-text)"],
  ["accent", "bg", 3, "logo map layer on the page (non-text)"],
  ["border", "surface", 1.3, "panel borders (decorative)"],
  // On-map controls on phones (Robbie, 2026-10-03, issue #34: "get serious about making this
  // easier to see on mobile"). Every control and label over the map sits on a solid surface panel
  // (.wg-panel); these are the pairs that panel has to carry (WCAG AA). See also GLASS below.
  ["text", "surface", 4.5, "on-map text on its panel: dataset title, Map options button, level note, legend strip"],
  ["textMuted", "surface", 4.5, "on-map secondary text on its panel: category, 'closer in' hint"],
  ["text", "surface", 3, "on-map icons on their panel: menu, Back, zoom, carets (non-text)"],
  ["accentText", "accent", 4.5, "filter count badge"],
  ["text", "compareTint", 7, "compare strip text (issue #198)"],
  ["accent", "compareTint", 4.5, "compare strip buttons' accent text (issue #198)"],
  ["controlEdge", "surface", 3, "on-map control edge vs its own panel (non-text, phones)"],
  ["controlEdge", "map.focusLand", 3, "on-map control edge vs U.S. land (non-text, phones)"],
  ["controlEdge", "map.land", 2, "on-map control edge vs land outside the U.S. (non-text, phones)"],
  ["map.label", "map.labelHalo", 7, "map labels"],
  ["map.labelMuted", "map.labelHalo", 4.5, "minor map labels"],
  ["map.labelForeign", "map.labelHalo", 3, "labels outside the U.S. (muted on purpose, still legible)"],
  ["map.highlight", "map.land", 3, "selection outline (non-text)"],
  ["map.highlight", "map.highlightHalo", 7, "selection outline vs its halo (reads over the darkest and lightest classes)"],
  ["map.featureLineCasing", "map.focusLand", 3, "data-line casing vs U.S. land (non-text; keeps the quietest class visible)"],
  ["map.interstate", "map.interstateCasing", 4.5, "interstate line vs its casing (non-text, reads over any fill)"],
  ["map.river", "map.riverCasing", 3, "river line vs its casing (non-text)"],
  ["map.shieldText", "map.shieldFill", 4.5, "route number on its highway shield"],
  ["map.countryLine", "map.focusLand", 3, "national boundary vs U.S. land (non-text)"],
  ["map.countryLine", "map.land", 3, "national boundary vs land outside the U.S. (non-text)"],
  ["map.coastline", "map.land", 1.5, "shoreline vs land outside the U.S. (decorative)"],
  ["map.coastline", "map.water", 1.5, "shoreline vs water (decorative)"],
];

/** Reliability hatching (D-222): diagonal stripes over areas whose estimate is unreliable.
 *  `spacing` is the repeat in CSS px (one dark and one light stripe per repeat), `width` each
 *  stripe's width, `opacity` how strongly the stripes cover the fill underneath. */
export const HATCH = {
  spacing: 7,
  width: 1.25,
  opacity: { light: 0.6, dark: 0.6 } as Record<ThemeName, number>,
  /** The hatch must stand out (WCAG ratio, composited) from every class of every sequential ramp. */
  minContrast: 1.5,
} as const;

/** Drill-down (issue #203): how strongly `map.focusDim` covers the places outside the focused one.
 *  `scripts/check.ts` requires each ramp to change visibly under it on average (the focused place
 *  stands out) while the dimmed ramp's ends stay apart (the rest stays readable). */
export const FOCUS_DIM = {
  opacity: { light: 0.6, dark: 0.6 } as Record<ThemeName, number>,
  /** Mean ΔE2000 between each class of a ramp and the same class dimmed. */
  minMeanShift: 15,
  /** ΔE2000 between the lightest and darkest class, both dimmed. */
  minSpread: 10,
} as const;

/** Opacity of the frosted-glass desktop filters sidebar (`.wg-glass` in components/design.css,
 *  which must match). `scripts/check.ts` composites the panel over the darkest and lightest map
 *  colors and requires its text and secondary text to keep 4.5:1 on top. */
export const GLASS_ALPHA: Record<ThemeName, number> = { light: 0.84, dark: 0.88 };

export function themeColor(theme: Theme, key: string): string {
  if (key.startsWith("map.")) return theme.map[key.slice(4) as keyof Theme["map"]];
  return theme.ui[key as keyof Theme["ui"]];
}

/** CSS custom properties for a theme: `--ui-text`, `--map-water`, … */
export function themeCssVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.ui)) vars[`--ui-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(theme.map)) vars[`--map-${kebab(k)}`] = v;
  return vars;
}
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
