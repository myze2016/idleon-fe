let paperArt: HTMLImageElement | undefined;
function artwork() {
  if (!paperArt && typeof Image !== "undefined") {
    paperArt = new Image();
    paperArt.onload = () => window.dispatchEvent(new Event("paper-art-ready"));
    paperArt.src = "/ui/parchment-panel-v1.png";
  }
  return paperArt;
}

/** Generated parchment with nine-slice corners; drawn paper while loading. */
export function drawPaperPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const image = artwork();
  if (image?.complete && image.naturalWidth > 0) {
    const sx = image.naturalWidth * 0.12, sy = image.naturalHeight * 0.12;
    const edge = Math.min(18, width / 3, height / 3);
    const sourceX = [0, sx, image.naturalWidth - sx, image.naturalWidth];
    const sourceY = [0, sy, image.naturalHeight - sy, image.naturalHeight];
    const destX = [x, x + edge, x + width - edge, x + width];
    const destY = [y, y + edge, y + height - edge, y + height];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      ctx.drawImage(image, sourceX[col], sourceY[row], sourceX[col + 1] - sourceX[col], sourceY[row + 1] - sourceY[row],
        destX[col], destY[row], destX[col + 1] - destX[col], destY[row + 1] - destY[row]);
    }
    return;
  }
  ctx.save();
  ctx.shadowColor = "#39271855"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  const paper = ctx.createLinearGradient(0, y, 0, y + height);
  paper.addColorStop(0, "#efdfb8"); paper.addColorStop(0.5, "#e9d4a7"); paper.addColorStop(1, "#d9bd8a");
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 4);
  ctx.fillStyle = paper; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#99754c"; ctx.lineWidth = 1.5; ctx.stroke();
  if (height > 12) {
    ctx.strokeStyle = "#b8956355"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);
    for (let row = 9; row < height - 6; row += 11) {
      for (let col = 10 + row % 7; col < width - 8; col += 23) {
        ctx.fillStyle = "#8c65351a"; ctx.fillRect(x + col, y + row, 2, 0.7);
      }
    }
  }
  ctx.restore();
}
