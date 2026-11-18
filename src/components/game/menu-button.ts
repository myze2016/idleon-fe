import { infoBoxSkin } from "./info-box-skins";

/** Leather action surface, distinct from parchment information panels. */
export function drawMenuButton(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, active = false, disabled = false) {
  ctx.save();
  const face = ctx.createLinearGradient(0, y, 0, y + height);
  face.addColorStop(0, disabled ? "#8a7860" : active ? "#a27741" : "#886036");
  face.addColorStop(1, disabled ? "#6c5c49" : "#51331e");
  ctx.shadowColor = "#38231255"; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 6);
  ctx.fillStyle = face; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = active ? "#ffe2a1" : "#4e301b"; ctx.lineWidth = active ? 3 : 2; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, width - 8, height - 8, 3);
  ctx.strokeStyle = "#d7b17588"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

/** A quiet information surface using the same inset frame as menu actions. */
export function drawMenuInfo(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, active = false) {
  const tier = Number(ctx.canvas.closest<HTMLElement>("[data-donation-tier]")?.dataset.donationTier ?? 0);
  const skin = infoBoxSkin(tier);
  ctx.save();
  const face = ctx.createLinearGradient(0, y, 0, y + height);
  face.addColorStop(0, skin.top); face.addColorStop(1, skin.bottom);
  ctx.shadowColor = skin.shadow; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 6);
  ctx.fillStyle = face; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = active ? skin.active : skin.border; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, width - 8, height - 8, 3);
  ctx.strokeStyle = active ? skin.active : skin.inset; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
