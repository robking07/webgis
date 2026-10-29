# D-516 · Change maps: a visible grey for no clear change

PR #416, finding F7 under #187.

- **Middle class.** The change ramp's neutral (`puor`) is now `#e8e2d4`, a warm light grey, instead of `#f7f7f7`. It is ΔE 5.5 from U.S. land (was 2.6), so steady areas read as measured, not as holes. A cooler grey (`#dedcd6`) dropped the tritanopia worst-case adjacent ΔE from 10.0 to 6.9; `#e8e2d4` gives 10.7 (normal 14.7, protan 12.9, deutan 13.4).
- **Cut-offs.** The change legend and the map classes round to 1 significant figure (±2, ±5 pts), two where that would merge the cut-offs (`niceBreaks`, `minSig`).
- **No-data stays darker than the middle.** `map.noDataChange` is a flat mid-grey (`#b0ada5` light) darker than the middle class. We drop the goal "no-data lighter than every class": the check:design gate keeps every class at ΔE ≥ 10 from no-data, and the diverging ramp must peak at its middle, so no grey can sit lighter than the middle and still pass. We keep the gate. Lead call (not Robbie's).
