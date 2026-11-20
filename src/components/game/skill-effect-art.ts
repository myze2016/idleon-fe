import type { CombatEffect } from "./combat-effects";

const skillAtlasUrl = "/optimized/sprites/skill-effects-v1.webp";
const statusAtlasUrl = "/optimized/sprites/status-effects-v1.webp";
let skillAtlas: HTMLImageElement | undefined;
let statusAtlas: HTMLImageElement | undefined;

export function preloadSkillEffects() {
  if (!skillAtlas) { skillAtlas = new Image(); skillAtlas.decoding = "async"; skillAtlas.src = skillAtlasUrl; }
  if (!statusAtlas) { statusAtlas = new Image(); statusAtlas.decoding = "async"; statusAtlas.src = statusAtlasUrl; }
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

export function drawStatusArt(ctx: CanvasRenderingContext2D, statuses: number, y: number) {
  if (!statusAtlas?.complete || !statusAtlas.naturalWidth || !statuses) return;
  const sheet = statusAtlas;
  const cells = [0, 1, 2, 3, 4].filter(index => statuses & (1 << index));
  cells.forEach((cell, index) => drawCell(ctx, sheet, 3, 2, cell, (index - (cells.length - 1) / 2) * 13, y, 14));
}
