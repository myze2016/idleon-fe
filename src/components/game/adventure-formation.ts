const meleeRange = 70;
export const combatRangedRange = 780;
export const combatVisibleDistance = combatRangedRange;
export const combatEncounterDistance = 1140;
export const enemySpawnSpacing = 72;
export const victoryRegroupSeconds = 1.3;
const combatWalkSpeed = 120;

export function regroupProgress(seconds: number) {
  const progress = Math.max(0, Math.min(1, seconds / victoryRegroupSeconds));
  return progress * progress * (3 - 2 * progress);
}

type PartyPhase = "combat" | "regroup" | "hold";
type FighterPosition = { id: string; x: number; home: number };

export class PartyMotion {
  private phase?: PartyPhase;
  private startedAt = 0;
  private lastUpdate?: number;
  private origins = new Map<string, number>();
  private previous = new Map<string, number>();
  private rejoining = new Set<string>();

  update(phase: PartyPhase, time: number, width: number, fighters: FighterPosition[]) {
    const phaseChanged = phase !== this.phase;
    if (phaseChanged) {
      this.phase = phase;
      this.startedAt = time;
      this.origins = this.previous;
      this.rejoining = phase === "combat" ? new Set(this.previous.keys()) : new Set();
    }
    const seconds = phaseChanged ? 0 : Math.min(0.05, Math.max(0, time - (this.lastUpdate ?? time)));
    this.lastUpdate = time;
    // Limit the visual correction to a walking pace, even if combat resumes far from formation.
    const maxStep = seconds * combatWalkSpeed * Math.max(1, width / combatRangedRange);
    const progress = phase === "hold" ? 0 : regroupProgress(time - this.startedAt);
    const previous = this.previous;
    this.previous = new Map();
    return fighters.map(({ id, x, home }) => {
      const target = phase === "regroup" ? home : x;
      const from = this.origins.get(id);
      const origin = (from ?? target / width) * width;
      let position = phase === "combat" ? target : origin + (target - origin) * progress;
      const prior = (previous.get(id) ?? position / width) * width;
      if (this.rejoining.has(id)) {
        const remaining = target - prior;
        if (Math.abs(remaining) <= maxStep) this.rejoining.delete(id);
        else position = prior + Math.sign(remaining) * maxStep;
      }
      this.previous.set(id, position / width);
      const direction = Math.abs(position - prior) > 0.05 ? Math.sign(position - prior) : 0;
      const transitioning = phase === "combat" ? this.rejoining.has(id) : from !== undefined && progress < 1;
      return { x: position, moving: direction !== 0, direction, transitioning };
    });
  }
}

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

export function interpolateCameraTravel(from: number | undefined, to: number | undefined, blend: number) {
  if (from === undefined && to === undefined) return undefined;
  const start = from ?? 0;
  return start + ((to ?? start) - start) * blend;
}

export function battlefieldHasOpponent(allies: readonly number[], opponents: readonly number[]) {
  return allies.some(x => opponents.some(target => Math.abs(x - target) <= combatVisibleDistance + 1e-5));
}

const framingSpeed = 2 * combatWalkSpeed;

export class BattlefieldFraming {
  private previous?: { at: number; camera: number; front: number; rear: number };

  view(camera: number, allies: readonly number[], width: number, formation: ReturnType<typeof adventureFormation>, time: number) {
    const front = allies.length ? Math.max(...allies) : camera;
    const rear = allies.length ? Math.min(...allies) : camera;
    const previous = this.previous;
    const maxStep = previous ? framingSpeed * Math.max(0, Math.min(0.05, time - previous.at)) : 0;
    // Expand as needed to keep the living party and its attack range visible. Release old bounds gradually.
    const current = previous ? {
      at: time,
      camera: previous.camera + Math.max(-maxStep, Math.min(maxStep, camera - previous.camera)),
      front: Math.max(front, previous.front - maxStep),
      rear: Math.min(rear, previous.rear + maxStep),
    } : { at: time, camera, front, rear };
    this.previous = current;
    return battlefieldView(current.camera, [current.front, current.rear], width, formation);
  }
}

export function battlefieldView(cameraWorld: number, allies: readonly number[], width: number, formation: ReturnType<typeof adventureFormation>) {
  const margin = Math.min(width / 4, Math.max(24, formation.avatarScale * 40));
  const anchor = Math.max(margin, Math.min(width - margin, formation.leadingX));
  const front = allies.length ? Math.max(...allies) : cameraWorld;
  cameraWorld = Math.min(cameraWorld, front + combatVisibleDistance - meleeRange - 1);
  const rear = Math.min(cameraWorld, ...allies);
  const viewEnd = front + combatVisibleDistance;
  const leftScale = Math.min(formation.spacing / 64, (anchor - margin) / Math.max(1, cameraWorld - rear));
  const inside = (x: number) => Math.max(margin, Math.min(width - margin, x));
  function project(position: number) {
    const gap = position - cameraWorld;
    if (gap < 0) return Math.max(margin, anchor + gap * leftScale);
    const reach = viewEnd - cameraWorld;
    return anchor + projectCombatGap(gap, { ...formation, rangedReach: width - margin - anchor }, meleeRange, reach);
  }
  function party(positions: readonly number[], alive: (slot: number) => boolean, friendly = false) {
    const screen = separateOverlaps(positions.map(project), alive, formation.avatarScale * 10);
    return friendly ? screen.map(inside) : screen;
  }
  return { project, party };
}

function separateOverlaps(screen: number[], alive: (slot: number) => boolean, spacing: number) {
  // Keep the overlap offset attached to formation slots when fighters pass each other.
  return screen.map((x, slot) => {
    if (!alive(slot)) return x;
    let offset = 0;
    for (let other = 0; other < slot; other++) {
      if (alive(other)) offset += Math.max(0, spacing - Math.abs(x - screen[other]));
    }
    return Math.max(16, x - offset);
  });
}
