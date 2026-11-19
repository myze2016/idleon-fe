import { specialWeapons } from "./character";
import type { UpgradeStep } from "./economy";

export interface CharacterCostEdit { group: "all" | "standard" | "special"; mode: "set" | "add"; amount: number; from?: number; to?: number }
export function editCharacterCosts(tables: Record<string, UpgradeStep[]>, edit: CharacterCostEdit) {
  if (!Number.isSafeInteger(edit.amount) || edit.amount < 0 || edit.amount > 1_000_000_000) throw new Error("Enter a whole gold amount from 0 to 1,000,000,000.");
  if (edit.from !== undefined && (!Number.isInteger(edit.from) || !Number.isInteger(edit.to) || edit.from < 1 || edit.to! < edit.from || edit.to! > 1000)) throw new Error("Choose a plus range from +1 to +1000.");
  let characters = 0, steps = 0;
  const result = Object.fromEntries(Object.entries(tables).map(([weapon, rows]) => {
    const special = specialWeapons.some(entry => entry.id === weapon);
    if (edit.group !== "all" && special !== (edit.group === "special")) return [weapon, rows];
    characters++;
    const count = edit.to ?? rows.length;
    const next = Array.from({ length: Math.max(rows.length, count) }, (_, index) => {
      const row = rows[Math.min(index, rows.length - 1)];
      if (index + 1 < (edit.from ?? 1) || index + 1 > count) return { ...row };
      const cost = edit.mode === "set" ? edit.amount : row.cost + edit.amount;
      if (cost > 1_000_000_000) throw new Error("A resulting cost exceeds 1,000,000,000 gold. Use a smaller increase.");
      steps++;
      return { ...row, cost };
    });
    return [weapon, next];
  }));
  return { tables: result, characters, steps };
}
