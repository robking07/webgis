# D-595 · Job density reaches back to 2002

- **Date:** 2026-11-02
- **Status:** DEFAULTED (worker, issue #479, wave 3)
- **PR:** #495

`job_density` (LODES 8 workplace jobs, the only `lodes` registry entry) now runs `{ from: 2002, to: 2023 }`,
one stop a year, state, county and tract; 2023 stays the headline. Registry change only: the
`timeline` step already reads each year's file with the same parser and writes no data, not zero,
for a state with no file that year (D-36).

- **Boundaries.** LODES 8 keys every year to 2020 blocks: every block in the 2002, 2005 and 2009
  files for Minnesota, Connecticut, Alaska and Virginia is in the state's 2020 crosswalk.
  Connecticut's old county codes are remapped through the crosswalk as for later years.
- **Gaps (checked against the file listing and each file's job total).** No workplace file:
  D.C. before 2010, Arizona and Mississippi 2002–2003, New Hampshire 2002, Michigan 2022 to date,
  Alaska 2017 to date. Massachusetts 2002–2010 and Arkansas 2002 have files with almost no jobs
  (under 20, and 32); the existing rule (a state under 10% of its headline jobs is no data) already
  drops them. The smallest real early year is Utah 2002 at 60% of 2023.
- **Federal jobs.** LODES counts federal civilian jobs only from 2010 (`JT04` files start in 2010;
  the tech doc's coverage table says the same). In 2010 they were 1.0% of jobs nationally but up to
  a fifth of a county's (Macon County, AL 19%; Alexandria, VA 13%, which jumps from 82,895 jobs in 2009 to 97,018 in 2010). We keep `JT00`
  for every year and say so in `coverageNote` rather than stopping at 2010 or dropping federal jobs
  from later years.
- **Size.** WAC `S000_JT00` files for 2002–2009 total 268 MB across the states, all added
  to `data/cache` (2010 alone is 51 MB); the Data run reads 8 more years of the same files it
  already reads for 2010–2023.
