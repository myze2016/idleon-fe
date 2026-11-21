"use client";

import { useEffect, useRef } from "react";
import { drawCharacter } from "./character-design";
import { drawCombatEffect } from "./combat-effects";
import { isRangedSkill } from "@/lib/skill-range";
import type { BattleStep } from "@/lib/encounter";
import type { ArenaFighter, DuelStep } from "./pvp-types";
import { drawArenaEnemy } from "./arena-enemies";
import { BATTLE_SKILL_LABEL_SECONDS, battleSkillName, eventCursor, indexDuelActions, latestDuelAction, movementSample } from "@/lib/duel-playback";
import { drawFighterHud } from "./battle-labels";
import { drawFighterStatuses, preloadSkillEffects } from "./skill-effect-art";
import { activeCombatStatuses } from "@/lib/combat-status";
import { applyCharacterDeath, characterDeathSeconds } from "./character-death";
import { adventureFormation, BattlefieldFraming, battlefieldHasOpponent, combatEncounterDistance, interpolateCameraTravel, PartyMotion } from "./adventure-formation";

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
    let allyMotion = new PartyMotion(), enemyMotion = new PartyMotion();
    let framing = new BattlefieldFraming();
    let lastPlaybackKey: string | undefined;
    let engaged = false;
    let finishedAt: number | undefined;
    const deathFrames = new Map<string, { x: number; at: number }>();
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
      const { previous: fromFrame, next, blend } = movementSample(playbackIndex.motion, elapsed);
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
        const spawnedSinceFrame = (fighter.spawnAt ?? 0) > (fromFrame?.at ?? 0);
        if (spawnedSinceFrame && (fighter.spawnAt ?? 0) > elapsed) return start;
        const from = (spawnedSinceFrame ? last?.x?.[index] : fromFrame?.x?.[index]) ?? start;
        const to = next?.x?.[index] ?? from;
        movement[index] = elapsed >= 0 && Math.abs(to - from) > 0.01 && blend > 0 ? Math.sign(to - from) * facing : 0;
        return elapsed < 0 ? start : from + (to - from) * blend;
      });
      const alive = (index: number) => (state.fighters[index].spawnAt ?? 0) <= Math.max(0, elapsed)
        && (last?.hp[index] ?? state.fighters[index].hp ?? state.fighters[index].stats.hp) > 0;
      if (lastPlaybackKey !== state.playbackKey) {
        if (!state.adventure || lastPlaybackKey?.split(":")[0] !== state.playbackKey?.split(":")[0]) {
          deathFrames.clear();
          allyMotion = new PartyMotion(); enemyMotion = new PartyMotion();
          framing = new BattlefieldFraming();
          camera = undefined; scroll = 0;
          engaged = false;
        }
        lastPlaybackKey = state.playbackKey;
        finishedAt = undefined;
      }
      if (state.duration !== undefined && elapsed >= state.duration) finishedAt ??= time;
      else finishedAt = undefined;
      const visualTime = elapsed + (finishedAt === undefined ? 0 : (time - finishedAt) / 1000);
      const arenaFinished = state.arena && finishedAt !== undefined;
      const livingAllies = allies.filter(alive).map(index => positions[index] * facing);
      const livingOpponents = opponents.filter(alive).map(index => positions[index] * facing);
      const inSight = battlefieldHasOpponent(livingAllies, livingOpponents);
      if (elapsed >= 0 && inSight) engaged = true;
      const regrouping = !inSight && (state.adventure || arenaFinished || (state.arena && engaged));
      const alliesRegroup = regrouping && livingAllies.length > 0;
      const opponentsRegroup = !inSight && arenaFinished && livingOpponents.length > 0;
      const ranged = allies.findIndex(index => alive(index) && state.fighters[index].stats.range === "range");
      const front = allies.reduce<number | undefined>((lead, index) =>
        alive(index) && (lead === undefined || positions[index] * facing > positions[lead] * facing) ? index : lead, undefined);
      const cameraIndex = ranged < 0 ? front : allies[ranged];
      const side = perspective === state.hostId ? 0 : 1;
      const travel = elapsed < 0 ? 0 : interpolateCameraTravel(fromFrame?.cameraTravel?.[side], next?.cameraTravel?.[side], blend);
      const startingCamera = next?.cameraWorld?.[side] === undefined ? undefined : next.cameraWorld[side] - (next.cameraTravel?.[side] ?? 0);
      const cameraWorld = interpolateCameraTravel(fromFrame?.cameraWorld?.[side] ?? startingCamera, next?.cameraWorld?.[side], elapsed < 0 ? 0 : blend);
      if (state.arena && travel !== undefined) scroll = travel * 0.75;
      else if (viewport && cameraIndex !== undefined) {
        const id = travel === undefined ? state.fighters[cameraIndex].id : perspective;
        const x = cameraWorld ?? travel ?? positions[cameraIndex] * facing;
        if (camera?.id === id && (camera.key === state.playbackKey || (state.adventure && cameraWorld !== undefined))) {
          scroll += (x - camera.x) * 0.75;
        }
        else if (state.arena && camera?.key !== state.playbackKey) scroll = 0;
        camera = { id, x, key: state.playbackKey };
      }
      const backgroundScroll = scroll;
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
      if (viewport) {
        const allyPositions = allies.map(index => positions[index] * facing);
        const allyAlive = (slot: number) => alive(allies[slot]);
        const enemyWorld = opponents.map(index => positions[index] * facing);
        const anchor = cameraWorld ?? (cameraIndex === undefined ? allyPositions[0] ?? 0 : positions[cameraIndex] * facing);
        const view = framing.view(anchor, livingAllies, width, formation, time / 1000);
        const screens = view.party(allyPositions, allyAlive, true);
        const enemyScreens = view.party(enemyWorld, slot => alive(opponents[slot]));
        const displayedAllies = allyMotion.update(alliesRegroup ? "regroup" : "combat", time / 1000, width,
          allies.map((index, slot) => ({ id: state.fighters[index].id, x: screens[slot], home: formation.home(slot) })));
        allies.forEach((index, slot) => {
          positions[index] = displayedAllies[slot].x;
          if (alliesRegroup || displayedAllies[slot].transitioning) {
            movement[index] = displayedAllies[slot].direction || (alliesRegroup && state.adventure && state.playing ? 1 : 0);
          }
        });
        if (state.arena) {
          const enemyFormation = adventureFormation(width, height, opponents.length, allies.length);
          const displayedOpponents = enemyMotion.update(opponentsRegroup ? "regroup" : "combat", time / 1000, width,
            opponents.map((index, slot) => ({ id: state.fighters[index].id, x: enemyScreens[slot], home: width - enemyFormation.home(slot) })));
          opponents.forEach((index, slot) => {
            positions[index] = displayedOpponents[slot].x;
            if (opponentsRegroup) movement[index] = displayedOpponents[slot].direction;
          });
        } else opponents.forEach((index, slot) => { positions[index] = enemyScreens[slot]; });
      }
      ctx.save();
      ctx.textAlign = "center";
      for (let index = 0; index < state.fighters.length; index++) {
        const fighter = state.fighters[index], hp = last?.hp[index] ?? fighter.hp ?? fighter.stats.hp, mp = last?.mp[index] ?? fighter.mp ?? fighter.stats.mp;
        if ((fighter.spawnAt ?? 0) > Math.max(0, elapsed)) continue;
        const direction = fighter.userId === perspective ? 1 : -1;
        if (hp <= 0) {
          if (!fighter.weapon) continue;
          const diedAt = playbackIndex.deaths.get(index);
          const fromCurrentBattle = (fighter.hp ?? fighter.stats.hp) > 0 && diedAt !== undefined;
          const age = fromCurrentBattle ? visualTime - diedAt : Infinity;
          if (age >= 0 && age < characterDeathSeconds && !deathFrames.has(fighter.id)) {
            deathFrames.set(fighter.id, { x: positions[index] / width, at: time - age * 1000 });
          }
          const death = deathFrames.get(fighter.id);
          if (!death) continue;
          const deathAge = fromCurrentBattle ? age : (time - death.at) / 1000;
          if (deathAge >= characterDeathSeconds) { deathFrames.delete(fighter.id); continue; }
          ctx.save(); ctx.translate(death.x * width, ground); ctx.scale(avatarScale, avatarScale);
          applyCharacterDeath(ctx, deathAge, direction);
          drawCharacter(ctx, fighter.weapon, { facing: direction });
          ctx.restore();
          continue;
        }
        deathFrames.delete(fighter.id);
        const statuses = activeCombatStatuses(last ? last.statusEnds?.[index] : fighter.statusEnds, visualTime, last?.statuses?.[index]);
        const immobilized = statuses.includes("stun") || statuses.includes("freeze");
        const skill = latestDuelAction(playbackIndex.skills.get(index), elapsed);
        const offensiveAction = latestDuelAction(playbackIndex.attacks.get(index), elapsed);
        const attack = fighter.enemyType && (skill?.kind === "heal" || skill?.kind === "buff") && skill.at >= (offensiveAction?.at ?? -Infinity)
          ? skill : offensiveAction;
        const age = attack ? elapsed - attack.at : Infinity;
        const swing = !immobilized && age < 0.45 ? Math.sin(Math.max(0, age) / 0.45 * Math.PI) : 0;
        const x = positions[index] + (fighter.stats.range === "melee" && !isRangedSkill(attack?.label) ? direction * swing * 14 : 0);
        const regrouping = fighter.userId === perspective ? alliesRegroup : opponentsRegroup;
        const walkDirection = !immobilized && (state.playing || regrouping) ? movement[index] : 0;
        const walking = walkDirection !== 0;
        if (state.adventure && (x < -150 || x > width + 150)) continue;
        ctx.save(); ctx.translate(x, ground); ctx.scale(avatarScale, avatarScale);
        if (fighter.weapon) drawCharacter(ctx, fighter.weapon, { facing: walkDirection || direction, stride: walking ? Math.sin(time / 190 + index) : 0, swing });
        else if (fighter.enemyType) drawArenaEnemy(ctx, fighter.enemyType, Math.max(0, elapsed), walking, swing, direction);
        ctx.restore();
        drawFighterStatuses(ctx, statuses, x, ground, avatarScale, visualTime);
        const activeSkill = skill && elapsed < (skill.castEndsAt ?? skill.at + BATTLE_SKILL_LABEL_SECONDS) ? battleSkillName(skill) : undefined;
        const castProgress = activeSkill && skill?.kind === "cast" && skill.castEndsAt !== undefined
          ? (elapsed - skill.at) / Math.max(0.001, skill.castEndsAt - skill.at) : undefined;
        drawFighterHud(ctx, x, ground, avatarScale, ground - (fighter.weapon ? 72 : 55) * avatarScale, {
          name: fighter.name, hp, maxHp: fighter.stats.hp, mp, maxMp: fighter.stats.mp, enemy: direction === -1, skill: activeSkill, castProgress,
          statuses,
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
