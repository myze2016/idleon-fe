import { drawMonster } from "./meadow-monsters";

const cells: Record<string, number> = { "fishpeople-guard": 0, "fishpeople-archer": 1, "fishpeople-rider": 2, "fishpeople-guardian": 3, baracudon: 5, "fishpeople-cleric": 6, "fishpeople-researcher": 7, "fishpeople-knight": 8, "fishpeople-rifler": 9, "fishpeople-baron": 10, "fishpeople-lord": 11 };
let atlas: HTMLImageElement | undefined;
const feet = new Map<number, number>();
export function drawArenaEnemy(ctx: CanvasRenderingContext2D, type: string, time: number, moving: boolean, swing: number, facing: number) {
  ctx.save(); ctx.scale(facing, 1);
  if (cells[type] !== undefined) {
    if (!atlas) { atlas = new Image(); atlas.src = "/optimized/sprites/deepsea-enemies-simple-v2.805283925014.webp"; }
    if (atlas.complete && atlas.naturalWidth) {
      const cell = cells[type], cw = atlas.naturalWidth / 4, ch = atlas.naturalHeight / 3;
      if (!feet.has(cell)) {
        const sample = document.createElement("canvas"); sample.width = Math.ceil(cw); sample.height = Math.ceil(ch);
        const context = sample.getContext("2d", { willReadFrequently: true }); let foot = ch;
        if (context) {
          context.drawImage(atlas, cell % 4 * cw, Math.floor(cell / 4) * ch, cw, ch, 0, 0, sample.width, sample.height);
          const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
          outer: for (let y = sample.height - 1; y >= 0; y--) { let solid = 0; for (let x = 0; x < sample.width; x++) if (pixels[(y * sample.width + x) * 4 + 3] > 180) solid++; if (solid >= 4) { foot = (y + 1) / sample.height * ch; break outer; } }
        }
        feet.set(cell, foot);
      }
      const bob = moving ? Math.sin(time * 8) * 2 : 0;
      ctx.drawImage(atlas, cell % 4 * cw, Math.floor(cell / 4) * ch, cw, ch, -40 + swing * 4, -feet.get(cell)! / ch * 78 + bob, 80, 78);
      ctx.restore(); return;
    }
  } else if (drawMonster(ctx, type, time, moving, swing)) { ctx.restore(); return; }
  // Keep a visible silhouette while local sprite atlases load.
  ctx.fillStyle = "#579787"; ctx.beginPath(); ctx.ellipse(0, -24, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff0cc"; ctx.fillRect(6, -34, 4, 4);
  ctx.restore();
}
