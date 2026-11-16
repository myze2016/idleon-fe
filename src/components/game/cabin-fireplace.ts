/** Painted flame shapes inside the cabin artwork's hearth; no extra sprite sheet. */
export function drawCabinFireplace(ctx: CanvasRenderingContext2D, width: number, wall: number, time: number) {
  const t = time / 1000;
  ctx.save();
  ctx.translate(width * 0.772, wall * 0.887);
  ctx.scale(width * 0.09, wall * 0.25);
  const glow = ctx.createRadialGradient(0, -0.3, 0, 0, -0.3, 1.35);
  glow.addColorStop(0, "#ffad3655"); glow.addColorStop(1, "#e88b1800");
  ctx.fillStyle = glow; ctx.fillRect(-1.5, -1.8, 3, 2.6);
  ctx.lineCap = "round"; ctx.lineWidth = 0.11;
  ctx.strokeStyle = "#67402b";
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-0.38, side * 0.04 - 0.03);
    ctx.lineTo(0.38, -side * 0.04 - 0.03); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.15;
    const tall = 0.48 + (i % 2) * 0.18 + Math.sin(t * 4 + i * 1.8) * 0.09;
    const sway = Math.sin(t * 3 + i) * 0.065;
    const flame = ctx.createLinearGradient(0, 0, 0, -tall);
    flame.addColorStop(0, "#df6b22"); flame.addColorStop(0.5, "#f5a53e"); flame.addColorStop(1, "#ffdc7c");
    ctx.fillStyle = flame;
    ctx.beginPath(); ctx.moveTo(x - 0.12, -0.05);
    ctx.bezierCurveTo(x - 0.24, -tall * 0.42, x + sway - 0.02, -tall * 0.65, x + sway, -tall);
    ctx.bezierCurveTo(x + 0.03, -tall * 0.5, x + 0.25, -tall * 0.25, x + 0.12, -0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffe2a1";
    ctx.beginPath(); ctx.ellipse(x, -0.13, 0.05, tall * 0.18, sway, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
