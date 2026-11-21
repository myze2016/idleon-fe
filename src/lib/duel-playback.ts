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

const movementTickSeconds = 0.1;

export function indexCombatMovement<T extends { kind?: string; label?: string; x?: number[] }>(frames: readonly T[]) {
  return frames.filter((frame, index) => {
    if (frame.kind !== undefined) return frame.kind === "move" && frame.label !== "Cast ended";
    const previous = frames[index - 1]?.x;
    return !previous || frame.x?.some((position, slot) => previous[slot] !== undefined && position !== previous[slot]);
  });
}

export function movementSample<T extends { at: number }>(frames: readonly T[], elapsed: number) {
  const cursor = eventCursor(frames, elapsed);
  const previous = frames[cursor - 1];
  const nextAt = frames[cursor]?.at;
  if (nextAt === undefined) return { previous, next: undefined, blend: 0 };
  const next = frames[eventCursor(frames, nextAt) - 1];
  const start = Math.max(previous?.at ?? 0, next.at - movementTickSeconds);
  const blend = Math.max(0, Math.min(1, (elapsed - start) / Math.max(0.001, next.at - start)));
  return { previous, next, blend };
}

export function indexDuelActions(steps: DuelStep[]) {
  const attacks = new Map<number, DuelStep[]>(), skills = new Map<number, DuelStep[]>();
  const deaths = new Map<number, number>();
  for (const step of steps) {
    step.hp.forEach((hp, index) => {
      if (hp <= 0 && !deaths.has(index)) deaths.set(index, step.at);
    });
    if (battleSkillName(step)) {
      if (!skills.has(step.actor)) skills.set(step.actor, []);
      skills.get(step.actor)!.push(step);
    }
    if (["attack", "skill", "counter"].includes(step.kind)) {
      if (!attacks.has(step.actor)) attacks.set(step.actor, []);
      attacks.get(step.actor)!.push(step);
    }
  }
  return { attacks, skills, deaths, motion: indexCombatMovement(steps) };
}
export function latestDuelAction(steps: DuelStep[] | undefined, elapsed: number) {
  return steps?.[eventCursor(steps, elapsed) - 1];
}

export function battleSkillName(step: { kind?: string; label?: string } | undefined) {
  if (!step?.label || step.label === "Buff expired" || !["cast", "skill", "heal", "buff"].includes(step.kind ?? "")) return undefined;
  return step.label.replace(/^Casting /, "").split(" · ")[0];
}

export const BATTLE_SKILL_LABEL_SECONDS = 1;
