# Forest assets

Generated with the built-in imagegen tool, matching the existing painted RPG art style.

- `public/maps/forest-painted-v1.png`: simple looping forest background; scrolls right to left during travel and stops during combat.
- `public/sprites/forest-monsters-v1.png`: transparent 4-column, 3-row atlas. Rows: coconut warrior, slinger, chief. Columns: idle, step A, step B, attack. Uses the shared foot-aligned sprite renderer.

## Background prompt

Simple side-view RPG forest battle background, same painted anime adventure style as reference. Muted moss greens and earthy browns, broad tree trunks, layered leafy canopy, a few ferns, soft shaded daylight. Clear flat brown dirt path across lower 25%, path boundary exactly 75% down image. No obstacles in combat lane, no characters, buildings, text or UI. Low detail, readable silhouettes, landscape 1536x1024. Matching left/right tree density for looping scenery.

## Monster prompt

Simple RPG monster animation atlas, transparent, exact 4 columns x 3 rows equal square cells, landscape 1536x1152. Same hand-painted anime chibi art as reference monster sheet. Forest coconut creatures, NOT humans: round brown coconut-shell bodies, small twig arms and root feet, carved expressive faces and green leaf headbands. Row1 coconut warrior with small stone axe; Row2 coconut slinger holding leather sling; Row3 chief boss, larger coconut with leaf cloak and small wooden crown, holding sling. Columns: idle, walk step A, walk step B, attack (warrior swings axe, slingers release sling). Face RIGHT, consistent body design per row, feet aligned at 85% of each cell, generous margins, complete isolated poses. Simple earthy brown and moss green palette, clean outlines, soft shading, no background, ground, shadows, labels or UI. Twelve sprites total.
