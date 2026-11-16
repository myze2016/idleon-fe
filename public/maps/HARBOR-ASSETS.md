# Harbor artwork

Generated with the built-in imagegen tool in the existing painted adventure style.

- `public/maps/harbor-painted-v1.png`: looping coast, pier and fishing hut. Scenery scrolls during travel, stops during combat, and receives night lighting according to the existing server period.
- `public/sprites/harbor-monsters-v1.png`: crab (day/night), hermit, starfish, guide boss. Four columns: idle, walk A, walk B, attack.
- `public/sprites/harbor-night-monsters-v1.png`: spearman, hunter, magos. Same four animation columns. Background transparency corrected with an image edit.

## Background prompt

Simple side-view RPG harbor battle background, painted anime adventure style matching reference meadow. Muted teal sea, distant sailboats, a small timber pier and fishing hut at edges, soft cloudy sky. Flat sandy coastal path across bottom25%, boundary exactly75% down image. Clear combat lane, no foreground obstacles. Warm earthy browns and subdued blue greens, soft daylight without visible sun (supports night tint). Simple readable shapes, no characters, text or UI. Landscape1536x1024, matching edge density for looping scenery.

## Main monsters prompt

Simple chibi RPG monster animation atlas, transparent background, exact4 columns x4 rows equal square cells1536x1536. Match reference painted anime monster style. Rows: orange crab with big claws; brown spiral-shell hermit crab; coral starfish creature with small face; teal fishperson GUIDE boss with webbed feet, small staff and simple seashell necklace. Columns idle, walking A, walking B, attack (claw snap, starfish bubble cast, guide bubble cast). All face RIGHT, consistent designs across each row, feet aligned85% cell height, generous padding, no cell overlap. Earthy muted colors, clean outlines, soft shading. No backgrounds, text, labels, UI or shadows. Simple low detail.

## Night monsters prompt

Simple chibi RPG fishpeople animation atlas, transparent background, exact4 columns x3 rows equal square cells1536x1152. Match reference painted anime monster style. Rows: teal fishperson spearman with simple wooden spear; teal fishperson hunter with small bow; teal fishperson magos with dark blue hood and small glowing staff. Distinct readable silhouettes, webbed feet and fins. Columns idle, walk A, walk B, attack to RIGHT (spear thrust, bow shot, magic cast). Same design across row, feet aligned85%, generous padding, all weapons within own cell. Muted teal, brown and navy, clean outline and soft shading. Low detail. No background, ground shadows, text, labels or UI.
