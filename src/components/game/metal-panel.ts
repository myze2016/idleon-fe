/** Beveled fantasy steel plate with four slotted corner screws. */
export function drawMetalPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  const rim = ctx.createLinearGradient(x, y, x + width * 0.25, y + height);
  rim.addColorStop(0, "#f1e9d8"); rim.addColorStop(0.22, "#a9a79e");
  rim.addColorStop(0.5, "#666b6c"); rim.addColorStop(0.8, "#b8b8ab"); rim.addColorStop(1, "#51575b");
  ctx.shadowColor = "#16120e99"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 7);
  ctx.fillStyle = rim; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1; ctx.strokeStyle = "#353b3e"; ctx.stroke();
  const face = ctx.createLinearGradient(0, y, 0, y + height);
  face.addColorStop(0, "#626c71"); face.addColorStop(0.18, "#485358");
  face.addColorStop(0.55, "#354146"); face.addColorStop(1, "#414b4e");
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, width - 8, height - 8, 4);
  ctx.fillStyle = face; ctx.fill(); ctx.strokeStyle = "#222d32"; ctx.stroke();
  // Fine brushed highlights retain the illustrated finish rather than chrome.
  ctx.strokeStyle = "#d8e1dc0c";
  for (let row = 9; row < height - 6; row += 4) {
    ctx.beginPath(); ctx.moveTo(x + 8, y + row); ctx.lineTo(x + width - 8, y + row); ctx.stroke();
  }
  for (const dx of [9, width - 9]) for (const dy of [9, height - 9]) {
    const screw = ctx.createLinearGradient(0, y + dy - 3, 0, y + dy + 3);
    screw.addColorStop(0, "#f1e7cd"); screw.addColorStop(0.45, "#bcb7a5"); screw.addColorStop(1, "#777b78");
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2);
    ctx.fillStyle = screw; ctx.fill(); ctx.strokeStyle = "#283136"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx - 1.5, y + dy + 1); ctx.lineTo(x + dx + 1.5, y + dy - 1);
    ctx.strokeStyle = "#424b4d"; ctx.stroke();
  }
  ctx.restore();
}
