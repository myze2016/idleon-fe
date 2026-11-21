export type CombatStatus = "poison" | "bleed" | "stun" | "freeze" | "guard" | "shield" | "attack" | "speed" | "hero" | "burst";
export type CombatStatusEnds = Partial<Record<CombatStatus, number | null>>;

const legacyStatuses: CombatStatus[] = ["poison", "bleed", "stun", "guard", "attack"];

export function activeCombatStatuses(ends: CombatStatusEnds | null | undefined, time: number, legacy = 0): CombatStatus[] {
  if (ends === undefined) return legacyStatuses.filter((_, index) => legacy & (1 << index));
  return (Object.keys(ends ?? {}) as CombatStatus[]).filter(status => {
    const expiry = ends?.[status];
    return expiry === null || (expiry !== undefined && expiry > time);
  });
}
