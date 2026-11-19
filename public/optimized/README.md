Game images served from this folder are generated from the original PNG artwork.

Run `npm run assets:optimize` from `idleon-fe` after changing artwork or adding an
image reference under `src`. Commit the generated WebP files, manifest, and updated
source references together, then redeploy. Originals remain available for editing.

Backgrounds and UI artwork use WebP quality 85 with full-quality alpha. Sprite
sheets use lossless WebP with their original dimensions and alpha, preserving
frame coordinates and the floor detection used by the canvas renderers.

Filenames include a content hash. Only `/optimized/*` receives a one-year immutable
cache header; changing artwork generates a different URL. Old generated files are
retained so cached pages can still request them.

Initial conversion: 53 referenced assets, 83.04 MiB PNG to 26.60 MiB WebP (68% less).
The cabin background fell from 2,108,956 to 126,366 bytes; parchment fell from
2,633,980 to 167,714 bytes. Regeneration is manual, so normal Vercel builds do not
spend time encoding images.
