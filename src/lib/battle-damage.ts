import type { BattleStep } from "./encounter";

export interface DamageEntry { id: string; name: string; basic: number; skill: number; dot: number; total: number }

export function recordDamage(rows: DamageEntry[], step: BattleStep, enemyHp: number): DamageEntry[] {
  if (step.actor !== "team" || step.damage <= 0 || !rows.some((row) => row.id === step.characterId)) return rows;
  const amount = Math.min(Math.max(0, enemyHp), step.damage);
  if (!amount) return rows;
  const bucket = step.kind === "poison" || step.kind === "bleed" ? "dot" : step.kind === "skill" ? "skill" : "basic";
  return rows.map((row) => row.id === step.characterId ? { ...row, [bucket]: row[bucket] + amount, total: row.total + amount } : row);
}
