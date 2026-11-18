import { useSyncExternalStore } from "react";

type Currency = "wish" | "gold";
const images = new Map<Currency, HTMLImageElement>();
const listeners = new Set<() => void>();
let version = 0;
const snapshot = () => version;
const serverSnapshot = () => 0;
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useCurrencyArt() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

export function drawCurrencyIcon(ctx: CanvasRenderingContext2D, kind: Currency, x: number, y: number, size = 24) {
  if (typeof Image === "undefined") return;
  let image = images.get(kind);
  if (!image) {
    image = new Image();
    image.onload = () => { version++; listeners.forEach((listener) => listener()); };
    image.src = `/ui/currency-${kind}-v2.png`;
    images.set(kind, image);
  }
  if (image.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, size, size);
}

export function drawCurrencyBadge(ctx: CanvasRenderingContext2D, kind: Currency, amount: number, x: number, y: number, width = 216, height = width / 3) {
  if (typeof Image === "undefined") return;
  ctx.save();
  const gold = kind === "gold", top = y + height * .1, panelHeight = height * .8;
  const face = ctx.createLinearGradient(0, top, 0, top + panelHeight);
  face.addColorStop(0, gold ? "#34312d" : "#292e43"); face.addColorStop(1, "#161c26");
  ctx.fillStyle = face; ctx.strokeStyle = gold ? "#bc9650" : "#8196d4"; ctx.lineWidth = 1.25;
  ctx.shadowColor = "#10131b55"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.roundRect(x + 3, top, width - 6, panelHeight, Math.min(14, panelHeight * .3)); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.stroke();
  ctx.strokeStyle = "#ffffff12";
  ctx.beginPath(); ctx.roundRect(x + 6, top + 3, width - 12, panelHeight - 6, Math.min(11, panelHeight * .25)); ctx.stroke();
  const iconCenterX = x + height * .47, iconCenterY = y + height / 2;
  ctx.fillStyle = gold ? "#584323" : "#303c63";
  ctx.beginPath(); ctx.arc(iconCenterX, iconCenterY, height * .3, 0, Math.PI * 2); ctx.fill();
  const iconSize = height * .66;
  drawCurrencyIcon(ctx, kind, iconCenterX - iconSize / 2, iconCenterY - iconSize / 2, iconSize);
  const textX = x + height * .9, textWidth = width - height * .9 - 14;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = gold ? "#cdb689" : "#aabbe9";
  ctx.font = `600 ${Math.max(8, Math.min(10, height * .15))}px system-ui`;
  ctx.fillText(gold ? "GOLD" : "WISHES", textX, y + height * .34, textWidth);
  const label = amount.toLocaleString();
  let fontSize = Math.max(12, Math.min(23, height * .33));
  ctx.font = `700 ${fontSize}px ui-monospace, monospace`;
  while (fontSize > 10 && ctx.measureText(label).width > textWidth) ctx.font = `700 ${--fontSize}px ui-monospace, monospace`;
  ctx.fillStyle = gold ? "#ffe6a3" : "#e7eeff";
  ctx.fillText(label, textX, y + height * .64, textWidth);
  ctx.restore();
}
