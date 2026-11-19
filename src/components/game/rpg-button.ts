const iconOrder = ["character", "shop", "artifacts", "inventory", "team", "wish", "wiki", "pvp", "menu", "map", "start", "close"];
const extraPaths: Record<string, string> = { donation: "/optimized/ui/support-icon-v1.052ca2bebd49.webp", "patch-notes": "/optimized/ui/patch-notes-icon-v1.69b7ce79001a.webp", gathering: "/optimized/ui/gathering-icon-v1.cbd209196eb9.webp", endless: "/optimized/ui/endless-icon-v1.b5dd74f8320e.webp" };
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
  if (id === "endless" && !(image.complete && image.naturalWidth > 0)) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.min(width - 8, height - 20) * 1.3}px Georgia, serif`;
    ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "#53321d";
    ctx.strokeText("∞", x + width / 2, y + (height - 20) / 2, width - 8);
    ctx.fillStyle = active ? "#ffe6a2" : "#e9bc67";
    ctx.fillText("∞", x + width / 2, y + (height - 20) / 2, width - 8);
  }
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = "bold 12px Georgia, serif";
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#392313";
  ctx.strokeText(label, x + width / 2, y + height - 5, width - 4);
  ctx.fillStyle = active ? "#ffe6a2" : "#fff2ce";
  ctx.fillText(label, x + width / 2, y + height - 5, width - 4);
  ctx.restore();
}
