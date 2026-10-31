import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "About · Mapwich",
  description: "Mapwich is a free map of U.S. public data, made first for planners and open to anyone. Who makes it, what it is not, and where the data comes from.",
};

export default function AboutPage() {
  return (
    <ProsePage title="About Mapwich">
      <h2>What Mapwich is</h2>
      <p>
        Mapwich is a free map of U.S. public data, made first for planners and open to anyone. Pick a topic, such as commuting, rent, health or flood risk, and see it for every state, county and census tract.
        {" "}Every number names its source, its year and its license.
      </p>

      <h2>Who makes it, and why</h2>
      <p>Mapwich is made by Robbie King, a transportation planner and GIS lead.</p>
      <p>Robbie sets the plan and the rules; AI coding agents write much of the code, and every change is reviewed before it goes live.</p>

      <h2>Try this</h2>
      <ul>
        <li><strong>Compare two places.</strong> Open Hennepin County, Minnesota, choose &quot;Compare with…&quot; and pick Ramsey County. Where the survey margins are too wide to tell the two apart, the page says &quot;About the same&quot;.</li>
        <li><strong>See what changed.</strong> On median household income, open Map options, choose Change and set From to 2015–2019.</li>
        <li><strong>Find a county&apos;s peers.</strong> Every county page lists the five counties most like it, and what they share. Try Holmes County, Ohio.</li>
        <li><strong>Open a region&apos;s plans.</strong> Search for Rochester-Olmsted, or any of Minnesota&apos;s eight metropolitan planning organizations, to see its long-range plan, TIP, work plan and grants, each with a saved copy.</li>
        <li><strong>Take a county home.</strong> &quot;Every map, by census tract&quot;, at the bottom of a county page, downloads one spreadsheet ready to join to tract boundaries in QGIS or ArcGIS.</li>
        <li><strong>Read a Special.</strong> Short stories built on the maps. Start with &quot;109 bike commuters, give or take 110&quot;.</li>
      </ul>

      <h2>What it is not</h2>
      <ul>
        <li><strong>Not for navigation.</strong> Roads and traffic counts are context only.</li>
        <li><strong>Not commercial.</strong> No ads, no accounts, nothing for sale.</li>
        <li><strong>Not an official source.</strong> For anything with legal or funding weight, use the agency&apos;s own release; each map&apos;s page links to it.</li>
        <li><strong>Not a chatbot.</strong> There is no AI for visitors to type into.</li>
      </ul>

      <h2>Open data</h2>
      <p>
        Public data belongs to the public. It should be free to use, collected by open and documented methods, and published with its uncertainty shown.
        {" "}When federal data is delayed, cut back or taken offline, as EPA&apos;s EJScreen and the Climate and Economic Justice Screening Tool were in 2025, Mapwich says so and keeps what it can.
      </p>

      <h2>Credits and license</h2>
      <p>
        Data comes from U.S. federal agencies, including the Census Bureau, CDC, FEMA, NOAA, EPA, USDOT, USDA and the Department of Energy, credited on each map&apos;s page. Archived CEJST data comes from Public Environmental Data Partners.
        {" "}Basemap: OpenFreeMap © OpenMapTiles © OpenStreetMap contributors, drawn with MapLibre. The code is MIT-licensed at <a href="https://github.com/robking07/webgis">github.com/robking07/webgis</a>. Mapwich is non-commercial and educational.
      </p>
    </ProsePage>
  );
}
