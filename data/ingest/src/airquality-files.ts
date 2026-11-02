// EPA's earlier design value workbooks (https://www.epa.gov/air-trends/air-quality-design-values, "Previous
// Design Value Reports"), one per timeline stop. A stop is named for the last year of its 3-year window
// (2012 = 2010-2012). The newest workbook is the registry entry's own `url`; when EPA publishes the next one,
// add the one that just stopped being current here. EPA's county tables start with the 2005-2007 PM2.5
// and 2007-2009 ozone reports; before that, site listings in the same workbooks give each monitor's design
// value, and a county's value is its highest valid monitor (what EPA's county tables do).
type File = [url: string, sheet: string];
const E = "https://www.epa.gov/sites/default/files/";
const F = (path: string, sheet: string): File => [E + path, sheet];
const sites = (y: number) => `${y - 2}-${y} site listing`;

const O3 = "Table4. County Status";
export const OZONE_FILES: Record<number, File> = {
  2005: F("2016-09/dv_ozone_2003_2005.xls", "Appendix"),
  2006: F("2016-09/dv_ozone_2004_2006.xls", "Appendix"),
  2007: F("2016-09/dv_ozone_2005_2007.xls", "Monitor Listing"),
  2008: F("2016-09/dv_ozone_2006_2008.xls", "Monitor Listing"),
  2009: F("2016-09/ozone_designvalues_20072009_finalr03dec10.xls", "Table6"),
  2010: F("2016-09/ozone_designvalues_20082010_update.xlsx", "Table4"),
  2011: F("2016-09/ozone_designvalues_20092011_final_08_06_12.xlsx", "Table4"),
  2012: F("2016-09/ozone_designvalues_20102012_final_02_07_14.xlsx", "Table4"),
  2013: F("2016-09/ozone_designvalues_20112013_final_08_01_14.xlsx", O3),
  2014: F("2016-09/ozone_designvalues_20122014_final_08_03_15.xlsx", O3),
  2015: F("2016-07/ozone_designvalues_20132015_final_07_29_16.xlsx", O3),
  2016: F("2017-10/ozone_designvalues_20142016_final_10_02_17_0.xlsx", O3),
  2017: F("2018-07/ozone_designvalues_20152017_final_07_24_18.xlsx", O3),
  2018: F("2019-07/ozone_designvalues_20162018_final_06_28_19.xlsx", O3),
  2019: F("2020-05/o3_designvalues_2017_2019_final_05_26_20.xlsx", O3),
  2020: F("2021-05/o3_designvalues_2018_2020_final_05_11_21.xlsx", O3),
  2021: ["https://www.epa.gov/system/files/documents/2022-05/O3_DesignValues_2019_2021_FINAL_05_25_22.xlsx", O3],
  2022: ["https://www.epa.gov/system/files/documents/2023-05/O3_DesignValues_2020_2022_FINAL_05_22_23.xlsx", O3],
  2023: ["https://www.epa.gov/system/files/documents/2024-06/o3_designvalues_2021_2023_final_06_04_24.xlsx", O3],
  2024: ["https://www.epa.gov/system/files/documents/2025-05/o3_designvalues_2022_2024_final_05_28_25.xlsx", O3],
};

const P = "Table4a. County Status Ann";
const P5 = "dv_pm25_2005_2007.xls";
export const PM25_FILES: Record<number, File> = {
  2001: F(`2016-09/${P5}`, sites(2001)),
  2002: F(`2016-09/${P5}`, sites(2002)),
  2003: F(`2016-09/${P5}`, sites(2003)),
  2004: F(`2016-09/${P5}`, sites(2004)),
  2005: F(`2016-09/${P5}`, sites(2005)),
  2006: F(`2016-09/${P5}`, sites(2006)),
  2007: F(`2016-09/${P5}`, "Table 5"),
  2008: F("2016-09/dv_pm25_2006_2008rev102809.xls", "Table 5 - county summary"),
  2009: F("2016-09/pm25dv20072009finalrevised.xls", "Table4, county summary"),
  2010: F("2016-09/pm25_designvalues_20082010_finalrevised.xlsx", "Table4, county summary"),
  2011: F("2016-09/pm25_designvalues_20092011_final_07_30_12.xlsx", "Table4, county summary"),
  2012: F("2016-09/pm25_designvalues_20102012_final_12_12_13.xlsx", "Table 4, county summary"),
  2013: F("2016-09/pm25_designvalues_20112013_final_08_28_14.xlsx", "Table 4, County Summary"),
  2014: F("2016-09/pm25_designvalues_20122014_final_08_19_15.xlsx", "Table 4, County Summary"),
  2015: F("2016-07/pm25_designvalues_20132015_final_07_29_16.xlsx", "Table 4, County Summary"),
  2016: F("2017-07/pm25_designvalues_20142016_final_07_14_17.xlsx", "Table 4, County Summary"),
  2017: F("2018-07/pm25_designvalues_20152017_final_07_24_18.xlsx", "Table 4, County Summary"),
  2018: F("2019-12/pm25_designvalues_20162018_final_12_03_19.xlsx", "Table 4, County Summary"),
  2019: F("2020-05/pm25_designvalues_2017_2019_final_05_26_20.xlsx", P),
  2020: F("2021-05/pm25_designvalues_2018_2020_final_05_24_21.xlsx", P),
  2021: ["https://www.epa.gov/system/files/documents/2022-05/PM25_DesignValues_2019_2021_FINAL_05_24_22.xlsx", P],
  2022: ["https://www.epa.gov/system/files/documents/2023-05/PM25_DesignValues_2020_2022_FINAL_05_23_23.xlsx", P],
  2023: ["https://www.epa.gov/system/files/documents/2024-08/pm25_designvalues_2021_2023_final_08_08_24_0.xlsx", P],
  2024: ["https://www.epa.gov/system/files/documents/2025-06/pm25_designvalues_2022_2024_final_05_28_25.xlsx", "Table4a. County Status Annual"],
};

export const AIR_FILES: Record<string, Record<number, File>> = { ozone_8hr: OZONE_FILES, pm25_annual: PM25_FILES };
