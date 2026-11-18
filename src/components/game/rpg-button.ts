const iconOrder = ["character", "shop", "artifacts", "inventory", "team", "wish", "wiki", "pvp", "menu", "map", "start", "close"];
const extraPaths: Record<string, string> = { donation: "/ui/support-icon-v1.png", "patch-notes": "/ui/patch-notes-icon-v1.png" };
const extraIcons = new Map<string, HTMLImageElement>();

/** Unframed adventure icons with labels below and a warm focus glow. */
export function drawRpgButton(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement,
  id: string, label: string, x: number, y: number, width: number, height: number,
  active = false) {
  ctx.save();
  const index = iconOrder.indexOf(id);
  let image = atlas;
  const extra = Object.hasOwn(extraPaths, id);
  if (extra) {
    let icon = extraIcons.get(id);
    if (!icon) { icon = new Image(); icon.src = extraPaths[id]; extraIcons.set(id, icon); }
    image = icon;
  }
  if (image.complete && image.naturalWidth > 0 && (index >= 0 || extra)) {
    const cellWidth = image.naturalWidth / (extra ? 1 : 4), cellHeight = image.naturalHeight / (extra ? 1 : 3);
    const size = Math.min(width - 8, height - 20) * (active ? 1.06 : 1);
    ctx.shadowColor = active ? "#ffd67a" : "#24180e99";
    ctx.shadowBlur = active ? 12 : 3; ctx.shadowOffsetY = active ? 0 : 2;
    ctx.drawImage(image, extra ? 0 : index % 4 * cellWidth, extra ? 0 : Math.floor(index / 4) * cellHeight,
      cellWidth, cellHeight, x + (width - size) / 2, y + (height - 20 - size) / 2, size, size);
  }
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = "bold 12px Georgia, serif";
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#392313";
  ctx.strokeText(label, x + width / 2, y + height - 5, width - 4);
  ctx.fillStyle = active ? "#ffe6a2" : "#fff2ce";
  ctx.fillText(label, x + width / 2, y + height - 5, width - 4);
  ctx.restore();
}
