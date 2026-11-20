export interface UpgradeStep { cost: number; gain: number }
export interface EconomySettings {
  shopPrices: Record<string, number>;
  levelExp: number[];
  artifactEnhancements: UpgradeStep[];
  characterUpgrades: Record<string, UpgradeStep[]>;
  characterUpgradeCostMultiplier: number;
  skillUnlockCost: number;
}
export function upgradeStep(rows: UpgradeStep[], level: number) { return rows[Math.min(level, rows.length - 1)]; }
export function upgradeBonus(rows: UpgradeStep[], level: number) {
  return rows.slice(0, Math.min(level, rows.length)).reduce((sum, step) => sum + step.gain, 0) + Math.max(0, level - rows.length) * rows[rows.length - 1].gain;
}
