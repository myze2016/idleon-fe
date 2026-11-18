/** Seat anchors match the painted occupied benches, avoiding the stair aisles. */
const seats = [0.20, 0.23, 0.26, 0.29, 0.32, 0.35, 0.38, 0.41, 0.44, 0.56, 0.59, 0.62, 0.65, 0.68, 0.71, 0.74, 0.77, 0.80];
export function tourneySpectatorPlacement(width: number, height: number, distance: number, crowdOffset: number, aspect = 1.5) {
  const tileWidth = Math.max(width, height * aspect);
  const startDistance = distance - crowdOffset;
  const firstTile = Math.floor(startDistance / tileWidth);
  let seatWorldX = 0, best = Infinity;
  for (let tile = firstTile; tile <= firstTile + 1; tile++) for (const seat of seats) {
    const worldX = (tile + (tile % 2 ? 1 - seat : seat)) * tileWidth;
    const screenX = worldX - startDistance;
    if (screenX < 24 || screenX > width - 24) continue;
    const score = Math.abs(screenX - width * 0.82);
    if (score < best) { best = score; seatWorldX = worldX; }
  }
  return { x: seatWorldX - distance, baseline: height * 0.78 * 0.60 / 0.75,
    height: Math.max(24, Math.min(76, height * 0.07)) };
}
