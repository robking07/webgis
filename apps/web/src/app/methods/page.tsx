import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "How Mapwich works · Mapwich",
  description: "Sources and methods: where the numbers come from, margins of error, reliability warnings, boundaries, updates and known limits.",
};

const sources: [string, string, string, string][] = [
  ["Census Bureau, American Community Survey (ACS) 5-year", "56", "2020–2024", "States to block groups"],
  ["CDC PLACES health estimates", "38", "Mostly 2023", "Counties; 10 also tracts"],
  ["FEMA National Risk Index", "10", "Version 1.20 (2025)", "Counties and tracts"],
  ["NOAA climate normals", "7", "1991–2020", "Counties"],
  ["USDA Food Access Research Atlas", "5", "2019", "Counties; 2010 tracts"],
  ["CDC/ATSDR Social Vulnerability Index", "5", "2022", "Counties and tracts"],
  ["2020 Census", "3", "2020", "States to blocks"],
  ["The other sources: Census jobs (LODES) and insurance estimates (SAHIE), CEJST, DOE, EPA (air quality, toxic releases), FHWA, NHTSA, CDC overdose deaths", "15", "2018–2025", "Varies"],
];

export default function MethodsPage() {
  return (
    <ProsePage title="How Mapwich works: sources and methods">
      <h2>Where the numbers come from</h2>
      <p>Mapwich has 139 maps from 18 public sources, nearly all federal. Each map&apos;s page gives its source, year, license, method and citation.</p>
      <div className="tbl">
        <table>
          <thead><tr><th>Source</th><th>Maps</th><th>Year shown</th><th>Areas</th></tr></thead>
          <tbody>
            {sources.map(([s, ...rest]) => (
              <tr key={s}><td>{s}</td>{rest.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Margins of error</h2>
      <p>
        Most numbers here are survey estimates. The ACS asks a sample of households each year; its 5-year estimates pool five years of answers so small areas have a number. Each estimate has a margin of error: 12% ± 3 points means the true value is likely between 9% and 15%. Census Bureau margins are at 90% confidence; CDC PLACES gives a 95% interval.
        {" "}Small areas have fewer answers and wider margins. A tract&apos;s estimate can be shaky when its county&apos;s is solid.
      </p>

      <h2>Reliability warnings</h2>
      <p>For ACS maps, Mapwich compares each margin with its value (the Census Bureau&apos;s coefficient of variation):</p>
      <ul>
        <li><strong>Reliable:</strong> under 15%.</li>
        <li><strong>Use with caution:</strong> 15% to 30%. A note appears with the value.</li>
        <li><strong>Unreliable:</strong> over 30%, roughly a margin of half the value or more. A note appears, and the map can hatch these areas (switch it on in the legend).</li>
      </ul>
      <p>A zero with a margin over 5 points is also unreliable. Other sources aren&apos;t graded: they are full counts or use a different interval.</p>

      <h2>Counts, models and ranks</h2>
      <ul>
        <li><strong>The 2020 Census</strong> counts everyone, so it has no margin, though privacy noise can put a single block off by a few people.</li>
        <li><strong>CDC PLACES and SAHIE are model-based.</strong> They combine survey answers with local characteristics where no survey is big enough. PLACES county rates are age-adjusted; tract rates are not, because CDC publishes them unadjusted.</li>
        <li><strong>Social Vulnerability Index and FEMA risk scores</strong> are ranks from 0 to 100 among U.S. counties or tracts.</li>
      </ul>

      <h2>Places and boundaries</h2>
      <p>Boundaries are the Census Bureau&apos;s 2024 cartographic boundary files: 2020 tracts, and Connecticut&apos;s nine planning regions in place of its old counties.</p>
      <ul>
        <li><strong>CEJST and USDA food access tracts use 2010 tracts</strong>, drawn as published. The county tract spreadsheet leaves them out, because it is for joining to 2020 tracts.</li>
        <li><strong>Earlier ACS periods</strong> (2010–2014, 2015–2019) also use 2010 tracts. Change maps match tracts by ID, so one split or merged in 2020 shows &quot;No data&quot;, not a false change.</li>
        <li><strong>Traffic, bridge and climate sources</strong> still use Connecticut&apos;s old counties, so its counties show no data there.</li>
      </ul>

      <h2>Area totals and similar counties</h2>
      <p><strong>MPO totals.</strong> With a metropolitan planning organization in focus, Mapwich adds up the counts behind the map for its counties, rebuilds percentages from the sums and combines margins with the Census Bureau&apos;s formulas. Where the boundary cuts a county, it adds the tracts whose 2020 population center is inside, and labels the total exact, near-exact or approximate. Medians, indexes and modeled rates can&apos;t be added up.</p>
      <p><strong>Similar counties.</strong> Every county is ranked on 126 measures in six topics. A county&apos;s five matches are those whose ranks come closest overall, with each topic counted equally. Race and ethnicity are among the measures.</p>

      <h2>Updates and archives</h2>
      <p>A map is reloaded when its source publishes a new release. Earlier ACS periods stay on as a timeline, with dollars restated in 2024 dollars.</p>
      <p>When a source goes offline, Mapwich keeps the last version. CEJST was removed from federal websites in 2025; the map shows its final data from a public mirror. For Minnesota&apos;s MPOs, it keeps a copy of each plan, a Wayback Machine snapshot and the date each link was checked.</p>

      <h2>Known limits</h2>
      <ul>
        <li><strong>Health insurance.</strong> The Census Bureau changed its insurance question in 2025 and will leave insurance out of the 2021–2025 5-year tables, expecting it back with 2022–2026. Mapwich&apos;s ACS uninsured map stays on 2020–2024; a SAHIE map (under 65, counties) updates yearly.</li>
        <li><strong>No date for the next 5-year release.</strong> The 2021–2025 estimates usually come out in December. As of October 29, 2026, the Bureau says only that dates &quot;will be forthcoming.&quot;</li>
        <li><strong>New privacy rules.</strong> A June 2026 Commerce Department order (DAO 216-26) bars the Bureau from adding statistical noise; numbers must be rounded, grouped or withheld instead. The Bureau will phase it into the 5-year tables by 2029; what changes for small areas isn&apos;t public yet.</li>
        <li><strong>Gaps.</strong> CDC PLACES has no 2023 estimates for Kentucky or Pennsylvania. Some sources leave out Puerto Rico. Air quality maps cover only counties with an EPA monitor; a blank county means no monitor, not clean air.</li>
      </ul>

      <h2>Report an error</h2>
      <p>Open an issue at <a href="https://github.com/robking07/webgis/issues">github.com/robking07/webgis/issues</a> with the page link, the place, the number you saw and what you expected.</p>
    </ProsePage>
  );
}
