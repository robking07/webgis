# D-651: Header sections are Map · Data · Specials (roadmap 3.5)

- Data (/data) joins the header on every page. The current section is underlined, subpages included: /data/<id> is Data; /specials/* is Specials; /map, /place/* and /compare/* are Map.
- About and Methods stay in the footer row (SiteNav), which every non-map page already has.
- Specials and Data links do not prefetch (#505): both are heavy pages that would compete with the map's load.
- Dataset pages already have "Map it"; place pages already have "Back to the map". Nothing added.
