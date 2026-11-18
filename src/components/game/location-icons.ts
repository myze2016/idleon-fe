const cells: Record<string, [number, number, number, number]> = {
  meadow: [420, 0, 350, 241], forest: [900, 0, 374, 241], garnaland: [1398, 0, 355, 241],
  harbor: [378, 241, 415, 241], tourney: [890, 241, 392, 241], deepsea: [1386, 241, 393, 241],
  "deepsea-2f": [389, 482, 402, 242], "deepsea-palace": [889, 482, 392, 242], city: [1380, 482, 403, 242],
};
let atlas: HTMLImageElement | undefined;
export function drawLocationIcon(ctx: CanvasRenderingContext2D, location: string, x: number, y: number, size = 28) {
  if (typeof Image === "undefined") return;
  if (!atlas) { atlas = new Image(); atlas.src = "/ui/location-icons-v1.png"; }
  const cell = cells[location];
  if (!cell || !atlas.complete || !atlas.naturalWidth) return;
  const [sx, sy, sw, sh] = cell, scale = Math.min(size / sw, size / sh);
  ctx.drawImage(atlas, sx, sy, sw, sh, x + (size - sw * scale) / 2, y + (size - sh * scale) / 2, sw * scale, sh * scale);
}
