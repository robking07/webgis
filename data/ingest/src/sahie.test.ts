import { describe, expect, it } from "vitest";
import { parseSahie } from "./sahie.ts";

const H = "year,version,statefips,countyfips,geocat,agecat,racecat,sexcat,iprcat,NIPR,nipr_moe,NUI,nui_moe,NIC,nic_moe,PCTUI,pctui_moe,PCTIC,pctic_moe,PCTELIG,pctelig_moe,PCTLIIC,pctliic_moe,state_name,county_name,";
const row = (st: string, co: string, geo: string, ipr: string, pct: string, moe: string) =>
  `2024,        ,${st},${co},${geo},0,0,0,${ipr}, 1,0, 1,0, 1,0, ${pct}, ${moe}, 0,0, 0,0, 0,0,Name   ,Name   ,`;

describe("parseSahie", () => {
  it("keeps the all-groups state and county rows, skips the preamble and subgroups, nulls '.'", () => {
    const r = parseSahie([
      "Filename: sahie_2024.csv", " year,4", H,
      row("27", "000", "40", "0", " 6.0", "0.2"),
      row("27", "053", "50", "0", " 5.8", "0.4"),
      row("27", "053", "50", "1", "12.1", "1.0"), // income subgroup
      row("15", "005", "50", "0", "    .", "    ."), // Kalawao
    ].join("\r\n"));
    expect(r.state.get("27")).toEqual({ value: 6, moe: 0.2 });
    expect(r.county.get("27053")).toEqual({ value: 5.8, moe: 0.4 });
    expect(r.county.get("15005")).toEqual({ value: null, moe: null });
    expect(r.county.size).toBe(2);
  });
  it("moves renamed counties to today's code and drops a merged city while its county has a rate", () => {
    const r = parseSahie([H,
      row("46", "113", "50", "0", "14.6", "1.9"), // Shannon → Oglala Lakota
      row("51", "019", "50", "0", "13.0", "1.5"), row("51", "515", "50", "0", "18.4", "2.5"), // Bedford city
    ].join("\n"));
    expect([...r.county.keys()].sort()).toEqual(["46102", "51019"]);
    expect(r.county.get("51019")?.value).toBe(13);
  });
});
