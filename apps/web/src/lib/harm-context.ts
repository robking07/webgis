// PROTOTYPE (issue #104, not for merge): context for maps of preventable harm.
// In the real build this content would live in Markdown files under apps/web/content/context/
// (one per dataset, loaded and checked at build like Specials); see docs/plans/preventable-harm-context.md.
// Every entry here is a DRAFT written by Claude from the cited sources and is not approved by Robbie.

export interface ContextSource {
  label: string;
  url: string;
}

export interface HarmContext {
  datasetId: string;
  status: "draft" | "approved";
  /** 2–3 plain sentences: the harm, its scale, that it is largely preventable. `[n]` cites sources[n-1]. */
  summary: string[];
  /** "What's behind it" (a harm) or "What it leads to" (a behavior). */
  pointsHeading: string;
  points: string[];
  /** Related maps on Mapwich, with a neutral one-line reason. */
  linked: { id: string; why: string }[];
  /** A Special about this map, when one exists. `pending` = being written (prototype only). */
  special?: { title: string; href: string; pending?: boolean };
  sources: ContextSource[];
}

export const HARM_CONTEXT: HarmContext[] = [
  {
    datasetId: "traffic_fatalities",
    status: "draft",
    summary: [
      "Traffic crashes killed 40,901 people in the United States in 2023, about one every 13 minutes.[1]",
      "The CDC counts motor vehicle crashes among the leading causes of death and says these deaths are preventable with proven strategies.[2]",
    ],
    pointsHeading: "What's behind it",
    points: [
      "Speed: 29% of 2023 deaths were in speeding-related crashes.[1]",
      "Alcohol: 12,429 people died in crashes involving an alcohol-impaired driver.[1]",
      "Seat belts: of car and truck occupants killed whose belt use is known, 49% were unbelted.[1]",
      "Rural roads: rural areas have 20% of residents and 31% of miles driven, but had 41% of deaths.[1]",
    ],
    linked: [
      { id: "vmt_per_capita", why: "How much residents drive" },
      { id: "population_density", why: "Rural and urban areas" },
      { id: "aadt", why: "Traffic on each road" },
    ],
    special: { title: "Traffic deaths and serious-injury crashes", href: "/specials", pending: true },
    sources: [
      { label: "NHTSA, Summary of Motor Vehicle Traffic Crashes: 2023 Data (DOT HS 813 762, October 2025)", url: "https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813762" },
      { label: "CDC, About Transportation Safety (April 2026)", url: "https://www.cdc.gov/transportation-safety/about/index.html" },
    ],
  },
  {
    datasetId: "smoking",
    status: "draft",
    summary: [
      "Cigarette smoking is the leading preventable cause of disease, death and disability in the United States.[1]",
      "Smoking and secondhand smoke cause more than 480,000 deaths a year.[1]",
    ],
    pointsHeading: "What it leads to",
    points: [
      "Cancer: smoking is linked to about 80% of lung cancer deaths.[2]",
      "Heart disease and stroke.[1]",
      "Lung diseases such as COPD, and type 2 diabetes.[1]",
      "Quitting helps: lung cancer risk goes down after a person quits.[2]",
    ],
    linked: [
      { id: "obesity", why: "Another major health risk, same CDC survey" },
      { id: "physical_inactivity", why: "Same CDC survey" },
      { id: "binge_drinking", why: "Same CDC survey" },
    ],
    sources: [
      { label: "CDC, Cigarette Smoking (Smoking and Tobacco Use)", url: "https://www.cdc.gov/tobacco/about/index.html" },
      { label: "CDC, Lung Cancer Risk Factors", url: "https://www.cdc.gov/lung-cancer/risk-factors/index.html" },
    ],
  },
];

export const CONTEXT_BY_ID = new Map(HARM_CONTEXT.map((c) => [c.datasetId, c]));
