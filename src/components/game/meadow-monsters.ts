import { useSyncExternalStore } from "react";

interface MonsterSheet { src: string; rows: string[]; heights: number[]; rowBounds?: [number, number][]; area?: "harbor" | "deepsea" }
const assassinSrc = "/optimized/sprites/tourney-assassin-v3.webp";
const sheets: MonsterSheet[] = [
  { src: "/optimized/sprites/garnaland-enemies-v1.e342187f2734.webp", rows: ["mushroom-fighter", "mushroom-rager", "fairy", "mushroom-chicken", "mushroom-king"], heights: [44, 46, 42, 48, 56] },
  { src: "/optimized/sprites/tourney-enemies-v1.f113c0748f4b.webp", rows: ["gladiator", "spearman", "zugwang", "demon-prince"], heights: [60, 60, 62, 62] },
  { src: "/optimized/sprites/harbor-day-animation-v1.webp", rows: ["crab-day", "hermit", "starfish", "fishpeople-guide"], heights: [32, 38, 40, 52], area: "harbor" },
  { src: "/optimized/sprites/harbor-night-animation-v1.webp", rows: ["crab-night", "fishpeople-spearman", "fishpeople-hunter", "fishpeople-magos"], heights: [32, 50, 48, 52], area: "harbor" },
  { src: "/optimized/sprites/deepsea-watch-animation-v1.webp", rows: ["fishpeople-guard", "fishpeople-archer", "fishpeople-rider", "fishpeople-guardian"], heights: [61, 60, 58, 62], area: "deepsea" },
  { src: "/optimized/sprites/deepsea-reef-animation-v1.webp", rows: ["baracudon", "fishpeople-cleric", "fishpeople-researcher"], heights: [40, 61, 61], area: "deepsea" },
  { src: "/optimized/sprites/deepsea-palace-animation-v1.webp", rows: ["fishpeople-knight", "fishpeople-rifler", "fishpeople-baron", "fishpeople-lord"], heights: [63, 60, 61, 64], area: "deepsea" },
  { src: "/optimized/sprites/meadow-monsters-v1.274e92c35b16.webp", rows: ["boar", "slime", "plant", "mutant-boar"], heights: [42, 32, 50, 48] },
  // The chief's crown starts above the last third of this painted sheet.
  // Keep it out of the slinger crop and its automatic foot detection.
  { src: "/optimized/sprites/forest-monsters-v1.3048a91bf0ef.webp", rows: ["warrior", "slinger", "coco-klan-chief"], heights: [48, 46, 52], rowBounds: [[0, 1 / 3], [1 / 3, 5 / 8], [5 / 8, 1]] },
];
const atlases = new Map<string, HTMLImageElement>();
const listeners = new Set<() => void>();
let revision = 0;
const snapshot = () => revision;
const serverSnapshot = () => 0;
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function loaded() { revision++; listeners.forEach((listener) => listener()); }
export function useMonsterSprites() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
const metrics = new Map<string, { feet: number[]; scale: number }>();

function loadAtlas(src: string) {
  let atlas = atlases.get(src);
  if (!atlas) {
    atlas = new Image();
    atlas.decoding = "async";
    atlas.onload = loaded;
    atlas.onerror = loaded;
    atlas.src = src;
    atlases.set(src, atlas);
  }
  return atlas;
}

export function preloadMonsterSprites(location: string) {
  if (location === "tourney") loadAtlas(assassinSrc);
  const area = location.startsWith("deepsea") ? "deepsea" : location;
  for (const sheet of sheets) {
    if (sheet.area === area) loadAtlas(sheet.src);
  }
}

/** Returns false while loading so the original monster drawing remains available. */
export function drawMonster(ctx: CanvasRenderingContext2D, type: string, time: number, moving: boolean, strike: number) {
  if (type === "assassin") {
    const image = loadAtlas(assassinSrc);
    if (!image.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.fillStyle = "#2b241c44"; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(strike * 5, 0);
    ctx.rotate(strike * 0.12 + (moving ? Math.sin(time * 8) * 0.025 : 0));
    const width = 62 * image.naturalWidth / image.naturalHeight;
    ctx.drawImage(image, -width / 2, -62, width, 62);
    ctx.restore();
    return true;
  }
  const sheet = sheets.find((entry) => entry.rows.includes(type));
  if (!sheet) return false;
  const row = sheet.rows.indexOf(type);
  const atlas = loadAtlas(sheet.src);
  if (!atlas.complete || !atlas.naturalWidth) return false;
  const bounds = sheet.rowBounds?.[row] ?? [row / sheet.rows.length, (row + 1) / sheet.rows.length];
  const sourceY = bounds[0] * atlas.naturalHeight;
  const cellWidth = atlas.naturalWidth / 4, cellHeight = (bounds[1] - bounds[0]) * atlas.naturalHeight;
  let sizing = metrics.get(type);
  if (!sizing) {
    const sample = document.createElement("canvas");
    sample.width = atlas.naturalWidth; sample.height = Math.ceil(cellHeight);
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return false;
    sampleCtx.drawImage(atlas, 0, sourceY, atlas.naturalWidth, cellHeight, 0, 0, sample.width, sample.height);
    const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    const feet: number[] = [];
    let maxHeight = 1, maxWidth = 1;
    for (let frame = 0; frame < 4; frame++) {
      let top = sample.height, bottom = 0, left = cellWidth, right = 0;
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < cellWidth; x++) {
        if (pixels[(y * sample.width + Math.floor(frame * cellWidth + x)) * 4 + 3] > 128) {
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
          left = Math.min(left, x); right = Math.max(right, x + 1);
        }
      }
      // Ignore isolated opaque flecks below the character when anchoring feet.
      for (let y = bottom - 1; y >= top; y--) {
        let solid = 0;
        for (let x = 0; x < cellWidth; x++) if (pixels[(y * sample.width + Math.floor(frame * cellWidth + x)) * 4 + 3] > 180) solid++;
        if (solid >= 4) { bottom = y + 1; break; }
      }
      feet.push(bottom);
      maxHeight = Math.max(maxHeight, bottom - top); maxWidth = Math.max(maxWidth, right - left);
    }
    sizing = { feet, scale: Math.min(sheet.heights[row] / maxHeight, 78 / maxWidth) };
    metrics.set(type, sizing);
  }
  // Neutral passing pose and two steps form a relaxed one-second walk loop.
  const walkFrames = [0, 1, 0, 2];
  const frame = strike > 0.1 ? 3 : moving ? walkFrames[Math.floor(time * 4) % 4] : 0;
  ctx.save();
  ctx.fillStyle = "#2b241c44";
  ctx.beginPath(); ctx.ellipse(0, 0, type === "plant" ? 15 : 21, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(atlas, frame * cellWidth, sourceY, cellWidth, cellHeight,
    -cellWidth * sizing.scale / 2, -sizing.feet[frame] * sizing.scale,
    cellWidth * sizing.scale, cellHeight * sizing.scale);
  ctx.restore();
  return true;
}
