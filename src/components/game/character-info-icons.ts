import { type WeaponType, weaponDetails } from "@/lib/character";
import { drawCharacter } from "./character-design";
import { useSyncExternalStore } from "react";

const portraitOrder: WeaponType[] = ["sword-and-shield", "bow", "wand", "staff", "book", "spear", "axe", "rifle", "dual-gun", "great-sword", "dual-knife", "glaive", "ice-staff", "dual-axe"];
let portraits: HTMLImageElement | undefined;
let portraitVersion = 0;
const portraitListeners = new Set<() => void>();
const portraitSnapshot = () => portraitVersion;
const serverPortraitSnapshot = () => 0;
function subscribePortraits(listener: () => void) { portraitListeners.add(listener); return () => { portraitListeners.delete(listener); }; }
export function useCharacterPortraits() { return useSyncExternalStore(subscribePortraits, portraitSnapshot, serverPortraitSnapshot); }

const weaponPaths = new Map<WeaponType, Path2D>();
export function drawWeaponTypeIcon(ctx: CanvasRenderingContext2D, weapon: WeaponType, x: number, y: number, size = 18, color = "#805523") {
  let path = weaponPaths.get(weapon);
  if (!path) { path = new Path2D(weaponDetails(weapon).path); weaponPaths.set(weapon, path); }
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.stroke(path); ctx.restore();
}

export function drawCharacterInfoPortrait(ctx: CanvasRenderingContext2D, weapon: WeaponType, x: number, y: number, size = 40) {
  if (typeof Image === "undefined") return;
  if (!portraits) {
    portraits = new Image();
    portraits.onload = () => { portraitVersion++; portraitListeners.forEach((listener) => listener()); };
    portraits.src = "/ui/character-portraits-v2.png";
  }
  ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#d2b174"; ctx.fillRect(x, y, size, size);
  if (portraits.complete && portraits.naturalWidth > 0) {
    const index = portraitOrder.indexOf(weapon), cellWidth = portraits.naturalWidth / 4, cellHeight = portraits.naturalHeight / 4;
    ctx.drawImage(portraits, index % 4 * cellWidth + 3, Math.floor(index / 4) * cellHeight + 3, cellWidth - 6, cellHeight - 6, x, y, size, size);
  } else {
    const scale = size / 45;
    ctx.translate(x + size / 2, y + size / 2 + 58 * scale); ctx.scale(scale, scale);
    drawCharacter(ctx, weapon);
  }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = "#805b35"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
