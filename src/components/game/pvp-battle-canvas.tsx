"use client";

import { useEffect, useRef } from "react";
import { drawCharacter } from "./character-design";
import { drawCombatEffect } from "./combat-effects";
import { isRangedSkill } from "@/lib/skill-range";
import type { BattleStep } from "@/lib/encounter";
import type { DuelFighter, DuelStep } from "./pvp-types";

export function PvpBattleCanvas(props: { fighters: DuelFighter[]; steps: DuelStep[]; elapsed: number; playing: boolean; hostId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef({ ...props, updatedAt: 0 });
  useEffect(() => { current.current = { ...props, updatedAt: performance.now() }; }, [props]);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const width = 1200, height = 420, ground = 310;
    function draw(time: number) {
      if (!ctx || !canvas) return;
      const state = current.current;
      const elapsed = state.elapsed + (state.playing ? Math.max(0, time - state.updatedAt) / 1000 : 0);
      const approach = Math.max(0, Math.min(1, (elapsed + 5) / 3));
      const walking = elapsed < -2;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) { canvas.width = width * ratio; canvas.height = height * ratio; }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, "#a8d5d2"); sky.addColorStop(1, "#f0ebbb");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fff0b7"; ctx.beginPath(); ctx.arc(940, 80, 30, 0, Math.PI * 2); ctx.fill();
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer ? "#729c72" : "#99b98a";
        ctx.beginPath(); ctx.moveTo(0, ground);
        for (let x = 0; x <= width; x += 8) ctx.lineTo(x, 220 + layer * 30 + Math.sin(x / (170 - layer * 30) + layer) * 32);
        ctx.lineTo(width, ground); ctx.closePath(); ctx.fill();
      }
      for (let x = 35; x < width; x += 180) {
        ctx.fillStyle = "#6b7350"; ctx.fillRect(x, ground - 80, 9, 80);
        ctx.fillStyle = "#5c8560"; ctx.beginPath(); ctx.ellipse(x + 4, ground - 95, 42, 52, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#8b7750"; ctx.fillRect(0, ground, width, height - ground);
      ctx.fillStyle = "#9ab56c"; ctx.fillRect(0, ground, width, 8);
      ctx.fillStyle = "#6a8c4d"; ctx.fillRect(0, ground + 8, width, 4);
      ctx.fillStyle = "#74613f";
      for (let i = 0; i < 45; i++) ctx.fillRect(i * 29 % width, ground + 26 + i % 4 * 20, 9, 2);
      const steps = state.steps.filter((step) => step.at <= elapsed);
      const last = steps.at(-1);
      const positions = state.fighters.map((fighter, index) => {
        const team = fighter.userId === state.hostId ? 0 : 1;
        const slot = state.fighters.slice(0, index).filter((other) => other.userId === fighter.userId).length;
        return (team === 0 ? 520 - slot * 76 : 680 + slot * 76) + (team === 0 ? -470 : 470) * (1 - approach);
      });
      ctx.textAlign = "center";
      for (let index = 0; index < state.fighters.length; index++) {
        const fighter = state.fighters[index], hp = last?.hp[index] ?? fighter.stats.hp, mp = last?.mp[index] ?? fighter.stats.mp;
        if (hp <= 0) continue;
        const direction = fighter.userId === state.hostId ? 1 : -1;
        const attack = steps.findLast((step) => step.actor === index && ["attack", "skill", "counter"].includes(step.kind));
        const age = attack ? elapsed - attack.at : Infinity;
        const swing = age < 0.45 ? Math.sin(Math.max(0, age) / 0.45 * Math.PI) : 0;
        const x = positions[index] + (fighter.stats.range === "melee" ? direction * swing * 14 : 0);
        ctx.save(); ctx.translate(x, ground - (walking ? Math.abs(Math.sin(time / 130 + index)) * 3 : 0)); ctx.scale(1.05, 1.05);
        drawCharacter(ctx, fighter.weapon, { facing: direction, stride: walking ? Math.sin(time / 115 + index) : 0, swing }); ctx.restore();
        ctx.font = "600 11px system-ui"; ctx.fillStyle = "#17392e"; ctx.fillText(fighter.name, x, ground - 95, 72);
        ctx.fillStyle = "#253b32"; ctx.fillRect(x - 32, ground - 87, 64, 7);
        ctx.fillStyle = direction === 1 ? "#93d579" : "#f18f86"; ctx.fillRect(x - 31, ground - 86, 62 * hp / fighter.stats.hp, 5);
        ctx.fillStyle = "#26383e"; ctx.fillRect(x - 32, ground - 77, 64, 4);
        ctx.fillStyle = "#73bdf0"; ctx.fillRect(x - 31, ground - 76, fighter.stats.mp ? 62 * mp / fighter.stats.mp : 0, 2);
        ctx.fillStyle = "#f4f0d2"; ctx.fillText(`${hp}/${fighter.stats.hp}`, x, ground + 29);
        ctx.fillStyle = "#b9ddf0"; ctx.fillText(`${mp} MP`, x, ground + 44);
        const cast = steps.findLast((step) => step.actor === index && step.kind !== "mana");
        if (cast?.kind === "cast" && elapsed - cast.at < 5) { ctx.fillStyle = "#3d4586"; ctx.fillText(cast.label.replace("Casting ", ""), x, ground - 108, 76); }
      }
      for (const step of steps.filter((entry) => entry.kind !== "mana" && elapsed - entry.at < 0.9)) {
        const actor = step.actor ?? step.side, fighter = state.fighters[actor];
        if (!fighter) continue;
        for (const target of step.targets?.length ? step.targets : [actor]) {
          const converted: BattleStep = { at: step.at, actor: "team", characterId: fighter.id, damage: step.damage, enemyHp: 0, teamHp: step.hp,
            kind: step.kind as BattleStep["kind"], label: step.label, healing: step.healing, critical: step.critical, targetIds: [state.fighters[target]?.id] };
          drawCombatEffect(ctx, { step: converted, startedAt: step.at, source: positions[actor], target: positions[target], weapon: fighter.weapon,
            ranged: fighter.stats.range === "range" || isRangedSkill(step.label) }, elapsed - step.at, ground, 1,
            (id) => { const i = state.fighters.findIndex((unit) => unit.id === id); return i < 0 ? undefined : positions[i]; });
        }
      }
      if (elapsed < 0) {
        ctx.fillStyle = "#17392e"; ctx.font = "700 32px system-ui"; ctx.fillText(walking ? "Teams approaching" : "Get ready!", width / 2, 70);
        ctx.font = "700 52px system-ui"; ctx.fillText(String(Math.max(1, Math.ceil(-elapsed))), width / 2, 135);
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="overflow-x-auto rounded-xl border border-[#708360]"><canvas ref={ref} width={1200} height={420} role="img" aria-label="Both PvP teams approach from opposite sides and fight automatically. Health and mana bars appear above every living character." className="block h-auto w-full min-w-[760px]" /></div>;
}
