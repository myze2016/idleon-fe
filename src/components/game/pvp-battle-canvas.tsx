"use client";

import { useEffect, useRef } from "react";
import { drawCharacter } from "./character-design";
import { drawCombatEffect } from "./combat-effects";
import { isRangedSkill } from "@/lib/skill-range";
import type { BattleStep } from "@/lib/encounter";
import type { ArenaFighter, DuelStep } from "./pvp-types";
import { drawArenaEnemy } from "./arena-enemies";
import { BATTLE_SKILL_LABEL_SECONDS, battleSkillName, eventCursor, indexDuelActions, latestDuelAction } from "@/lib/duel-playback";
import { drawFighterHud } from "./battle-labels";
import { preloadSkillEffects } from "./skill-effect-art";
import { adventureFormation, combatEncounterDistance, interpolateCameraTravel, projectBattlefieldParty, projectEnemyX, projectParty } from "./adventure-formation";

export function PvpBattleCanvas(props: { fighters: ArenaFighter[]; steps: DuelStep[]; elapsed: number; playing: boolean; hostId: string; viewerId?: string; fullScreen?: boolean; backgroundSrc?: string; adventure?: boolean; arena?: boolean; playbackKey?: string; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef({ ...props, updatedAt: 0 });
  useEffect(() => {
    const at = performance.now(), previous = current.current;
    const projected = previous.elapsed + (previous.playing ? Math.max(0, at - previous.updatedAt) / 1000 : 0);
    const elapsed = (props.adventure || props.arena) && props.playing && previous.playing && previous.updatedAt > 0 && props.playbackKey === previous.playbackKey
      ? Math.min(props.duration ?? Infinity, Math.max(props.elapsed, projected)) : props.elapsed;
    current.current = { ...props, elapsed, updatedAt: at };
  }, [props]);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const background = props.backgroundSrc ? new Image() : null;
    if (background && props.backgroundSrc) background.src = props.backgroundSrc;
    let frame = 0, scroll = 0;
    let camera: { id: string; x: number; key?: string } | undefined;
    let regroupAt: number | undefined;
    let indexedSteps: DuelStep[] | null = null;
    let playbackIndex = indexDuelActions([]);
    function draw(time: number) {
      if (!ctx || !canvas) return;
    preloadSkillEffects();
      const state = current.current;
      const viewport = state.adventure || state.arena;
      const responsive = viewport && state.fullScreen;
      const width = responsive ? Math.max(320, canvas.clientWidth) : 1200;
      const height = responsive ? width * canvas.clientHeight / Math.max(1, canvas.clientWidth) : 420;
      const ground = viewport ? height * 0.78 : 310;
      const elapsed = Math.min(state.duration ?? Infinity, state.elapsed + (state.playing ? Math.max(0, time - state.updatedAt) / 1000 : 0));
      const perspective = state.arena ? state.viewerId ?? state.hostId : state.hostId;
      const facing = perspective === state.hostId ? 1 : -1;
      const allies = state.fighters.flatMap((fighter, index) => fighter.userId === perspective ? [index] : []);
      const opponents = state.fighters.flatMap((fighter, index) => fighter.userId !== perspective ? [index] : []);
      const formation = adventureFormation(width, height, Math.max(1, allies.length), state.arena ? Math.max(1, opponents.length) : 0);
      const avatarScale = viewport ? formation.avatarScale : 1.05;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (indexedSteps !== state.steps) { indexedSteps = state.steps; playbackIndex = indexDuelActions(state.steps); }
      const cursor = eventCursor(state.steps, elapsed);
      const last = state.steps[cursor - 1];
      const next = state.steps[cursor];
      const blend = next ? Math.max(0, Math.min(1, (elapsed - (last?.at ?? 0)) / Math.max(0.001, next.at - (last?.at ?? 0)))) : 0;
      const movement: number[] = [];
      const positions = state.fighters.map((fighter, index) => {
        const team = fighter.userId === state.hostId ? 0 : 1;
        let start = fighter.startX;
        if (start === undefined) {
          const slot = state.fighters.slice(0, index).filter((other) => other.userId === fighter.userId).length;
          const count = state.fighters.filter((other) => other.userId === fighter.userId).length;
          const offset = state.arena ? combatEncounterDistance / 2 + slot * 64 : 540 - (count - 1 - slot) * 64;
          start = 600 + (team === 0 ? -offset : offset);
        }
        const from = last?.x?.[index] ?? start, to = next?.x?.[index] ?? from;
        movement[index] = elapsed >= 0 && Math.abs(to - from) > 0.01 ? Math.sign(to - from) * facing : 0;
        return elapsed < 0 ? start : from + (to - from) * blend;
      });
      const alive = (index: number) => (last?.hp[index] ?? state.fighters[index].hp ?? state.fighters[index].stats.hp) > 0;
      if (state.arena && state.duration !== undefined && elapsed >= state.duration && allies.some(alive) && !opponents.some(alive)) regroupAt ??= time;
      else regroupAt = undefined;
      const regroup = regroupAt === undefined ? 0 : Math.min(1, (time - regroupAt) / 1300);
      const ranged = allies.findIndex(index => alive(index) && state.fighters[index].stats.range === "range");
      const front = allies.reduce<number | undefined>((lead, index) =>
        alive(index) && (lead === undefined || positions[index] * facing > positions[lead] * facing) ? index : lead, undefined);
      const cameraIndex = ranged < 0 ? front : allies[ranged];
      const side = perspective === state.hostId ? 0 : 1;
      const travel = elapsed < 0 ? 0 : interpolateCameraTravel(last?.cameraTravel?.[side], next?.cameraTravel?.[side], blend);
      const startingCamera = next?.cameraWorld?.[side] === undefined ? undefined : next.cameraWorld[side] - (next.cameraTravel?.[side] ?? 0);
      const cameraWorld = interpolateCameraTravel(last?.cameraWorld?.[side] ?? startingCamera, next?.cameraWorld?.[side], elapsed < 0 ? 0 : blend);
      if (state.arena && travel !== undefined) scroll = travel * 0.75;
      else if (viewport && cameraIndex !== undefined) {
        const id = travel === undefined ? state.fighters[cameraIndex].id : perspective;
        const x = travel ?? positions[cameraIndex] * facing;
        if (camera?.id === id && camera.key === state.playbackKey) {
          scroll += (x - camera.x) * 0.75;
        }
        else if (state.arena && camera?.key !== state.playbackKey) scroll = 0;
        camera = { id, x, key: state.playbackKey };
      }
      const backgroundScroll = scroll + regroup * 117;
      if (!(background?.complete && background.naturalWidth > 0)) {
        const sky = ctx.createLinearGradient(0, 0, 0, ground);
        sky.addColorStop(0, "#a8d5d2"); sky.addColorStop(1, "#f0ebbb");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff0b7"; ctx.beginPath(); ctx.arc(940, 80, 30, 0, Math.PI * 2); ctx.fill();
        for (let layer = 0; layer < 2; layer++) {
          ctx.fillStyle = layer ? "#729c72" : "#99b98a";
          ctx.beginPath(); ctx.moveTo(0, ground);
          for (let x = 0; x <= width; x += 8) ctx.lineTo(x, 220 + layer * 30 + Math.sin((x + backgroundScroll * 0.2) / (170 - layer * 30) + layer) * 32);
          ctx.lineTo(width, ground); ctx.closePath(); ctx.fill();
        }
        for (let x = 35 - ((backgroundScroll % 180) + 180) % 180; x < width; x += 180) {
          ctx.fillStyle = "#6b7350"; ctx.fillRect(x, ground - 80, 9, 80);
          ctx.fillStyle = "#5c8560"; ctx.beginPath(); ctx.ellipse(x + 4, ground - 95, 42, 52, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#8b7750"; ctx.fillRect(0, ground, width, height - ground);
        ctx.fillStyle = "#9ab56c"; ctx.fillRect(0, ground, width, 8);
        ctx.fillStyle = "#6a8c4d"; ctx.fillRect(0, ground + 8, width, 4);
        ctx.fillStyle = "#74613f";
        for (let i = 0; i < 45; i++) ctx.fillRect(((i * 29 - backgroundScroll) % width + width) % width, ground + 26 + i % 4 * 20, 9, 2);
      } else {
        if (state.adventure) {
          const tileWidth = Math.max(width, height * background.naturalWidth / background.naturalHeight);
          const tile = Math.floor(backgroundScroll / tileWidth);
          const offset = backgroundScroll - tile * tileWidth;
          // Anchor the painted grass/path edge to the same floor as the sprites.
          // Feet sit a little inside the path, rather than above its far edge.
          const horizon = Math.round(background.naturalHeight * 0.75);
          const pathTop = ground - Math.min(24, height * 0.035);
          let tileIndex = tile;
          for (let x = -offset; x < width; x += tileWidth, tileIndex++) {
            ctx.save(); ctx.translate(x + (tileIndex % 2 ? tileWidth : 0), 0); ctx.scale(tileIndex % 2 ? -1 : 1, 1);
            ctx.drawImage(background, 0, 0, background.naturalWidth, horizon, 0, 0, tileWidth, pathTop);
            ctx.drawImage(background, 0, horizon, background.naturalWidth, background.naturalHeight - horizon,
              0, pathTop, tileWidth, height - pathTop);
            ctx.restore();
          }
        } else if (state.arena) {
          const margin = width * 0.12;
          const scale = Math.max((width + 2 * margin) / background.naturalWidth, height / background.naturalHeight);
          const artWidth = background.naturalWidth * scale, artHeight = background.naturalHeight * scale;
          const pan = margin * Math.tanh(backgroundScroll * 0.25 / margin);
          ctx.drawImage(background, (width - artWidth) / 2 - pan, (height - artHeight) / 2, artWidth, artHeight);
        } else ctx.drawImage(background, 0, 0, width, height);
      }
      const returning = regroupAt !== undefined && regroup < 1;
      if (viewport) {
        const allyPositions = allies.map(index => positions[index] * facing);
        const allyAlive = (slot: number) => alive(allies[slot]);
        const enemyWorld = opponents.map(index => positions[index] * facing);
        let screens: number[], enemyScreens: number[];
        if (cameraWorld === undefined) {
          const party = projectParty(allyPositions, allyAlive, formation, ranged < 0 ? undefined : { slot: ranged, width });
          screens = party.screen;
          enemyScreens = enemyWorld.map(x => projectEnemyX(x - party.frontWorld, party.frontScreen, width, formation));
        } else {
          screens = projectBattlefieldParty(allyPositions, allyAlive, cameraWorld, width, formation);
          enemyScreens = projectBattlefieldParty(enemyWorld, slot => alive(opponents[slot]), cameraWorld, width, formation);
        }
        opponents.forEach((index, slot) => { positions[index] = enemyScreens[slot]; });
        allies.forEach((index, slot) => {
          const home = formation.home(slot);
          const x = screens[slot];
          positions[index] = x + (home - x) * regroup;
        });
      }
      ctx.save();
      ctx.textAlign = "center";
      for (let index = 0; index < state.fighters.length; index++) {
        const fighter = state.fighters[index], hp = last?.hp[index] ?? fighter.hp ?? fighter.stats.hp, mp = last?.mp[index] ?? fighter.mp ?? fighter.stats.mp;
        if ((fighter.spawnAt ?? 0) > Math.max(0, elapsed)) continue;
        if (hp <= 0) continue;
        const direction = fighter.userId === perspective ? 1 : -1;
        const attack = latestDuelAction(playbackIndex.attacks.get(index), elapsed);
        const age = attack ? elapsed - attack.at : Infinity;
        const swing = age < 0.45 ? Math.sin(Math.max(0, age) / 0.45 * Math.PI) : 0;
        const x = positions[index] + (fighter.stats.range === "melee" && !isRangedSkill(attack?.label) ? direction * swing * 14 : 0);
        const walkDirection = returning && fighter.userId === perspective ? direction : state.playing ? movement[index] : 0;
        const walking = walkDirection !== 0;
        if (state.adventure && (x < -150 || x > width + 150)) continue;
        ctx.save(); ctx.translate(x, ground); ctx.scale(avatarScale, avatarScale);
        if (fighter.weapon) drawCharacter(ctx, fighter.weapon, { facing: walkDirection || direction, stride: walking ? Math.sin(time / 190 + index) : 0, swing });
        else if (fighter.enemyType) drawArenaEnemy(ctx, fighter.enemyType, Math.max(0, elapsed), walking, swing, direction);
        ctx.restore();
        const skill = latestDuelAction(playbackIndex.skills.get(index), elapsed);
        const activeSkill = skill && elapsed < (skill.castEndsAt ?? skill.at + BATTLE_SKILL_LABEL_SECONDS) ? battleSkillName(skill) : undefined;
        const castProgress = activeSkill && skill?.kind === "cast" && skill.castEndsAt !== undefined
          ? (elapsed - skill.at) / Math.max(0.001, skill.castEndsAt - skill.at) : undefined;
        drawFighterHud(ctx, x, ground, avatarScale, ground - (fighter.weapon ? 72 : 55) * avatarScale, {
          name: fighter.name, hp, maxHp: fighter.stats.hp, mp, maxMp: fighter.stats.mp, enemy: direction === -1, skill: activeSkill, castProgress,
          statuses: last?.statuses?.[index],
        });
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
            ranged: fighter.stats.range === "range" || isRangedSkill(step.label) }, elapsed - step.at, ground, avatarScale,
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
  return <div className={props.fullScreen ? "h-full w-full bg-[#8b7750]" : "overflow-x-auto rounded-xl border border-[#708360]"}><canvas ref={ref} width={1200} height={420} role="img" aria-label={props.adventure ? "Endless adventure battlefield. Your team advances through a scrolling meadow as enemies continuously approach from the right." : "Teams start at opposite ends. Ranged units attack from a distance while melee units advance into reach. Health and mana bars appear above every living fighter."} className={props.fullScreen ? `block h-full w-full ${props.adventure || props.arena ? "" : "object-contain"}` : "block h-auto w-full min-w-[760px]"} /></div>;
}
