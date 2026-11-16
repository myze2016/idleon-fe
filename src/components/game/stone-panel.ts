/** Matte carved sandstone with a recessed border and four bronze fasteners. */
export function drawStonePanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.shadowColor = "#35261966"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 6);
  ctx.fillStyle = "#967b5c"; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#614c37"; ctx.stroke();
  const face = ctx.createLinearGradient(0, y, 0, y + height);
  face.addColorStop(0, "#d7c3a3"); face.addColorStop(1, "#c5ad88");
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, width - 8, height - 8, 3);
  ctx.fillStyle = face; ctx.fill(); ctx.lineWidth = 1;
  ctx.strokeStyle = "#ead7b5"; ctx.stroke();
  // Sparse fixed mineral flecks, without brushed-metal lines or reflections.
  for (let row = 9; row < height - 7; row += 9) {
    for (let col = 12 + (row % 3) * 3; col < width - 8; col += 17) {
      ctx.fillStyle = (col + row) % 2 ? "#71543716" : "#fff3da25";
      ctx.fillRect(x + col, y + row, 1.5, 1);
    }
  }
  // Small incised corner marks give the stone frame an illustrated RPG finish.
  ctx.strokeStyle = "#7d644955";
  ctx.beginPath(); ctx.moveTo(x + 15, y + 5); ctx.lineTo(x + 18, y + 8);
  ctx.moveTo(x + width - 16, y + height - 5); ctx.lineTo(x + width - 19, y + height - 8); ctx.stroke();
  for (const dx of [9, width - 9]) for (const dy of [9, height - 9]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#947044"; ctx.fill(); ctx.strokeStyle = "#60482e"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx - 1.2, y + dy + 0.7); ctx.lineTo(x + dx + 1.2, y + dy - 0.7);
    ctx.stroke();
  }
  ctx.restore();
}
