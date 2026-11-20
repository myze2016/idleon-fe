const meleeRange = 70;
export const combatRangedRange = 780;
export const combatVisibleDistance = 900;
export const combatEncounterDistance = 1140;
export const enemySpawnSpacing = 72;

/** Camera scale and formation spacing shared by all battle modes. */
export function adventureFormation(width: number, height: number, count: number, opposingCount = 0) {
  const avatarScale = Math.max(0.55, Math.min(1.6, height / 420, width / 640));
  const contactReach = Math.max(38, avatarScale * 35);
  const baselineReach = Math.min(width * 0.38, Math.max(150, avatarScale * 170));
  const openingReach = Math.min(width * 0.46, contactReach + (baselineReach - contactReach) * (combatEncounterDistance - meleeRange) / (600 - meleeRange));
  const rangedReach = contactReach + (openingReach - contactReach) * (combatRangedRange - meleeRange) / (combatEncounterDistance - meleeRange);
  const spacing = opposingCount
    ? Math.min(68, (width - openingReach - 32) / Math.max(1, count + opposingCount - 2))
    : Math.min(68, width * 0.34 / Math.max(1, count - 1));
  const home = (slot: number) => width * 0.16 + (count - 1 - slot) * spacing;
  return { spacing, avatarScale, home, leadingX: home(0), rangedReach, contactReach };
}

export function projectCombatGap(gap: number, formation: ReturnType<typeof adventureFormation>, melee = meleeRange, ranged = combatRangedRange) {
  const distance = Math.abs(gap);
  const projected = distance <= melee
    ? distance * formation.contactReach / melee
    : formation.contactReach + (distance - melee) * (formation.rangedReach - formation.contactReach) / (ranged - melee);
  return Math.sign(gap) * projected;
}

/** Keep the party visible while opponents enter the frame from the right. */
export function projectEnemyX(gap: number, front: number, width: number, formation: ReturnType<typeof adventureFormation>, melee = meleeRange) {
  const visibleReach = width - front;
  const x = front + projectCombatGap(gap, { ...formation, rangedReach: visibleReach }, melee, combatVisibleDistance);
  if (gap <= combatVisibleDistance) return x;

  const entryMargin = Math.max(56, formation.avatarScale * 95);
  const approachDistance = combatEncounterDistance - combatVisibleDistance;
  const projectedMargin = (visibleReach - formation.contactReach) * approachDistance / (combatVisibleDistance - melee);
  const extraMargin = Math.max(0, entryMargin - projectedMargin);
  const progress = Math.min(1, (gap - combatVisibleDistance) / approachDistance);
  return x + extraMargin * progress ** 2;
}

export function projectParty(positions: readonly number[], alive: (slot: number) => boolean, formation: ReturnType<typeof adventureFormation>, anchor?: { slot: number; width: number }) {
  const living = positions.flatMap((x, slot) => alive(slot) ? [{ x, slot }] : []).sort((a, b) => b.x - a.x || a.slot - b.slot);
  const frontWorld = living[0]?.x ?? positions[0] ?? 0;
  const rearWorld = living.at(-1)?.x ?? frontWorld;
  const anchorWorld = anchor ? positions[anchor.slot] : frontWorld;
  const anchorScreen = formation.home(anchor?.slot ?? Math.max(0, positions.findIndex((_, slot) => alive(slot))));
  const leftScale = (anchorScreen - 16) / Math.max(1, anchorWorld - rearWorld);
  const rightScale = anchor ? Math.max(0, anchor.width * .7 - anchorScreen) / Math.max(1, frontWorld - anchorWorld) : Infinity;
  const scale = Math.min(formation.spacing / 64, leftScale, rightScale);
  const frontScreen = anchorScreen + (frontWorld - anchorWorld) * scale;
  const screen = positions.map(position => anchorScreen + (position - anchorWorld) * scale);
  // Melee fighters can reach the same position. Leave their silhouettes partially visible.
  const gap = Math.min(formation.avatarScale * 10, (frontScreen - 16) / Math.max(1, living.length - 1));
  let previous = frontScreen + gap;
  living.forEach(({ slot }, index) => {
    screen[slot] = Math.max(16 + (living.length - 1 - index) * gap, Math.min(previous - gap, screen[slot]));
    previous = screen[slot];
  });
  if (anchor) screen[anchor.slot] = anchorScreen;
  return { frontWorld, frontScreen, screen };
}

export function interpolateCameraTravel(from: number | undefined, to: number | undefined, blend: number) {
  if (from === undefined && to === undefined) return undefined;
  const start = from ?? 0;
  return start + ((to ?? start) - start) * blend;
}

export function projectBattlefieldX(position: number, cameraWorld: number, width: number, formation: ReturnType<typeof adventureFormation>) {
  const gap = position - cameraWorld;
  if (gap >= 0) return projectEnemyX(gap, formation.leadingX, width, formation);
  return Math.max(16, formation.leadingX + gap * formation.spacing / 64);
}

export function projectBattlefieldParty(positions: readonly number[], alive: (slot: number) => boolean, cameraWorld: number, width: number, formation: ReturnType<typeof adventureFormation>) {
  const screen = positions.map(position => projectBattlefieldX(position, cameraWorld, width, formation));
  const living = positions.map((_, index) => index).filter(alive).sort((a, b) => positions[b] - positions[a] || a - b);
  const spacing = formation.avatarScale * 10;
  let right = Infinity;
  for (const slot of living) {
    screen[slot] = Math.max(16, Math.min(right, screen[slot]));
    right = screen[slot] - spacing;
  }
  return screen;
}
