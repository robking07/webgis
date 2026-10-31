# D-545 · Hover popup and details show the same number

- **PR:** #445 (closes #343). Follows D-309 (rounding) and D-359 (hover hierarchy).

**Problem.** Nebraska's median household income read $76,480 on hover and $76,475 in the details. The state and county map files were written at 4 significant digits; the details read the full database value.

**Decided.** The state and county map files are written at 7 significant digits, so the same exact number shows in both places (no "$76K" rounding). Tracts and block groups already match: both places read the same 4-digit files. No UI change; D-309's rounding rules are untouched.

**Needs a re-run.** Published files change only after `ingest export-values` and `publish-data`.
