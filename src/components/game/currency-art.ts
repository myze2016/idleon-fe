import { useSyncExternalStore } from "react";
import { drawMenuInfo } from "./menu-button";
import { currencyImages } from "@/lib/currency-images";

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
    image.src = currencyImages[kind];
    images.set(kind, image);
  }
  if (image.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, size, size);
}

export function drawCurrencyBadge(ctx: CanvasRenderingContext2D, kind: Currency, amount: number, x: number, y: number, width = 216, height = width / 3) {
  if (typeof Image === "undefined") return;
  ctx.save();
  const gold = kind === "gold", top = y + height * .1, panelHeight = height * .8;
  drawMenuInfo(ctx, x + 3, top, width - 6, panelHeight);
  const iconCenterX = x + height * .47, iconCenterY = y + height / 2;
  const iconSize = height * .66;
  drawCurrencyIcon(ctx, kind, iconCenterX - iconSize / 2, iconCenterY - iconSize / 2, iconSize);
  const textX = x + height * .9, textWidth = width - height * .9 - 14;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#66513b";
  ctx.font = `600 ${Math.max(8, Math.min(10, height * .15))}px system-ui`;
  ctx.fillText(gold ? "GOLD" : "WISHES", textX, y + height * .34, textWidth);
  const label = amount.toLocaleString();
  let fontSize = Math.max(12, Math.min(23, height * .33));
  ctx.font = `700 ${fontSize}px ui-monospace, monospace`;
  while (fontSize > 10 && ctx.measureText(label).width > textWidth) ctx.font = `700 ${--fontSize}px ui-monospace, monospace`;
  ctx.fillStyle = "#43311f";
  ctx.fillText(label, textX, y + height * .64, textWidth);
  ctx.restore();
}
