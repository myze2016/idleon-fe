"use client";
import { useEffect, useRef, useState } from "react";
import type { EndlessResult } from "@/lib/endless";
import type { DamageEntry } from "@/lib/battle-damage";
import { BattleLog } from "./battle-log";
import { DamageSpread } from "./damage-spread";

interface Entry { id: string; actor: string; detail: string; kind: string; critical: boolean }
interface Ledger { runId: string; checkpoint: number; cursor: number; previousHp: number[]; logs: Entry[]; damage: DamageEntry[] }

/** Keep the adventure HUD continuous across server combat checkpoints. */
export function EndlessBattleHud({ runId, checkpoint, result, elapsed, distance, userId, playing, top }: {
  runId: string; checkpoint: number; result: EndlessResult | null; elapsed: number; distance: number; userId: string; playing: boolean; top: number;
}) {
  const ledger = useRef<Ledger>({ runId, checkpoint, cursor: 0, previousHp: [], logs: [], damage: [] });
  const previousResult = useRef<EndlessResult | null>(null);
  const [view, setView] = useState<{ logs: Entry[]; damage: DamageEntry[] }>({ logs: [], damage: [] });
  useEffect(() => {
    let state = ledger.current;
    if (state.runId !== runId) state = ledger.current = { runId, checkpoint, cursor: 0, previousHp: [], logs: [], damage: [] };
    let changed = false;
    function consume(result: EndlessResult, until: number) {
    if (!state.previousHp.length) state.previousHp = result.fighters.map(member => member.hp ?? member.stats.hp);
    for (const member of result.fighters.filter(member => member.userId === userId)) {
      if (!state.damage.some(row => row.id === member.id)) state.damage.push({ id: member.id, name: member.name, basic: 0, skill: 0, dot: 0, total: 0 });
    }
    while (state.cursor < result.steps.length && result.steps[state.cursor].at <= until) {
      const step = result.steps[state.cursor], actor = result.fighters[step.actor];
      const row = state.damage.find(row => row.id === actor?.id);
      if (row && step.damage > 0) {
        const amount = [...new Set(step.targets)].reduce((sum, target) => sum + Math.max(0, (state.previousHp[target] ?? 0) - (step.hp[target] ?? state.previousHp[target] ?? 0)), 0);
        const bucket = step.kind === "poison" || step.kind === "bleed" ? "dot" : step.kind === "skill" ? "skill" : "basic";
        row[bucket] += amount; row.total += amount;
      }
      if (!["mana", "move", "spawn"].includes(step.kind)) {
        state.logs.unshift({ id: `${state.checkpoint}-${state.cursor}`, actor: actor?.name ?? "Battle", detail: `${step.label}${step.damage ? ` · −${Math.ceil(step.damage)} HP` : ""}${step.healing ? ` · +${Math.ceil(step.healing)} HP` : ""}`, kind: step.kind, critical: step.critical });
        state.logs.length = Math.min(80, state.logs.length);
      }
      state.previousHp = step.hp; state.cursor++; changed = true;
    }
    }
    if (state.checkpoint !== checkpoint || !playing) {
      if (previousResult.current) consume(previousResult.current, previousResult.current.duration);
      state.checkpoint = checkpoint; state.cursor = 0; state.previousHp = [];
      previousResult.current = null;
    }
    if (playing && result) { previousResult.current = result; consume(result, elapsed); }
    if (changed) setView({ logs: [...state.logs], damage: state.damage.map(row => ({ ...row })) });
  }, [runId, checkpoint, result, elapsed, userId, playing]);
  return <>
    <DamageSpread rows={view.damage} compact top={top} pad={12} width="min(248px, calc(50% - 18px))" />
    <BattleLog label="Endless battle log" className="absolute left-3 z-10" style={{ top, width: "min(260px, calc(50% - 18px))" }} listStyle={{ maxHeight: "20vh" }}>
      {view.logs.length ? view.logs.map(entry => <li key={entry.id} className={entry.critical ? "text-[#79468f]" : entry.kind === "skill" ? "text-[#315f8e]" : "text-[#71583c]"}><strong>{entry.actor}</strong>: {entry.detail}</li>) : <li>Travelling · {distance.toLocaleString()} m</li>}
    </BattleLog>
  </>;
}
