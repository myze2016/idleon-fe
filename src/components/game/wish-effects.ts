/** Frame-rate independent summon VFX. The generated seal is optional while loading. */
export function drawWishEffect(ctx: CanvasRenderingContext2D, seal: HTMLImageElement, x: number, y: number, radius: number, seconds: number, special: boolean, reveal: number | null, reduced: boolean) {
  const t = reduced ? 1 : seconds;
  const color = special ? "#d7b1ff" : "#ffe3a0";
  ctx.save(); ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.4);
  glow.addColorStop(0, special ? "#b484efaa" : "#ffe8afaa"); glow.addColorStop(.5, special ? "#7547b755" : "#dca64b55"); glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow; ctx.fillRect(-radius * 1.4, -radius * 1.4, radius * 2.8, radius * 2.8);
  ctx.save(); ctx.rotate(reduced ? 0 : t * (special ? -.45 : .3));
  const size = radius * (reduced ? 2 : 2 + Math.sin(t * 3) * .07);
  if (seal.complete && seal.naturalWidth) {
    if (special) ctx.filter = "hue-rotate(205deg) saturate(1.25)";
    ctx.drawImage(seal, -size / 2, -size / 2, size, size); ctx.filter = "none";
  } else {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (const scale of [.7, 1]) { ctx.beginPath(); ctx.arc(0, 0, radius * scale, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  ctx.fillStyle = color;
  for (let i = 0; i < (special ? 28 : 18); i++) {
    const angle = i * 2.39996 + t * .7, orbit = radius * (.45 + ((i * .137 + t * .12) % .8));
    const px = Math.cos(angle) * orbit, py = Math.sin(angle) * orbit * .65;
    const sparkle = 1.5 + Math.sin(t * 4 + i) ** 2 * 2;
    ctx.globalAlpha = .4 + Math.sin(t * 2 + i) ** 2 * .6;
    ctx.fillRect(px - sparkle, py - .7, sparkle * 2, 1.4); ctx.fillRect(px - .7, py - sparkle, 1.4, sparkle * 2);
  }
  ctx.globalAlpha = 1;
  if (reveal !== null && !reduced && reveal < .8) {
    ctx.strokeStyle = color; ctx.lineWidth = 5 * (1 - reveal / .8); ctx.globalAlpha = 1 - reveal / .8;
    ctx.beginPath(); ctx.arc(0, 0, radius * (.5 + reveal * 1.8), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
