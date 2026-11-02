# D-589 · EPA air quality steps back to 2005 (ozone) and 2001 (PM2.5)

PR #489, part of #479. `ozone_8hr` timeline 2005 to 2025, `pm25_annual` 2001 to 2025: one stop per year, each a
3-year design value labeled by its last year (2023 to 2025 stays the headline). County level.

- **Reach is what EPA publishes as files.** Ozone county values start with the 2003 to 2005 report, PM2.5 with 1999 to 2001
  (the first full FRM network). Nothing earlier exists as a county or site table on epa.gov (ozone back to 1980 is only
  in PDFs and raw AQS data; deriving design values from AQS would be our own computation, not EPA's). Not taken.
- **Before the county tables began**, the same workbooks have monitor listings; a county is its highest valid monitor
  (ozone: a numeric value; PM2.5: status 1 or 2). Check: PM2.5 2005 to 2007 derived this way matches EPA's county table
  for all 534 counties.
- **Map classes stay fixed** across years. Standards changed (ozone 0.084, 0.075, 0.070; PM2.5 annual 15, 12, 9); the
  coverage note says so; the line is not drawn per year.
- **Files list** is `data/ingest/src/airquality-files.ts` (ingest only, no schema change); add last year's workbook there
  when EPA publishes the next. New `xls.ts` reads the pre-2010 .xls workbooks (no dependency).
- Pre-2020 stops use 2019 boundaries (EPA keeps old Connecticut counties, so CT shows on those stops).
