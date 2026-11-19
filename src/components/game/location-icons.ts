import { drawRpgSymbol } from "./rpg-symbols";

// Geometric fallbacks remain visible while the symbol sheet loads.
const shapes: Record<string, string> = {
  meadow: "M5 55 23 27 37 46 46 33 61 55ZM48 33V17h5v16M43 22h15v5H43Z",
  forest: "M3 43 17 9 31 43H21v14h-8V43ZM29 46 45 3 61 46H49v12h-8V46Z",
  garnaland: "M5 30a17 17 0 0 1 34 0H27v27H17V30ZM35 39a13 13 0 0 1 26 0H52v18h-8V39Z",
  harbor: "M7 40h50L46 55H18ZM29 7h5v30h-5ZM38 11l18 23H38ZM25 16 10 34h15Z",
  tourney: "M15 7h34v18a17 17 0 0 1-34 0ZM5 13h7v18l9 7-4 6L5 34ZM52 13h7v21L47 44l-4-6 9-7ZM28 42h8v9h12v7H16v-7h12Z",
  deepsea: "M5 12c10-10 18 10 28 0s18 10 26 0v8c-8 10-16-10-26 0S15 10 5 20ZM5 32c10-10 18 10 28 0s18 10 26 0v8c-8 10-16-10-26 0S15 30 5 40ZM27 44h10v8h9L32 64 18 52h9Z",
  "deepsea-2f": "M5 10c10-10 18 10 28 0s18 10 26 0v8c-8 10-16-10-26 0S15 8 5 18ZM27 24h10v12h10L32 49 17 36h10ZM17 49l15 12 15-12v8L32 69 17 57Z",
  "deepsea-palace": "M5 19h8v8h7v-8h8v39H5ZM36 19h8v8h7v-8h8v39H36ZM25 17l7-13 7 13ZM28 22h8v36h-8Z",
  city: "M3 30 18 15 33 30H28v28H8V30ZM36 17h8V7h7v10h9v41H36Z",
};
const paths = new Map<string, Path2D>();
export function drawLocationIcon(ctx: CanvasRenderingContext2D, location: string, x: number, y: number, size = 28) {
  if (drawRpgSymbol(ctx, location, x, y, size)) return;
  const shape = shapes[location];
  if (!shape) return;
  let path = paths.get(location);
  if (!path) { path = new Path2D(shape); paths.set(location, path); }
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 72, size / 72);
  ctx.fillStyle = "#74777b"; ctx.fill(path); ctx.restore();
}
