import { weaponDetails, type WeaponType } from "@/lib/character";
import { useSyncExternalStore } from "react";

const looks: Record<WeaponType, { coat: string; trim: string; hair: string; skin: string }> = {
  glaive: { coat: "#426b68", trim: "#ddca83", hair: "#6d4230", skin: "#dab08a" },
  "ice-staff": { coat: "#416b9b", trim: "#ade7f0", hair: "#dbe7f4", skin: "#c99879" },
  "dual-axe": { coat: "#743e49", trim: "#cdad7b", hair: "#342a33", skin: "#a97759" },
  "sword-and-shield": { coat: "#829db3", trim: "#e9ca79", hair: "#664838", skin: "#dba982" },
  bow: { coat: "#447357", trim: "#c6dc8c", hair: "#a5673c", skin: "#ecc39d" },
  wand: { coat: "#e9e4d5", trim: "#67c9bf", hair: "#e6c779", skin: "#a77258" },
  staff: { coat: "#5b4586", trim: "#ffb361", hair: "#e5dce7", skin: "#d3a786" },
  book: { coat: "#294e80", trim: "#d6c27d", hair: "#382d44", skin: "#e2b18c" },
  spear: { coat: "#3d8089", trim: "#e8c58a", hair: "#243a46", skin: "#b77c57" },
  axe: { coat: "#8b493b", trim: "#cdbb9d", hair: "#ad663a", skin: "#d5a078" },
  rifle: { coat: "#59634c", trim: "#d5b679", hair: "#423b36", skin: "#c28f6b" },
  "dual-gun": { coat: "#914f49", trim: "#f1c980", hair: "#ddd1ad", skin: "#9d694f" },
  "great-sword": { coat: "#454f73", trim: "#e3c489", hair: "#e6e0d0", skin: "#d7a887" },
  "dual-knife": { coat: "#37384e", trim: "#bc8fd5", hair: "#242738", skin: "#b78267" },
};
const paths = new Map<WeaponType, Path2D>();
const spriteProfiles: Partial<Record<WeaponType, { src: string; bounds: number[][] }>> = {
  "dual-axe": { src: "/optimized/sprites/jeffrey-chibi-v1.3268cce34412.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  "ice-staff": { src: "/optimized/sprites/juan-chibi-v1.e22c9c0809fe.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  glaive: { src: "/optimized/sprites/kent-chibi-v1.f7d03e7578e0.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  "sword-and-shield": { src: "/optimized/sprites/sword-and-shield-chibi-v1.c17358d4cc72.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  wand: { src: "/optimized/sprites/wand-chibi-v1.38d19ff1240f.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  axe: { src: "/optimized/sprites/axe-chibi-v1.b11d7f93005f.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  spear: { src: "/optimized/sprites/spear-chibi-v2.9f0af6601265.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  rifle: { src: "/optimized/sprites/rifle-chibi-v1.6560b4ea9a1e.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  staff: { src: "/optimized/sprites/staff-chibi-v1.74b996c15558.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  book: { src: "/optimized/sprites/book-chibi-v1.858bdd0c2b65.webp", bounds: [[0, 0.23], [0.23, 0.46], [0.46, 0.695], [0.695, 1]] },
  bow: { src: "/optimized/sprites/bow-ranger-v1.a81d2a729638.webp", bounds: [[0.025, 0.19], [0.255, 0.44], [0.49, 0.67], [0.695, 1]] },
  "dual-knife": { src: "/optimized/sprites/assassin-moe-walk-sheet.efc8af484f44.webp", bounds: [[0.025, 0.19], [0.27, 0.44], [0.505, 0.67], [0.705, 1]] },
  "great-sword": { src: "/optimized/sprites/greatsword-v1.76a3b12a5290.webp", bounds: [[0.025, 0.19], [0.25, 0.445], [0.49, 0.65], [0.69, 1]] },
  "dual-gun": { src: "/optimized/sprites/dual-gun-v1.7b97534ad97b.webp", bounds: [[0.015, 0.20], [0.25, 0.445], [0.49, 0.675], [0.70, 1]] },
};
const sprites = new Map<WeaponType, HTMLImageElement>();
const footRows = new Map<string, number>();
const spriteListeners = new Set<() => void>();
let spriteRevision = 0;
const spriteSnapshot = () => spriteRevision;
const serverSpriteSnapshot = () => 0;
function subscribeSprites(listener: () => void) { spriteListeners.add(listener); return () => { spriteListeners.delete(listener); }; }
function spriteLoaded() { spriteRevision++; spriteListeners.forEach((listener) => listener()); }
export function useCharacterSprites() { return useSyncExternalStore(subscribeSprites, spriteSnapshot, serverSpriteSnapshot); }
function playableSprite(weapon: WeaponType, src: string) {
  if (typeof Image === "undefined") return null;
  let sprite = sprites.get(weapon);
  if (!sprite) { sprite = new Image(); sprite.onload = spriteLoaded; sprite.onerror = spriteLoaded; sprite.src = src; sprites.set(weapon, sprite); }
  return sprite.complete && sprite.naturalWidth > 0 ? sprite : null;
}

/** Feet at (0, 0), facing right. Shared by every canvas; stride and action animate the same design. */
export function drawCharacter(ctx: CanvasRenderingContext2D, weapon: WeaponType,
  { stride = 0, swing = 0, facing = 1, idle = 0 }: { stride?: number; swing?: number; facing?: number; idle?: number } = {}) {
  const profile = spriteProfiles[weapon];
  const sprite = profile ? playableSprite(weapon, profile.src) : null;
  if (sprite && profile) {
    const attacking = Math.abs(swing) > 0.05;
    // Include the neutral passing pose between the two matching walking poses.
    const frame = attacking ? 3 : Math.abs(stride) > 0.45 ? (stride > 0 ? 1 : 2) : 0;
    const bounds = profile.bounds[frame];
    const sourceX = Math.floor(bounds[0] * sprite.naturalWidth);
    const sourceWidth = Math.floor((bounds[1] - bounds[0]) * sprite.naturalWidth);
    const drawHeight = 78;
    const scale = drawHeight / sprite.naturalHeight;
    const drawWidth = sourceWidth * scale;
    // Align boots rather than transparent image padding with the floor.
    const frameKey = weapon + ":" + frame;
    let footRow = footRows.get(frameKey);
    if (footRow === undefined) {
      const sample = document.createElement("canvas");
      sample.width = sourceWidth; sample.height = sprite.naturalHeight;
      const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
      footRow = sprite.naturalHeight;
      if (sampleCtx) {
        sampleCtx.drawImage(sprite, sourceX, 0, sourceWidth, sprite.naturalHeight, 0, 0, sourceWidth, sprite.naturalHeight);
        const pixels = sampleCtx.getImageData(0, 0, sourceWidth, sprite.naturalHeight).data;
        rows: for (let y = sprite.naturalHeight - 1; y >= 0; y--) {
          for (let x = 0; x < sourceWidth; x++) {
            if (pixels[(y * sourceWidth + x) * 4 + 3] > 128) { footRow = y + 1; break rows; }
          }
        }
      }
      footRows.set(frameKey, footRow);
    }
    ctx.save(); ctx.scale(facing, 1);
    ctx.fillStyle = "#101c2955";
    ctx.beginPath(); ctx.ellipse(0, -1, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Breathe from the planted feet; the shadow above remains untransformed.
    ctx.transform(1 - idle * 0.003, 0, idle * 0.003, 1 + idle * 0.009, 0, 0);
    ctx.translate(attacking ? Math.abs(swing) * 5 : 0, 0);
    ctx.drawImage(sprite, sourceX, 0, sourceWidth, sprite.naturalHeight,
      -drawWidth / 2, -footRow * scale, drawWidth, drawHeight);
    ctx.restore();
    return;
  }
  const style = looks[weapon];
  const robe = ["wand", "staff", "book", "ice-staff"].includes(weapon);
  const heavy = ["sword-and-shield", "great-sword", "axe", "dual-axe"].includes(weapon);
  const rect = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const shape = (points: number[][], color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  };
  ctx.save(); ctx.scale(facing, 1); ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.fillStyle = "#101c2955"; ctx.beginPath(); ctx.ellipse(0, -1, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.transform(1 - idle * 0.003, 0, idle * 0.003, 1 + idle * 0.009, 0, 0);
  // Class-specific capes, quivers and coat tails make silhouettes readable at battle scale.
  if (["great-sword", "sword-and-shield", "staff", "book"].includes(weapon))
    shape([[-11, -34], [-21 - stride * 2, -6], [-5, -10], [5, -32]], weapon === "great-sword" ? "#a44351" : weapon === "sword-and-shield" ? "#314b79" : "#302b53");
  if (weapon === "bow") {
    rect(-17, -37, 9, 25, "#775337");
    for (let i = 0; i < 3; i++) { rect(-17 + i * 3, -48, 1, 18, "#dbc792"); rect(-18 + i * 3, -48, 3, 5, "#d8e5bc"); }
  }
  for (const leg of [-1, 1]) {
    ctx.save(); ctx.translate(leg * 6, -13); ctx.rotate(stride * leg * 0.5);
    rect(-4, 0, 8, 13, heavy ? "#536575" : "#29323e"); rect(-4, 9, 11, 5, "#20252f"); ctx.restore();
  }
  if (robe) { shape([[-11, -33], [11, -33], [17, -4], [-16, -4]], style.coat); rect(-13, -8, 28, 4, style.trim); }
  else { rect(-12, -33, 25, 23, style.coat); rect(-12, -14, 25, 4, "#44382f"); rect(-2, -14, 5, 4, style.trim); }
  rect(-2, -32, 4, robe ? 25 : 17, style.trim);
  if (heavy) { rect(-17, -33, 12, 8, style.trim); rect(7, -33, 12, 8, style.trim); rect(-9, -24, 18, 8, weapon === "axe" ? "#b68b66" : "#b0bfca"); }
  rect(-9, -49, 19, 18, style.skin); rect(-10, -50, 21, 6, style.hair); rect(-10, -47, 5, 14, style.hair);
  rect(5, -41, 3, 3, "#232a36");
  switch (weapon) {
    case "sword-and-shield":
      rect(-12, -52, 25, 7, "#b4c6ce"); rect(-13, -45, 6, 11, "#829db3"); rect(-2, -53, 4, 17, style.trim); rect(-2, -60, 5, 8, "#bd4b55"); break;
    case "bow":
      shape([[-14, -46], [-7, -59], [12, -46]], style.coat); rect(-14, -46, 29, 4, style.trim);
      shape([[3, -53], [13, -65], [12, -51]], "#e8e7b5"); break;
    case "wand":
      rect(-11, -51, 24, 5, "#f7f0d6"); rect(-3, -55, 7, 8, style.trim); rect(-1, -54, 3, 6, "#f7f0d6");
      rect(-8, -35, 17, 6, "#fbf5df"); break;
    case "ice-staff":
    case "staff":
      shape([[-17, -47], [-4, -71], [8, -52], [16, -47]], style.coat); rect(-19, -48, 38, 5, style.trim);
      rect(-8, -33, 17, 7, "#e5dce7"); rect(-5, -27, 10, 4, "#e5dce7"); break;
    case "book":
      rect(-12, -54, 26, 6, style.coat); rect(-16, -56, 34, 3, style.trim); rect(10, -54, 2, 15, style.trim);
      ctx.strokeStyle = style.trim; ctx.lineWidth = 1.5; ctx.strokeRect(-2, -43, 7, 6); ctx.strokeRect(7, -43, 7, 6); break;
    case "glaive":
      rect(-12, -50, 25, 5, style.coat); rect(-13, -46, 28, 3, style.trim);
      shape([[-12, -47], [-25, -41], [-23, -36], [-10, -43]], style.trim); break;
    case "spear":
      rect(-12, -53, 24, 8, "#9ab4b9"); shape([[-5, -53], [-1, -67], [6, -53]], "#c85a4f");
      rect(-12, -34, 25, 5, style.trim); break;
    case "dual-axe":
    case "axe":
      rect(-12, -52, 25, 7, "#655b53"); shape([[-12, -50], [-23, -58], [-20, -45], [-12, -42]], style.trim);
      shape([[12, -50], [23, -58], [20, -45], [12, -42]], style.trim);
      shape([[-7, -35], [10, -35], [4, -23], [-6, -29]], style.hair); break;
    case "rifle":
      rect(-12, -55, 24, 10, style.coat); rect(-14, -46, 31, 4, "#2f3934"); rect(1, -44, 13, 6, "#bc9c67");
      shape([[-11, -33], [-3, -34], [10, -12], [2, -10]], "#b8a078"); break;
    case "dual-gun":
      shape([[-14, -48], [-11, -59], [8, -59], [13, -48]], "#694833"); rect(-21, -49, 43, 5, style.trim);
      rect(-12, -34, 25, 6, "#d5ab68"); rect(-16, -17, 7, 13, "#594439"); rect(10, -17, 7, 13, "#594439"); break;
    case "great-sword":
      shape([[-10, -49], [-8, -58], [2, -54], [13, -58], [9, -44]], style.hair);
      rect(-13, -36, 27, 6, style.trim); rect(-7, -28, 15, 12, "#7382a1"); break;
    case "dual-knife":
      shape([[-14, -34], [-14, -49], [-5, -59], [10, -53], [14, -42], [8, -45], [-6, -45], [-7, -33]], style.coat);
      rect(-8, -37, 20, 8, "#4c435f"); rect(-11, -33, 24, 4, style.trim);
      shape([[-10, -32], [-27 - stride * 3, -25], [-21, -20], [-8, -28]], style.trim); break;
  }
  ctx.save(); ctx.translate(-11, -28); ctx.rotate(-stride * 0.4);
  rect(-4, 0, 7, 15, style.coat); rect(-4, 11, 7, 5, heavy ? style.trim : style.skin); ctx.restore();
  ctx.save(); ctx.translate(11, -31); ctx.rotate(swing * 1.2 + stride * 0.1);
  rect(-3, 0, 8, 13, style.coat); rect(0, 9, 7, 5, style.skin);
  let path = paths.get(weapon); if (!path) { path = new Path2D(weaponDetails(weapon).path); paths.set(weapon, path); }
  ctx.translate(2, -14); ctx.scale(0.55, 0.55);
  ctx.strokeStyle = "#1c2736"; ctx.lineWidth = 7; ctx.stroke(path);
  ctx.strokeStyle = ["wand", "staff", "book", "ice-staff"].includes(weapon) ? style.trim : "#dce5e6"; ctx.lineWidth = 3.5; ctx.stroke(path);
  ctx.restore(); ctx.restore();
}
