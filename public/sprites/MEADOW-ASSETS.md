# Meadow monsters

`meadow-monsters-v1.png`: transparent 4 by 4 animation atlas, generated with the built-in imagegen tool using the dual-knife character as an art-style reference.

Rows: boar, slime, plant, mutant boar boss. Columns: idle, step A, step B, attack. Rendered in `meadow-monsters.ts`, with cached foot alignment, slow walking cycles and attack poses driven by combat events. Existing drawings remain as loading fallbacks.

## Prompt

Simple 2D RPG monster ANIMATION SPRITE ATLAS, transparent background. Exact 4 columns x 4 rows equally sized square cells, 1536x1536. Match reference's hand-painted anime chibi game art, clear outlines and soft shading, NOT pixel art. All creatures face RIGHT side profile, same consistent body across each row, feet baseline at 85% cell height, centered with generous padding, no overlap. Rows top to bottom: brown tusked boar; green jelly slime with small face; green-stem carnivorous plant with coral-red toothy flower head and rooted leaf feet; mutant boar boss dark brown with a small violet ridge, larger tusks and single forehead horn. Columns left to right: idle; walking step A; walking step B; attack lunge/bite. Slime walk frames squash and stretch, plant walk frames alternate root-feet. Simple low-detail readable silhouettes, natural meadow palette. No background, text, UI, labels, ground or shadows. Four poses per monster, sixteen isolated sprites total. Match character ART STYLE only, not costume.
