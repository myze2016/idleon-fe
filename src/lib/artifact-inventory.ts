import type { Artifact } from "./artifact";

/** Team equipment follows formation order, then other equipped and spare items. */
export function sortArtifactInventory<T extends Artifact>(artifacts: T[], teamSlots: (string | null)[]) {
  const slots = new Map<string, number>();
  teamSlots.forEach((id, index) => { if (id && !slots.has(id)) slots.set(id, index); });
  const rank = (item: Artifact) => item.characterId && slots.has(item.characterId) ? slots.get(item.characterId)! : item.characterId ? 6 : 7;
  return [...artifacts].sort((a, b) => rank(a) - rank(b) || b.enhancementLevel - a.enhancementLevel || a.stat.localeCompare(b.stat) || a.id.localeCompare(b.id));
}
