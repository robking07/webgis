# D-563 · Search stays on the map; one search on every page

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker; lead decides)
- **PR:** #463 (issue #438)

The header still falls away when the map goes full screen, but search no longer goes with it.
Laptops and up: a search button sits beside the "Show navigation" button, top left, clear of the
legend and the map controls. Phones: the button above the legend strip (issue #246) now shows
whenever the header is hidden, not only after a tap or pick zoomed in. The search icon is a size
up (20 px) and bolder (stroke 2.5) everywhere, from one shared `SearchIcon`.

Off the map (place pages, compare, Specials, data pages), the header's search used to link to the
data directory. It now opens the same search box (same results, keys, Esc and focus return, full
screen on phones). A pick opens the map there through the URL: a dataset as `d`, a county or state
focused (`in`), a city or metro as `area`, an MPO as `mpo`. Alternatives seen: handing the pick to
the map page in session storage so it replays the map's own handler (exact same result, but more
Viewer code and timing with the map's load), or keeping the data-directory link (not one experience).

Known limits: an address picked off the map opens the map framed on it without the pin and tract
details the map's own search adds; on phones the search button hides while the full legend is
expanded (collapse it to get search back).
