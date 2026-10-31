# D-551 · Feature layers name their own noun

Status: accepted (PR #451, issue #448)

The legend, dataset page, directory and map meta line said "Road segments" for every feature layer, and the legend always said "wider lines = higher road class". Now the registry's features measure has an optional `noun` (plural, capitalized; default "Features"). AADT sets "Road segments". The width note shows only when the layer has a `rank` field, the thing that sets line width. Considered: reusing `unit` (it is the value's unit, not the thing mapped).
