# D-309: Number rounding on place details

PR #209, closes #196. Formatting lives in `packages/design/src/format.ts` (`formatValue`, `formatEstimate`).

## Rules
- A margin of error is never shown more precisely than its value, and never as "±0" or "±$7.00". A margin that rounds to nothing shows the smallest step instead.
- A margin of exactly 0 (controlled counts such as Census 2020) shows nothing.
- Percent values carry one decimal when the margin needs it ("19.8% ±1.9%").
- Gini and other ratios show 3 decimals on details; legends keep 2.
- Legend labels stay plain: no "less than 1¢" wording, no extra decimals.

## Wording choices (Robbie, 2026-10-14)
- Dollar amounts under one cent read "less than 1¢", with no margin.
- Percentiles that round to 99 or more read "top 1%". Everything else is "Nth percentile", never "0th" (lowest is "1st").
