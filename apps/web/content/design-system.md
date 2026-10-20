# How Mapwich draws its maps

Every map on Mapwich follows the same rules for color, legends and zoom. That's on purpose: once you've learned to read one map here, you can read all of them. This page explains those rules and why we chose them.

## Colors anyone can read

About 1 in 12 men and 1 in 200 women have some form of color blindness. A map that only works for normal color vision quietly fails a lot of people.

So before the site goes live, every color scheme is tested automatically against simulations of the three main kinds of color blindness. If any two neighboring colors in a legend get too close to tell apart for any of these viewers, the site doesn't publish. Text and labels are checked the same way for contrast, in both light and dark mode.

You'll find three kinds of color scheme on Mapwich:

- **Light to dark, one color** (for example, blues): for values that just go from low to high, like median income or population.
- **Two colors meeting in the middle** (for example, orange to purple): for values with a meaningful midpoint, like change over time, where one color is "went down", the other is "went up", and the pale middle is "no clear change".
- **Distinct colors**: for categories that have no order, like types of places or programs.

![Blues](design-system/ramp-blues.svg)

*The top row is what most people see. The rows below show the same colors as they appear with each type of color blindness. Every step stays distinguishable.*

## How the legend sorts places into colors

Most maps split places into five groups with about the same number of places in each. So the darkest color means "in the top fifth of places on this map", not "above some fixed number". The legend shows the actual cut-off values for each color.

A few things are always true:

- **The groups match what's on screen.** States, counties and neighborhoods each get their own cut-offs, and the legend says which level you're looking at.
- **Every color has a written label**, so you never have to judge a shade by eye.
- **Missing data looks different from low data.** Places without a value get a light hatched pattern, so a gap never passes for a low number.
- **When most places share the same value** (for example, most neighborhoods have zero transit commuters), that value gets its own group instead of a misleading range.

## Estimates that come with a warning

A lot of Mapwich's neighborhood data comes from the American Community Survey (ACS), which is based on a sample of households, not a full count. In small areas the sample is small, and some estimates are shaky.

Mapwich grades each estimate by how large its margin of error is compared with the estimate itself:

- **Reliable**: the margin of error is small compared with the estimate.
- **Use with caution**: noted in the details panel when you tap a place.
- **Unreliable**: the estimate could easily be far off. Turn on "Hatch unreliable estimates" in the legend, and these areas get diagonal stripes over their color. The color still shows underneath.

## Comparing two datasets on one map

Comparison maps color each place by two datasets at once. Each dataset is split into low, middle and high thirds, which gives a 3 × 3 grid of nine colors.

![Comparison colors](design-system/biv.svg)

- More **blue**: the first dataset is high.
- More **gold**: the second dataset is high.
- **Darkest**: both are high. **Lightest**: both are low.

None of the published nine-color schemes we tested held up for all three kinds of color blindness, so this one was made for Mapwich and tested the same way as the rest.

## Change over time

Change maps use orange for "went down", purple for "went up", and a pale middle for "no clear change". Both sides use the same steps, so a dark orange place lost about as much as a dark purple place gained. Places without a value use a darker gray than usual, so they never get mistaken for the pale "no change" middle.

## Zooming in and out

By default the map changes detail as you zoom: states when you're zoomed out, then counties, then census tracts (neighborhood-sized areas), then block groups and blocks. Phones switch levels a little earlier, so each level covers about the same ground on any screen. You can also pin a level in Map options.

Place names always sit on top of the colors, so you can read them over any shading.

## Light and dark mode

The whole site, map included, has a light and a dark version. Both are held to the same contrast rules for text, labels, roads and borders.

![Light and dark themes](design-system/themes.svg)

## For everyone, not just mouse users

- If your device is set to reduce motion, the map's fades and animations turn off.
- Every button and link works from the keyboard and shows a visible outline when selected.
- Everything the map shows by color is also available as text, in the place pop-up, the details panel and the table.
