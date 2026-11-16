# Simple chibi character sheets

Generated with the built-in image_gen tool using Dual Knife (`assassin-moe-walk-sheet.png`) and Great Sword (`greatsword-v1.png`) as style references.

Four frames per sheet: idle, left walking step, right walking step, attack/cast. Integrated in `src/components/game/character-design.ts` using the existing animation playback. Static screens redraw when sprites load.

Final files:
- `spear-chibi-v2.png`
- `rifle-chibi-v1.png`
- `staff-chibi-v1.png`
- `book-chibi-v1.png`

## Shared generation prompt

Create a simple 2D game sprite sheet matching BOTH reference sheets: cute chibi anime, oversized head, tiny body, clean outlines, flat cel shading, restrained detail. Exactly FOUR full-body figures in ONE horizontal row, four equal cells, transparent alpha background. Same character scale and boot baseline across cells, all face RIGHT. Frames left to right: idle, walking with left foot forward, walking with right foot forward, clear attack/cast pose. Visible different leg positions in frames 2 and 3. Each figure and weapon entirely inside its cell with generous transparent padding. No text, numbers, grid, shadows, scenery or background. Character: 

## Class specifications

- **spear:** teal-armored young lancer with dark blue hair and a long silver-tipped spear. Attack frame thrusts spear forward.
- **rifle:** olive-uniformed young rifle scout with brown hair, cap and goggles, red scarf and wooden rifle. Attack frame shoulders and fires rifle right with a small muzzle flash.
- **staff:** purple-robed silver-haired mage with a pointed wizard hat and amber-tipped staff. Attack frame extends staff and casts a small orange fireball.
- **book:** blue-and-gold robed dark-haired scholar with round glasses and a spellbook. Attack frame opens glowing book and extends hand to cast.

## Spear background cleanup

Remove the white background and all gray shadows from this sprite sheet, replacing them with real transparent alpha. Preserve the four spear character poses, exact positions, size, art style and horizontal layout. Keep character pixels unchanged. No checkerboard, no background, no floor shadows. Output transparent PNG.

