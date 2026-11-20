"use client";

import { useEffect, useRef } from "react";
import { drawCharacter } from "./character-design";
import { drawCombatEffect } from "./combat-effects";
import { isRangedSkill } from "@/lib/skill-range";
import type { BattleStep } from "@/lib/encounter";
import type { ArenaFighter, DuelStep } from "./pvp-types";
import { drawArenaEnemy } from "./arena-enemies";
import { eventCursor, indexDuelActions, latestDuelAction } from "@/lib/duel-playback";
import { adventureFormation, adventureEnemyPositions } from "./adventure-formation";

export function PvpBattleCanvas(props: { fighters: ArenaFighter[]; steps: DuelStep[]; elapsed: number; playing: boolean; hostId: string; fullScreen?: boolean; backgroundSrc?: string; adventure?: boolean; arena?: boolean; distance?: number; playbackKey?: string; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef({ ...props, updatedAt: 0 });
  useEffect(() => {
    const at = performance.now(), previous = current.current;
    const projected = previous.elapsed + (previous.playing ? Math.max(0, at - previous.updatedAt) / 1000 : 0);
    const elapsed = props.adventure && previous.updatedAt > 0 && props.playbackKey === previous.playbackKey
      ? Math.min(props.duration ?? Infinity, Math.max(props.elapsed, projected)) : props.elapsed;
    current.current = { ...props, elapsed, distance: (props.distance ?? 0) + (props.adventure ? (elapsed - props.elapsed) * 10 : 0), updatedAt: at };
  }, [props]);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const background = props.backgroundSrc && !props.arena ? new Image() : null;
    if (background && props.backgroundSrc) background.src = props.backgroundSrc;
    let frame = 0;
    let indexedSteps: DuelStep[] | null = null;
    let playbackIndex = indexDuelActions([]);
    function draw(time: number) {
      if (!ctx || !canvas) return;
      const state = current.current;
      const viewport = state.adventure || state.arena;
      const width = viewport ? Math.max(state.adventure ? 320 : 640, canvas.clientWidth) : 1200;
      const height = viewport ? width * canvas.clientHeight / Math.max(1, canvas.clientWidth) : 420;
      const ground = viewport ? height * 0.78 : 310;
      const elapsed = Math.min(state.duration ?? Infinity, state.elapsed + (state.playing ? Math.max(0, time - state.updatedAt) / 1000 : 0));
      const teamCount = Math.max(1, state.fighters.filter(fighter => fighter.userId === state.hostId).length);
      const formation = adventureFormation(width, height, teamCount);
      const { spacing } = formation;
      const avatarScale = state.adventure ? formation.avatarScale : 1.05;
      const worldScale = state.adventure ? spacing / 64 : 1;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!state.arena || !state.backgroundSrc) {
      if (!(background?.complete && background.naturalWidth > 0)) {
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
      }
      if (background?.complete && background.naturalWidth > 0) {
        if (state.adventure) {
          const tileWidth = Math.max(width, height * background.naturalWidth / background.naturalHeight);
          const distance = (state.distance ?? 0) + Math.max(0, elapsed - state.elapsed) * 10;
          const scroll = distance * 3, offset = scroll % tileWidth;
          // Anchor the painted grass/path edge to the same floor as the sprites.
          // Feet sit a little inside the path, rather than above its far edge.
          const horizon = Math.round(background.naturalHeight * 0.75);
          const pathTop = ground - Math.min(24, height * 0.035);
          let tile = Math.floor(scroll / tileWidth);
          for (let x = -offset; x < width; x += tileWidth, tile++) {
            ctx.save(); ctx.translate(x + (tile % 2 ? tileWidth : 0), 0); ctx.scale(tile % 2 ? -1 : 1, 1);
            ctx.drawImage(background, 0, 0, background.naturalWidth, horizon, 0, 0, tileWidth, pathTop);
            ctx.drawImage(background, 0, horizon, background.naturalWidth, background.naturalHeight - horizon,
              0, pathTop, tileWidth, height - pathTop);
            ctx.restore();
          }
        } else if (state.arena) {
          const scale = Math.max(width / background.naturalWidth, height / background.naturalHeight);
          const artWidth = background.naturalWidth * scale, artHeight = background.naturalHeight * scale;
          ctx.drawImage(background, (width - artWidth) / 2, (height - artHeight) / 2, artWidth, artHeight);
        } else ctx.drawImage(background, 0, 0, width, height);
      }
      }
      if (indexedSteps !== state.steps) { indexedSteps = state.steps; playbackIndex = indexDuelActions(state.steps); }
      const cursor = eventCursor(state.steps, elapsed);
      const last = state.steps[cursor - 1];
      const next = state.steps[cursor];
      const blend = next ? Math.max(0, Math.min(1, (elapsed - (last?.at ?? 0)) / Math.max(0.001, next.at - (last?.at ?? 0)))) : 0;
      const moving: boolean[] = [];
      const positions = state.fighters.map((fighter, index) => {
        const team = fighter.userId === state.hostId ? 0 : 1;
        let start = fighter.startX;
        if (start === undefined) {
          const slot = state.fighters.slice(0, index).filter((other) => other.userId === fighter.userId).length;
          const count = state.fighters.filter((other) => other.userId === fighter.userId).length;
          start = team === 0 ? 60 + (count - 1 - slot) * 64 : 1140 - (count - 1 - slot) * 64;
        }
        const from = last?.x?.[index] ?? start, to = next?.x?.[index] ?? from;
        moving[index] = elapsed >= 0 && Math.abs(to - from) > 0.01;
        const position = elapsed < 0 ? start : from + (to - from) * blend;
        return state.arena ? 45 + position / 1200 * (width - 90) : position * worldScale;
      });
      if (state.adventure) {
        const alive = (index: number) => (last?.hp[index] ?? state.fighters[index].hp ?? state.fighters[index].stats.hp) > 0;
        const allies = state.fighters.flatMap((fighter, index) => fighter.userId === state.hostId ? [index] : []);
        const frontWorld = Math.max(0, ...allies.filter(alive).map(index => positions[index]));
        const frontScreen = Math.max(width * .16, ...allies.flatMap((index, slot) => alive(index) ? [formation.home(slot)] : []));
        const enemies = state.fighters.flatMap((fighter, index) => fighter.userId !== state.hostId && alive(index) && (fighter.spawnAt ?? 0) <= elapsed
          ? [{ index, x: frontScreen + positions[index] - frontWorld }] : []);
        allies.forEach((index, slot) => { positions[index] = formation.home(slot); });
        for (const enemy of adventureEnemyPositions(frontScreen, formation.contactReach, avatarScale * 28, enemies)) positions[enemy.index] = enemy.x;
      }
      ctx.save();
      ctx.textAlign = "center";
      for (let index = 0; index < state.fighters.length; index++) {
        const fighter = state.fighters[index], hp = last?.hp[index] ?? fighter.hp ?? fighter.stats.hp, mp = last?.mp[index] ?? fighter.mp ?? fighter.stats.mp;
        if ((fighter.spawnAt ?? 0) > Math.max(0, elapsed)) continue;
        if (hp <= 0) continue;
        const direction = fighter.userId === state.hostId ? 1 : -1;
        const attack = latestDuelAction(playbackIndex.attacks.get(index), elapsed);
        const age = attack ? elapsed - attack.at : Infinity;
        const swing = age < 0.45 ? Math.sin(Math.max(0, age) / 0.45 * Math.PI) : 0;
        const x = positions[index] + (fighter.stats.range === "melee" ? direction * swing * 14 : 0);
        const walking = state.playing && (moving[index] || (!!state.adventure && fighter.userId === state.hostId && !state.fighters.some((other, i) => other.userId !== state.hostId && (other.spawnAt ?? 0) <= elapsed && (last?.hp[i] ?? other.hp ?? other.stats.hp) > 0)));
        if (state.adventure && (x < -150 || x > width + 150)) continue;
        ctx.save(); ctx.translate(x, ground); ctx.scale(avatarScale, avatarScale);
        if (fighter.weapon) drawCharacter(ctx, fighter.weapon, { facing: direction, stride: walking ? Math.sin(elapsed * 1000 / 190 + index) : 0, swing });
        else if (fighter.enemyType) drawArenaEnemy(ctx, fighter.enemyType, Math.max(0, elapsed), walking, swing, direction);
        ctx.restore();
        ctx.save(); ctx.translate(x, ground); ctx.scale(avatarScale / 1.05, avatarScale / 1.05);
        ctx.font = "600 11px system-ui"; ctx.fillStyle = "#17392e"; ctx.fillText(fighter.name, 0, -95, 72);
        ctx.fillStyle = "#253b32"; ctx.fillRect(-32, -87, 64, 7);
        ctx.fillStyle = direction === 1 ? "#93d579" : "#f18f86"; ctx.fillRect(-31, -86, 62 * hp / fighter.stats.hp, 5);
        ctx.fillStyle = "#26383e"; ctx.fillRect(-32, -77, 64, 4);
        ctx.fillStyle = "#73bdf0"; ctx.fillRect(-31, -76, fighter.stats.mp ? 62 * mp / fighter.stats.mp : 0, 2);
        if (!state.adventure) {
          ctx.fillStyle = "#f4f0d2"; ctx.fillText(`${hp}/${fighter.stats.hp}`, 0, 29);
          ctx.fillStyle = "#b9ddf0"; ctx.fillText(`${mp} MP`, 0, 44);
        }
        const cast = latestDuelAction(playbackIndex.actions.get(index), elapsed);
        if (cast?.kind === "cast" && elapsed - cast.at < 5) { ctx.fillStyle = "#3d4586"; ctx.fillText(cast.label.replace("Casting ", ""), 0, -108, 76); }
        ctx.restore();
      }
      for (let event = eventCursor(state.steps, elapsed - 0.9); event < cursor; event++) {
        const step = state.steps[event];
        if (["mana", "move"].includes(step.kind)) continue;
        const actor = step.actor ?? step.side, fighter = state.fighters[actor];
        if (!fighter) continue;
        for (const target of step.targets?.length ? step.targets : [actor]) {
          const converted: BattleStep = { at: step.at, actor: "team", characterId: fighter.id, damage: step.damage, enemyHp: 0, teamHp: step.hp,
            kind: step.kind as BattleStep["kind"], label: step.label, healing: step.healing, critical: step.critical, targetIds: [state.fighters[target]?.id] };
          drawCombatEffect(ctx, { step: converted, startedAt: step.at, source: positions[actor], target: positions[target], weapon: fighter.weapon ?? fighter.enemyType ?? "enemy",
            ranged: fighter.stats.range === "range" || isRangedSkill(step.label) }, elapsed - step.at, ground, state.adventure ? avatarScale : 1,
            (id) => { const i = state.fighters.findIndex((unit) => unit.id === id); return i < 0 ? undefined : positions[i]; });
        }
      }
      ctx.restore();
      if (elapsed < 0) {
        const countdownX = state.arena && width < 800 ? width * 0.23 : width / 2;
        const countdownY = state.arena ? height * 0.4 : 70;
        ctx.fillStyle = "#17392e"; ctx.font = "700 32px system-ui"; ctx.fillText("Get ready!", countdownX, countdownY);
        ctx.font = "700 52px system-ui"; ctx.fillText(String(Math.max(1, Math.ceil(-elapsed))), countdownX, countdownY + 65);
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [props.backgroundSrc, props.arena]);
  return <div style={props.arena && props.backgroundSrc ? { backgroundImage: `url('${props.backgroundSrc}')`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} className={props.fullScreen ? "h-full w-full bg-[#8b7750]" : "overflow-x-auto rounded-xl border border-[#708360]"}><canvas ref={ref} width={1200} height={420} role="img" aria-label={props.adventure ? "Endless adventure battlefield. Your team advances through a scrolling meadow as enemies continuously approach from the right." : "Teams start at opposite ends. Ranged units attack from a distance while melee units advance into reach. Health and mana bars appear above every living fighter."} className={props.fullScreen ? `block h-full w-full ${props.adventure || props.arena ? "" : "object-contain"}` : "block h-auto w-full min-w-[760px]"} /></div>;
}
