import type { DuelStep } from "@/components/game/pvp-types";

/** First event after the playback time, including every event at that time. */
export function eventCursor(steps: DuelStep[], elapsed: number) {
  let low = 0, high = steps.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (steps[middle].at <= elapsed) low = middle + 1;
    else high = middle;
  }
  return low;
}
export function indexDuelActions(steps: DuelStep[]) {
  const attacks = new Map<number, DuelStep[]>(), actions = new Map<number, DuelStep[]>();
  for (const step of steps) {
    if (!["mana", "move"].includes(step.kind)) {
      if (!actions.has(step.actor)) actions.set(step.actor, []);
      actions.get(step.actor)!.push(step);
    }
    if (["attack", "skill", "counter"].includes(step.kind)) {
      if (!attacks.has(step.actor)) attacks.set(step.actor, []);
      attacks.get(step.actor)!.push(step);
    }
  }
  return { attacks, actions };
}
export function latestDuelAction(steps: DuelStep[] | undefined, elapsed: number) {
  return steps?.[eventCursor(steps, elapsed) - 1];
}
