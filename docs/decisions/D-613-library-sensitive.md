# D-613 · The Library's sensitive-topic batch: 23 maps, wording for Robbie

- **Date:** 2026-11-03
- **Status:** DEFAULTED (worker), for the lead. Wording waits for Robbie (`drafts/site-copy/library-sensitive-wording.md`).
- **PR:** #513 (issue #422). Pipeline and checks unchanged from D-521, D-536 and D-567.

## What was added

23 recipe lines at the end of `data/registry/library/acs-profile.yaml`:

- **Race and ethnicity (4):** White, Black, American Indian and Alaska Native, and Asian, each "alone
  or in combination" (`DP05_0083P`–`0086P`). The Featured race maps count each person once
  (non-Hispanic, one race); these count everyone who reports the race, which matters most for
  American Indian and Alaska Native residents.
- **Immigration and language (6):** immigrants who arrived in 2010 or later, naturalized citizens,
  any language other than English at home, people who speak English less than "very well", Spanish
  at home, Spanish speakers with limited English.
- **Disability (4):** under 18, 18 to 64, 65 and older (`DP02`), and veterans with a
  service-connected disability rating (`B21100`, no profile cell).
- **Health insurance (3):** uninsured under 19, employed adults 19 to 64, adults 19 to 64 outside
  the labor force.
- **Income and poverty (5):** all families, married-couple families, families led by a woman with
  no spouse, people 65 and older in poverty, households with SSI.
- **Grandparents (1):** grandparents responsible for the grandchildren they live with.

The recipe gained two optional fields, `note` (the entry's `coverageNote`) and `terms` (glossary ids),
so these maps can carry their context sentence and the poverty-line explainer. The race maps' note
repeats the context Robbie approved for place pages (#411), because Library maps don't appear there.
Ramps follow the pilot's per-category rule; Health is new to the recipe and takes `oranges`, the
ramp most Health maps use.

## How maps were picked: county reliability

The Census API now refuses keyless calls, and the worker had no key, so each candidate was
approximated from the detailed table it is built from (2020–2024 table-based summary files on
www2.census.gov, Census proportion-MOE formula, the D-222 CV grades). Rule: keep a map when at most
half of its graded county values are unreliable (CV over 30%), the same line D-521 uses for tracts.
The real check (`npm run ingest -- library`) still has to run with the key; tracts are dropped
automatically where they are mostly unreliable.

| Map | County values unreliable |
|---|---|
| disability 65+ / 18–64 | 1% / 3% |
| White / AIAN / Black / Asian, alone or in combination | 0% / 15% / 17% / 32% |
| uninsured: working adults / outside the workforce / under 19 | 8% / 21% / 38% |
| poverty: 65+ / families / single-woman families / married couples | 8% / 11% / 23% / 30% |
| SSI households / veterans' disability rating / grandparents responsible | 13% / 14% / 27% |
| other language / Spanish / LEP all / LEP Spanish | 16% / 22% / 39% / 41% |
| naturalized / arrived 2010+ / disability under 18 | 24% / 42% / 35% |

## Left out

- **Too unreliable at county level (over 50% unreliable):** Native Hawaiian and Pacific Islander
  alone or in combination (80%); every detailed origin group, e.g. Puerto Rican 68%, Cuban 84%,
  Chinese 76%, Asian Indian 74%, Filipino 76%, Vietnamese 80%, Korean 80%, Japanese 85%, Hmong 88%,
  Native Hawaiian 95%, Somali 92%; Indo-European, Asian and Pacific Island, and other languages and
  their limited-English shares (56% to 83%); uninsured unemployed adults (51%); uninsured 65+ (88%).
- **Reliable but left out:** Mexican origin (20%): the only detailed origin group that passes, and
  one group alone reads as singling it out (question for Robbie). Tribal groups: not for an
  automatic recipe.
- **Duplicates of live maps:** race alone (`DP05_0037P` etc., the Featured non-Hispanic maps cover
  them), all-ages disability, all-ages uninsured, all-people poverty, children in poverty, foreign
  born, limited-English households.
- **Not shown on their own:** non-citizens (the complement of naturalized citizens, and the most
  sensitive cut), "Some Other Race" (mostly Hispanic write-ins; reads as a code), world region of
  birth (a share of immigrants, mostly unreliable), ancestry.

## Not done here

- **The keyed check run.** Entries were written with `--offline`, so `registry:validate` fails on
  the 23 until someone with `CENSUS_API_KEY` runs `npm run ingest -- library` on this branch and
  commits the checks file (as for batch 2).
- **`--offline` rewrites failed maps:** it wrote `pct_multigenerational_households` and
  `pct_no_rent_paid` back (both fail their checks); the worker deleted them by hand. The keyed run
  removes them on its own.
