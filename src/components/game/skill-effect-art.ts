import type { CombatEffect } from "./combat-effects";
import type { CombatStatus } from "@/lib/combat-status";

const skillAtlasUrl = "/optimized/sprites/skill-effects-v1.webp";
const statusAtlasUrl = "/optimized/sprites/status-effects-v1.webp";
const lingeringAtlasUrl = "/optimized/sprites/lingering-effects-v1.webp";
let skillAtlas: HTMLImageElement | undefined;
let statusAtlas: HTMLImageElement | undefined;
let lingeringAtlas: HTMLImageElement | undefined;

export function preloadSkillEffects() {
  if (!skillAtlas) { skillAtlas = new Image(); skillAtlas.decoding = "async"; skillAtlas.src = skillAtlasUrl; }
  if (!statusAtlas) { statusAtlas = new Image(); statusAtlas.decoding = "async"; statusAtlas.src = statusAtlasUrl; }
  if (!lingeringAtlas) { lingeringAtlas = new Image(); lingeringAtlas.decoding = "async"; lingeringAtlas.src = lingeringAtlasUrl; }
}

type SkillArt = { cell: number; motion: "slash" | "projectile" | "impact" | "support"; size: number };
const art: Record<string, SkillArt> = {
  Slash: { cell: 0, motion: "slash", size: 65 },
  "Slash All": { cell: 0, motion: "slash", size: 86 },
  "Heavy Blow": { cell: 0, motion: "slash", size: 73 },
  "Berserker Blow": { cell: 1, motion: "slash", size: 82 },
  Charge: { cell: 2, motion: "slash", size: 75 },
  "Bouncing Glaive": { cell: 3, motion: "projectile", size: 52 },
  Fireball: { cell: 4, motion: "projectile", size: 56 },
  Inferno: { cell: 5, motion: "impact", size: 90 },
  "Burn All": { cell: 5, motion: "impact", size: 90 },
  Freeze: { cell: 6, motion: "impact", size: 63 },
  "Freeze All": { cell: 7, motion: "impact", size: 83 },
  "Throw Spear": { cell: 8, motion: "projectile", size: 65 },
  "Long Shot": { cell: 9, motion: "projectile", size: 69 },
  Shackle: { cell: 10, motion: "impact", size: 64 },
  Heal: { cell: 11, motion: "support", size: 57 },
  "Mass Heal": { cell: 11, motion: "support", size: 73 },
  "Attack Blessing": { cell: 12, motion: "support", size: 55 },
  Hero: { cell: 12, motion: "support", size: 73 },
  Haste: { cell: 13, motion: "support", size: 59 },
  "Burst Fire": { cell: 14, motion: "support", size: 61 },
  "Axe Frenzy": { cell: 15, motion: "support", size: 69 },
};

function drawCell(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, cols: number, rows: number,
  index: number, x: number, y: number, size: number, facing = 1, rotation = 0) {
  const width = sheet.naturalWidth / cols, height = sheet.naturalHeight / rows;
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.rotate(rotation);
  ctx.drawImage(sheet, index % cols * width, Math.floor(index / cols) * height, width, height, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function drawSkillArt(ctx: CanvasRenderingContext2D, effect: CombatEffect, age: number, ground: number,
  scale: number, memberX: (id: string) => number | undefined) {
  const { step, source, target } = effect;
  const p = Math.max(0, Math.min(1, age / 0.38)), y = ground - 30 * scale;
  if (step.kind === "poison" || step.kind === "bleed" || step.kind === "block") {
    if (!statusAtlas?.complete || !statusAtlas.naturalWidth) return false;
    const cell = step.kind === "poison" ? 0 : step.kind === "bleed" ? 1 : 3;
    drawCell(ctx, statusAtlas, 3, 2, cell, target, y - 16 * p * scale, (26 + p * 12) * scale);
    return true;
  }
  if (!skillAtlas?.complete || !skillAtlas.naturalWidth || !["skill", "heal", "buff"].includes(step.kind ?? "")) return false;
  const label = step.label?.split(" · ")[0] ?? "";
  const design = Object.hasOwn(art, label) ? art[label] : undefined;
  if (!design) return false;
  const sheet = skillAtlas;
  const direction = Math.sign(target - source) || 1;
  const sprite = (x: number, py: number, size: number, rotation = 0) =>
    drawCell(ctx, sheet, 4, 4, design.cell, x, py, size * scale, direction, rotation);
  if (design.motion === "support") {
    const recipients = step.actor === "enemy" ? [source] : (step.targetIds ?? [step.characterId]).map(memberX);
    for (const x of recipients) if (x !== undefined) sprite(x, y - p * 18 * scale, design.size + p * 10);
  } else if (design.motion === "projectile") {
    if (p < 1) {
      const arc = label === "Throw Spear" ? Math.sin(p * Math.PI) * 21 * scale : 0;
      sprite(source + (target - source) * p, y - arc, design.size, label === "Bouncing Glaive" ? age * 19 : 0);
    } else if (age < 0.6) sprite(target, y, design.size * (0.85 + (age - 0.38) * 1.2));
  } else {
    const rotation = design.motion === "slash" ? (p - 0.5) * 0.7 : 0;
    sprite(target, y, design.size * (0.7 + p * 0.35), rotation);
    if (label === "Freeze" && statusAtlas?.complete && statusAtlas.naturalWidth) {
      drawCell(ctx, statusAtlas, 3, 2, 5, target, y - p * 22 * scale, (22 + p * 12) * scale);
    }
  }
  return true;
}

const statusDesign: Record<CombatStatus, { icon: number; cell: number; height: number; size: number }> = {
  poison: { icon: 0, cell: 0, height: 25, size: 53 }, bleed: { icon: 1, cell: 1, height: 25, size: 49 },
  stun: { icon: 2, cell: 2, height: 73, size: 32 }, freeze: { icon: 5, cell: 3, height: 31, size: 76 },
  guard: { icon: 3, cell: 4, height: 29, size: 69 }, shield: { icon: 3, cell: 5, height: 31, size: 76 },
  attack: { icon: 4, cell: 6, height: 17, size: 59 }, speed: { icon: 4, cell: 7, height: 11, size: 55 },
  hero: { icon: 4, cell: 8, height: 26, size: 74 }, burst: { icon: 4, cell: 9, height: 20, size: 63 },
};

export function drawStatusArt(ctx: CanvasRenderingContext2D, statuses: CombatStatus[], y: number) {
  if (!statusAtlas?.complete || !statusAtlas.naturalWidth) return;
  const sheet = statusAtlas;
  statuses.forEach((status, index) => drawCell(ctx, sheet, 3, 2, statusDesign[status].icon, (index - (statuses.length - 1) / 2) * 13, y, 14));
}

export function drawFighterStatuses(ctx: CanvasRenderingContext2D, statuses: CombatStatus[], x: number, ground: number, scale: number, time: number) {
  const sheet = lingeringAtlas;
  if (!statuses.length || !sheet?.complete || !sheet.naturalWidth) return;
  ctx.save();
  const opacity = ctx.globalAlpha;
  statuses.forEach((status, index) => {
    const { cell, height, size } = statusDesign[status];
    const pulse = Math.sin(time * 3 + index * 2);
    const control = status === "stun" || status === "freeze";
    ctx.globalAlpha = opacity * (control ? 0.92 : 0.78 / Math.sqrt(statuses.length)) + opacity * pulse * 0.04;
    const bob = status === "stun" ? pulse * 2 : 0;
    drawCell(ctx, sheet, 4, 3, cell, x, ground - (height + bob) * scale, size * scale * (1 + pulse * 0.025));
  });
  ctx.restore();
}
