import type { BattleStep } from "@/lib/encounter";

export interface CombatEffect {
  step: BattleStep; startedAt: number; source: number; target: number; weapon: string; ranged: boolean; enemyId?: string;
}

// Each timeline event gets its own animation so simultaneous hits never hide one another.
export function drawCombatEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, age: number,
  ground: number, scale: number, memberX: (id: string) => number | undefined) {
  const { step, source, target, weapon, ranged } = effect;
  if (step.kind === "mana") return;
  const p = Math.min(1, age / 0.4), fade = Math.max(0, 1 - age / 0.9);
  const y = ground - 30 * scale, label = step.label ?? "";
  const fire = /Fireball|Inferno|Burn All/.test(label), support = step.kind === "heal" || step.kind === "buff";
  const color = /Freeze/.test(label) ? "#8fdbff" : fire ? "#ff9b49" : step.kind === "bleed" ? "#ef7e89" : step.kind === "poison" ? "#9be56b" : support ? step.kind === "heal" ? "#8fffb5" : "#cfadff" : "#fff0b8";
  ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = "round";
  function line(x1: number, y1: number, x2: number, y2: number, width = 3) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function ring(x: number, radius: number) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, ground - 5, radius, radius * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (support && step.actor === "enemy") {
    ring(source, (15 + p * 22) * scale);
    if (step.healing) { ctx.fillStyle = "#8fffb5"; ctx.font = "600 14px system-ui"; ctx.fillText(`+${step.healing}`, source, y - 24 - age * 20); }
  } else if (support || step.kind === "cast") {
    const recipients = support ? step.targetIds ?? [step.characterId] : [step.characterId];
    for (const id of recipients) {
      const x = memberX(id); if (x === undefined) continue;
      ring(x, (15 + p * 22) * scale);
      if (step.kind === "heal") {
        ctx.fillStyle = color; ctx.font = "700 18px system-ui"; ctx.textAlign = "center";
        ctx.fillText("+", x, y - (25 + age * 28) * scale);
      }
      for (let i = 0; i < 6; i++) {
        const px = x + Math.cos(i * Math.PI / 3 + age * 3) * 20 * scale;
        const py = ground - (12 + p * 45 + i % 2 * 10) * scale;
        line(px - 3, py, px + 3, py, 2); line(px, py - 3, px, py + 3, 2);
      }
      if (/Haste|Burst/.test(label)) for (let i = 0; i < 3; i++) line(x - 20, y + i * 9, x + 20, y + i * 9 - 12);
      if (/Hero/.test(label)) { ctx.strokeStyle = "#ffe198"; ctx.strokeRect(x - 19 * scale, y - 18 * scale, 38 * scale, 42 * scale); }
    }
  } else if (step.kind === "block") {
    ctx.strokeStyle = "#a8e6ff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(target, y, (22 + p * 6) * scale, -1.4, 1.4); ctx.stroke();
  } else if (step.kind === "poison" || step.kind === "bleed") {
    for (let i = 0; i < 5; i++) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(target + Math.sin(i * 4) * 17 * scale, y - p * 30 * scale + i * 5, 3 * scale, 0, Math.PI * 2); ctx.fill(); }
  } else if (/Shackle/.test(label)) {
    if (p < 1) {
      const x = source + (target - source) * p;
      ctx.strokeStyle = "#c5b2ff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 6, y); ctx.stroke();
    }
    ctx.strokeStyle = "#c5b2ff"; ctx.lineWidth = 3;
    if (p >= 0.65) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(target, y + (i - 1) * 12 * scale, 22 * scale, 7 * scale, i * 0.3, 0, Math.PI * 2); ctx.stroke(); }
  } else if (step.damage > 0) {
    if (ranged || fire || /Throw Spear|Long Shot/.test(label)) {
      if (p < 1) {
        const x = source + (target - source) * p, direction = Math.sign(target - source) || 1;
        const py = y - (weapon === "bow" || step.actor === "enemy" ? Math.sin(p * Math.PI) * 25 : 0);
        ctx.shadowColor = color; ctx.shadowBlur = fire ? 18 : 5;
        if (step.actor === "team" && weapon === "glaive") {
          ctx.save(); ctx.translate(x, py); ctx.rotate(age * 24 * direction); ctx.scale(scale, scale);
          ctx.fillStyle = "#dce5e6"; ctx.strokeStyle = "#48656a"; ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let point = 0; point < 8; point++) {
            const angle = point * Math.PI / 4, radius = point % 2 ? 4 : 14;
            const sx = Math.cos(angle) * radius, sy = Math.sin(angle) * radius;
            if (!point) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#48656a"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (step.actor === "enemy") {
          ctx.fillStyle = "#d8c29a"; ctx.beginPath(); ctx.arc(x, py, 5 * scale, 0, Math.PI * 2); ctx.fill();
          line(x - direction * 16 * scale, py + 3, x - direction * 6 * scale, py, 2);
        } else if (fire) { ctx.fillStyle = "#ffcf6b"; ctx.beginPath(); ctx.arc(x, py, 9 * scale, 0, Math.PI * 2); ctx.fill(); line(x - direction * 28 * scale, py, x, py, 6); }
        else {
          const length = /Throw Spear/.test(label) ? 28 : weapon === "bow" ? 18 : 10;
          line(x - direction * length * scale, py, x, py, /Long Shot/.test(label) ? 5 : 3);
          if (weapon === "bow" || /Throw Spear/.test(label)) { line(x - direction * 7, py - 5, x, py); line(x - direction * 7, py + 5, x, py); }
        }
      }
    } else {
      ctx.strokeStyle = /Berserker/.test(label) ? "#ff8378" : color; ctx.lineWidth = step.kind === "skill" ? 7 : 4;
      ctx.beginPath(); ctx.arc(target, y, (18 + p * 12) * scale, -1.5 + p, 0.8 + p); ctx.stroke();
    }
    if (p > 0.65) {
      for (let i = 0; i < 7; i++) { const angle = i * Math.PI * 2 / 7; const r = (p - 0.6) * 65 * scale; line(target + Math.cos(angle) * r, y + Math.sin(angle) * r, target + Math.cos(angle) * (r + 6), y + Math.sin(angle) * (r + 6), fire ? 4 : 2); }
      if (/Inferno/.test(label)) ring(target, p * 45 * scale);
    }
  }
  if (step.damage) {
    ctx.textAlign = "center"; ctx.font = `700 ${step.critical ? 21 : 16}px system-ui`; ctx.fillStyle = step.critical ? "#c58aff" : step.kind === "skill" ? "#69b7ff" : color;
    ctx.fillText(step.healing ? `+${step.healing}` : `${step.critical ? "CRIT " : ""}-${step.damage}`, target, y - (35 + age * 28) * scale);
  }
  ctx.restore();
}
