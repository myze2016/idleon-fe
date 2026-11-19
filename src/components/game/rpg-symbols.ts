import { useSyncExternalStore } from "react";

const order = [
  "sword-and-shield", "bow", "wand", "staff", "book",
  "spear", "axe", "rifle", "dual-gun", "great-sword",
  "dual-knife", "glaive", "ice-staff", "dual-axe", "meadow",
  "forest", "garnaland", "harbor", "tourney", "deepsea",
  "deepsea-2f", "deepsea-palace", "city",
];
let atlas: HTMLImageElement | undefined;
let version = 0;
const listeners = new Set<() => void>();
const snapshot = () => version;
const serverSnapshot = () => 0;
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useRpgSymbols() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

export function drawRpgSymbol(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number) {
  if (typeof Image === "undefined") return false;
  if (!atlas) {
    atlas = new Image();
    atlas.onload = () => { version++; listeners.forEach((listener) => listener()); };
    atlas.src = "/optimized/ui/rpg-symbols-v1.b3ed7adafa53.webp";
  }
  const index = order.indexOf(id);
  if (index < 0 || !atlas.complete || !atlas.naturalWidth) return false;
  const w = atlas.naturalWidth / 5, h = atlas.naturalHeight / 5;
  ctx.drawImage(atlas, index % 5 * w, Math.floor(index / 5) * h, w, h, x, y, size, size);
  return true;
}
