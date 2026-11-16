const sheets = [
  { src: "/sprites/harbor-monsters-v1.png", rows: ["crab-day", "hermit", "starfish", "fishpeople-guide"], heights: [32, 38, 40, 52] },
  { src: "/sprites/harbor-night-monsters-v1.png", rows: ["fishpeople-spearman", "fishpeople-hunter", "fishpeople-magos"], heights: [50, 48, 52] },
  { src: "/sprites/meadow-monsters-v1.png", rows: ["boar", "slime", "plant", "mutant-boar"], heights: [42, 32, 50, 48] },
  { src: "/sprites/forest-monsters-v1.png", rows: ["warrior", "slinger", "coco-klan-chief"], heights: [48, 46, 52] },
];
const atlases = new Map<string, HTMLImageElement>();
const metrics = new Map<string, { feet: number[]; scale: number }>();

/** Returns false while loading so the original monster drawing remains available. */
export function drawMonster(ctx: CanvasRenderingContext2D, type: string, time: number, moving: boolean, strike: number) {
  if (type === "crab-night") type = "crab-day";
  const sheet = sheets.find((entry) => entry.rows.includes(type));
  if (!sheet) return false;
  const row = sheet.rows.indexOf(type);
  let atlas = atlases.get(sheet.src);
  if (!atlas) { atlas = new Image(); atlas.src = sheet.src; atlases.set(sheet.src, atlas); }
  if (!atlas.complete || !atlas.naturalWidth) return false;
  const cellWidth = atlas.naturalWidth / 4, cellHeight = atlas.naturalHeight / sheet.rows.length;
  let sizing = metrics.get(type);
  if (!sizing) {
    const sample = document.createElement("canvas");
    sample.width = atlas.naturalWidth; sample.height = Math.ceil(cellHeight);
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return false;
    sampleCtx.drawImage(atlas, 0, row * cellHeight, atlas.naturalWidth, cellHeight, 0, 0, sample.width, sample.height);
    const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    const feet: number[] = [];
    let maxHeight = 1, maxWidth = 1;
    for (let frame = 0; frame < 4; frame++) {
      let top = sample.height, bottom = 0, left = cellWidth, right = 0;
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < cellWidth; x++) {
        if (pixels[(y * sample.width + Math.floor(frame * cellWidth + x)) * 4 + 3] > 128) {
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
          left = Math.min(left, x); right = Math.max(right, x + 1);
        }
      }
      feet.push(bottom);
      maxHeight = Math.max(maxHeight, bottom - top); maxWidth = Math.max(maxWidth, right - left);
    }
    sizing = { feet, scale: Math.min(sheet.heights[row] / maxHeight, 78 / maxWidth) };
    metrics.set(type, sizing);
  }
  // Neutral passing pose and two steps form a relaxed one-second walk loop.
  const walkFrames = [0, 1, 0, 2];
  const frame = strike > 0.1 ? 3 : moving ? walkFrames[Math.floor(time * 4) % 4] : 0;
  ctx.save();
  ctx.fillStyle = "#2b241c44";
  ctx.beginPath(); ctx.ellipse(0, 0, type === "plant" ? 15 : 21, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(atlas, frame * cellWidth, row * cellHeight, cellWidth, cellHeight,
    -cellWidth * sizing.scale / 2, -sizing.feet[frame] * sizing.scale,
    cellWidth * sizing.scale, cellHeight * sizing.scale);
  ctx.restore();
  return true;
}
