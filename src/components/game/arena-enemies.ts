import { drawMonster } from "./meadow-monsters";

export function drawArenaEnemy(ctx: CanvasRenderingContext2D, type: string, time: number, moving: boolean, swing: number, facing: number) {
  ctx.save(); ctx.scale(facing, 1);
  if (drawMonster(ctx, type, time, moving, swing)) { ctx.restore(); return; }
  // Keep a visible silhouette while local sprite atlases load.
  ctx.fillStyle = "#579787"; ctx.beginPath(); ctx.ellipse(0, -24, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff0cc"; ctx.fillRect(6, -34, 4, 4);
  ctx.restore();
}
