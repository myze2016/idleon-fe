import type { DuelFighter, DuelStep } from "@/components/game/pvp-types";
import type { DamageEntry } from "./battle-damage";

/** Attribute actual HP lost, excluding overkill, healing, and future events. */
export function pvpDamage(fighters: DuelFighter[], steps: DuelStep[], elapsed: number): DamageEntry[] {
  const rows = fighters.map(fighter => ({ id: fighter.id, name: fighter.name, basic: 0, skill: 0, dot: 0, total: 0 }));
  let previous = fighters.map(fighter => fighter.hp ?? fighter.stats.hp);
  for (const step of steps) {
    if (step.at > elapsed) break;
    const row = rows[step.actor];
    if (row && step.damage > 0) {
      const amount = [...new Set(step.targets)].reduce((sum, target) => sum + Math.max(0, (previous[target] ?? 0) - (step.hp[target] ?? previous[target] ?? 0)), 0);
      const bucket = step.kind === "poison" || step.kind === "bleed" ? "dot" : step.kind === "skill" ? "skill" : "basic";
      row[bucket] += amount; row.total += amount;
    }
    previous = step.hp;
  }
  return rows;
}
