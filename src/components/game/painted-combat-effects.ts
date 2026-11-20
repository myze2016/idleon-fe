import type { CombatEffect } from "./combat-effects";

let atlas: HTMLImageElement | undefined;

/** Animate the generated effects without changing combat timing or damage. */
export function drawPaintedCombatEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, age: number,
  ground: number, scale: number, memberX: (id: string) => number | undefined) {
  if (!atlas) { atlas = new Image(); atlas.src = "/optimized/sprites/combat-effects-v1.9173f404f145.webp"; }
  if (!atlas.complete || !atlas.naturalWidth) return false;
  const { step, source, target, weapon, ranged } = effect;
  const label = step.label ?? "", p = Math.max(0, Math.min(1, age / 0.4));
  const direction = Math.sign(target - source) || 1, y = ground - 30 * scale;
  const sheet = atlas;
  function sprite(index: number, x: number, py: number, size: number, facing = 1, rotation = 0) {
    const sw = sheet.naturalWidth / 4, sh = sheet.naturalHeight / 3;
    ctx.save(); ctx.translate(x, py); ctx.scale(facing, 1); ctx.rotate(rotation);
    ctx.drawImage(sheet, index % 4 * sw, Math.floor(index / 4) * sh, sw, sh,
      -size * scale / 2, -size * scale / 2, size * scale, size * scale);
    ctx.restore();
  }
  if (step.kind === "heal" || step.kind === "buff" || step.kind === "cast") {
    const recipients = step.actor === "enemy" ? [source] : (step.targetIds ?? [step.characterId]).map(memberX);
    for (const x of recipients) if (x !== undefined) {
      sprite(step.kind === "heal" ? 9 : 10, x, ground - (18 + p * 12) * scale, 48 + p * 15);
    }
    return true;
  }
  if (step.kind === "block") { sprite(11, target, y, 52 + p * 8); return true; }
  if (step.kind === "poison" || step.kind === "bleed" || /Shackle/.test(label)) return false;
  if (step.damage <= 0) return false;
  const fire = /Fireball|Inferno|Burn All/.test(label), ice = /Freeze|Ice|Frost/.test(label);
  const shooting = ranged || fire || /Throw Spear|Long Shot/.test(label);
  if (shooting && p < 1) {
    const x = source + (target - source) * p;
    const arc = weapon === "bow" || /Throw Spear/.test(label);
    const py = y - (arc ? Math.sin(p * Math.PI) * 25 * scale : 0);
    const projectile = fire ? 7 : weapon === "bow" || /Throw Spear/.test(label) ? 4
      : weapon === "dual-gun" || weapon === "rifle" ? 5 : 6;
    sprite(projectile, x, py, projectile === 5 ? 28 : 40, direction);
    if ((weapon === "dual-gun" || weapon === "rifle") && p < 0.35) sprite(3, source + direction * 18 * scale, y, 30, direction);
  } else if (!shooting && p < 0.85) {
    sprite(weapon === "dual-knife" ? 1 : 0, target, y, (step.kind === "skill" ? 65 : 45) + p * 12,
      direction, (p - 0.5) * 0.7);
  }
  if (p > 0.65) {
    const size = (step.kind === "skill" ? 50 : 30) + (p - 0.65) * 32;
    sprite(ice ? 8 : fire ? 7 : 2, target, y, size, direction);
  }
  return true;
}
