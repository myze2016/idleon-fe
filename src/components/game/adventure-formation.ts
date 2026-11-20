/** Formation geometry shared by location adventure and Endless. */
export function adventureFormation(width: number, height: number, count: number) {
  const spacing = Math.min(68, width * 0.34 / Math.max(1, count - 1));
  const avatarScale = Math.max(0.55, Math.min(2, height / 300, spacing / 43));
  const home = (slot: number) => width * 0.16 + (count - 1 - slot) * spacing;
  return { spacing, avatarScale, home, leadingX: home(0),
    rangedReach: Math.min(width * 0.38, Math.max(150, avatarScale * 170)),
    contactReach: Math.max(38, avatarScale * 35) };
}

/** Place enemies ahead of the party, including old saved runs with bad positions. */
export function adventureEnemyPositions(front: number, reach: number, gap: number, enemies: { index: number; x: number }[]) {
  let previous = front + reach - gap;
  return [...enemies].sort((a, b) => a.x - b.x || a.index - b.index).map(enemy => {
    const x = Math.max(front + reach, enemy.x, previous + gap);
    previous = x;
    return { index: enemy.index, x };
  });
}
