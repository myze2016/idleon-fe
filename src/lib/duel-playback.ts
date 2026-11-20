import type { DuelStep } from "@/components/game/pvp-types";

/** First event after the playback time, including every event at that time. */
export function eventCursor(steps: readonly { at: number }[], elapsed: number) {
  let low = 0, high = steps.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (steps[middle].at <= elapsed) low = middle + 1;
    else high = middle;
  }
  return low;
}
export function indexDuelActions(steps: DuelStep[]) {
  const attacks = new Map<number, DuelStep[]>(), skills = new Map<number, DuelStep[]>();
  for (const step of steps) {
    if (battleSkillName(step)) {
      if (!skills.has(step.actor)) skills.set(step.actor, []);
      skills.get(step.actor)!.push(step);
    }
    if (["attack", "skill", "counter"].includes(step.kind)) {
      if (!attacks.has(step.actor)) attacks.set(step.actor, []);
      attacks.get(step.actor)!.push(step);
    }
  }
  return { attacks, skills };
}
export function latestDuelAction(steps: DuelStep[] | undefined, elapsed: number) {
  return steps?.[eventCursor(steps, elapsed) - 1];
}

export function battleSkillName(step: { kind?: string; label?: string } | undefined) {
  if (!step?.label || step.label === "Buff expired" || !["cast", "skill", "heal", "buff"].includes(step.kind ?? "")) return undefined;
  return step.label.replace(/^Casting /, "").split(" · ")[0];
}

export const BATTLE_SKILL_LABEL_SECONDS = 1;
