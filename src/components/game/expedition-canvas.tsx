"use client";
import { drawCharacter } from "./character-design";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStoreApi } from "./game-store";
import { type Character, type AccountProgress } from "@/lib/character";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import type { EnemyEncounter, BattleResult, BattleStep } from "@/lib/encounter";
import { CharacterRoster } from "./character-roster";
import { CollectionPanel } from "./collection-panel";
import { battleHudLayout } from "./battle-hud-layout";
import { isRangedSkill } from "@/lib/skill-range";
import { drawCombatEffect, type CombatEffect } from "./combat-effects";

export function ExpeditionCanvas({ location, team, gold, characterName, characters, progression }: {
  location: "meadow" | "forest"; team: (Character | null)[]; gold: number;
  characterName: string; characters: Character[]; progression: AccountProgress;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState(() => battleHudLayout(950, 300));
  const returnRef = useRef<HTMLButtonElement>(null);
  const focused = useRef(false);
  const characterFocused = useRef(false);
  const paused = useRef(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState<"Shop" | "Artifacts" | null>(null);
  const overlayOpen = rosterOpen || collectionOpen !== null;
  const [returnError, setReturnError] = useState("");
  const returning = useRef(false);
  const store = useGameStoreApi();
  const session = useSession();
  const userId = session.data?.user.id;
  const client = useQueryClient();
  const returnToRoom = useCallback(async () => {
    if (returning.current) return;
    returning.current = true; paused.current = true; setReturnError("");
    try {
      await api<void>("/encounters/return", { method: "POST" });
      store.getState().returnToRoom();
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : "Could not return. Try again.");
      paused.current = false;
    } finally { returning.current = false; }
  }, [store]);
  const goldRef = useRef(gold);
  const charactersRef = useRef(characters);
  useEffect(() => { charactersRef.current = characters; }, [characters]);
  const nameRef = useRef(characterName);
  const progressRef = useRef(progression);
  useEffect(() => { goldRef.current = gold; }, [gold]);
  useEffect(() => { nameRef.current = characterName; progressRef.current = progression; }, [characterName, progression]);
  useEffect(() => { if (!overlayOpen) returnRef.current?.focus({ preventScroll: true }); }, [overlayOpen]);

  function closeRoster() { paused.current = false; setRosterOpen(false); }
  function closeCollection() { paused.current = false; setCollectionOpen(null); }

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const forest = location === "forest";
    const members = team.flatMap((character, slot) => character ? [{ character: charactersRef.current.find((owned) => owned.id === character.id) ?? character, slot }] : []);
    let width = 1, height = 1, ratio = 1, frame = 0, last = 0, distance = 0, elapsed = 0;
    const spawnDelay = () => 1 + Math.random() * 14;
    let teamHp = members.map(({ character }) => character.stats?.hp ?? 100);
    let teamMp = members.map(({ character }) => character.stats?.mp ?? 0);
    const memberPositions: number[] = [];
    let alive = true, spawning = false, firstSpawn = true, nextSpawn = spawnDelay(), message = "", messageUntil = 0;
    type Monster = {
      data: EnemyEncounter; x: number; moving?: boolean; stage: "approach" | "ready" | "waiting" | "fighting" | "result";
      hp: number; teamHp: number[]; teamMp: number[]; casts: NonNullable<BattleStep["teamCasting"]>; battle?: BattleResult; step: number; nextStep: number; until: number; lastHit?: BattleStep; battleStartedAt: number; lastHitAt: number;
    };
    let effects: CombatEffect[] = [];
    const battleLog: { actor: string; detail: string }[] = [];
    let foe: Monster | null = null, monsters: Monster[] = [], activeGroup: Monster[] = [];
    let meadowProgress: { defeated: number; target: number | null } = { defeated: 0, target: null };

    function failed(error: unknown, resetBattle = false) {
      message = error instanceof Error ? error.message : "Encounter unavailable. Please try again.";
      messageUntil = elapsed + 6; nextSpawn = elapsed + spawnDelay();
      if (resetBattle) { monsters = monsters.filter((monster) => !activeGroup.includes(monster)); activeGroup = []; foe = null; }
    }
    async function spawn() {
      // Resolution is computed before playback ends; keep the on-screen boss
      // exclusive even after its server encounter has already been resolved.
      if (monsters.some((monster) => monster.data.boss)) return;
      spawning = true;
      nextSpawn = elapsed + spawnDelay();
      try {
        const data = await api<EnemyEncounter>("/encounters", { method: "POST", body: JSON.stringify({ location, teamIds: members.map(({ character }) => character.id), newExpedition: firstSpawn, wave: true }) });
        if (!alive) return;
        firstSpawn = false;
        const progress = forest ? data.forestProgress : data.meadowProgress;
        if (progress) meadowProgress = progress;
        [data, ...(data.additionalEnemies ?? [])].forEach((enemy, index) => {
          monsters.push({ data: enemy, x: 1.08 + index * 0.08, stage: "approach", hp: enemy.stats.hp, teamHp: [...teamHp], teamMp: [...teamMp], casts: [], step: 0, nextStep: 0, until: 0, battleStartedAt: 0, lastHitAt: 0 });
        });
      } catch (error) { if (alive) failed(error); }
      finally { spawning = false; }
    }
    async function fight(group: Monster[]) {
      activeGroup = group; const encounter = group[0]; foe = encounter;
      encounter.teamHp = [...teamHp]; encounter.teamMp = [...teamMp];
      for (const monster of group) monster.stage = "waiting";
      try {
        const battle = await api<BattleResult>("/encounters/resolve", { method: "POST", body: JSON.stringify({ encounterIds: group.map((monster) => monster.data.id) }) });
        void client.invalidateQueries({ queryKey: ["character", userId] });
        if (!alive || foe !== encounter) return;
        goldRef.current = battle.gold; progressRef.current = battle.progression; encounter.battle = battle; encounter.stage = "fighting";
        teamHp = battle.initialTeamHp ?? teamHp; teamMp = battle.initialTeamMp ?? teamMp;
        encounter.teamHp = [...teamHp]; encounter.teamMp = [...teamMp];
        const progress = forest ? battle.forestProgress : battle.meadowProgress;
        if (progress) meadowProgress = progress;
        for (const monster of group) monster.stage = "fighting";
        encounter.battleStartedAt = elapsed; encounter.nextStep = elapsed + (battle.steps[0]?.at ?? 0.45);
      } catch (error) { if (alive) failed(error, true); }
    }
    function resize() {
      if (!canvas) return;
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      setHud(battleHudLayout(width, height));
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    function visibility() { last = 0; }
    document.addEventListener("visibilitychange", visibility);
    function random(seed: number) { const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); }
    function rect(x: number, y: number, w: number, h: number, color: string) {
      ctx!.fillStyle = color; ctx!.fillRect(x, y, w, h);
    }
    function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
      ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 10); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
    }
    function text(value: string, x: number, y: number, font: string, color: string, maxWidth?: number) {
      ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
    }
    function hills(base: number, amplitude: number, speed: number, color: string) {
      const tile = 300, offset = distance * speed, shift = offset % tile;
      ctx!.beginPath(); ctx!.moveTo(-tile, height);
      for (let i = -1; i <= Math.ceil(width / tile) + 1; i++) {
        const x = i * tile - shift;
        if (i === -1) ctx!.lineTo(x, base);
        ctx!.bezierCurveTo(x + tile * 0.3, base - amplitude, x + tile * 0.7, base - amplitude, x + tile, base);
      }
      ctx!.lineTo(width + tile, height); ctx!.closePath(); ctx!.fillStyle = color; ctx!.fill();
    }
    function trees(base: number, speed: number, tile: number, color: string, size: number) {
      const offset = distance * speed, shift = offset % tile, first = Math.floor(offset / tile);
      for (let i = -1; i <= Math.ceil(width / tile) + 1; i++) {
        const seed = first + i, x = i * tile - shift + random(seed) * tile * 0.4;
        const treeHeight = (110 + random(seed + 11) * 100) * size;
        rect(x - 7 * size, base - treeHeight, 14 * size, treeHeight, forest ? "#344e3a" : "#617757");
        ctx!.fillStyle = color;
        for (let branch = 0; branch < 3; branch++) {
          const y = base - treeHeight + branch * treeHeight * 0.18;
          ctx!.beginPath(); ctx!.moveTo(x, y - treeHeight * 0.25);
          ctx!.lineTo(x + treeHeight * 0.28, y + treeHeight * 0.35); ctx!.lineTo(x - treeHeight * 0.28, y + treeHeight * 0.35); ctx!.fill();
        }
      }
    }
    function draw(time: number) {
      if (!ctx) return;
      if (paused.current) { last = time; frame = requestAnimationFrame(draw); return; }
      const dt = document.hidden ? 0 : Math.min((time - (last || time)) / 1000, 0.05); last = time;
      elapsed += dt;
      // Refresh equipped stats without restarting the running expedition.
      members.forEach((member) => { member.character = charactersRef.current.find((owned) => owned.id === member.character.id) ?? member.character; });
      const battling = !!foe && foe.stage !== "approach";
      if (!battling) distance += dt * 90;
      if (!spawning && elapsed >= nextSpawn && !document.hidden && !monsters.some((monster) => monster.data.boss)) void spawn();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const ground = height * 0.78;
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, forest ? "#173d3a" : "#a8d5d2"); sky.addColorStop(1, forest ? "#839c6b" : "#f0ebbb");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = forest ? "#d4dab077" : "#fff0b7"; ctx.beginPath(); ctx.arc(width * 0.78, height * 0.22, Math.min(42, height * 0.08), 0, Math.PI * 2); ctx.fill();
      hills(height * 0.66, height * 0.22, 0.12, forest ? "#3e6552" : "#99b98a");
      hills(height * 0.74, height * 0.19, 0.28, forest ? "#315744" : "#729c72");
      trees(ground, forest ? 0.5 : 0.35, forest ? 140 : 320, forest ? "#244c39" : "#5c8560", Math.min(1.4, height / 600));
      if (forest) trees(ground, 0.78, 230, "#183c30", Math.min(1.8, height / 460));
      rect(0, ground, width, height - ground, forest ? "#514c36" : "#8b7750");
      rect(0, ground, width, 8, forest ? "#72844e" : "#9ab56c");
      rect(0, ground + 8, width, 4, forest ? "#465f37" : "#6a8c4d");
      const tile = 70, shift = distance % tile, first = Math.floor(distance / tile);
      for (let i = -1; i <= Math.ceil(width / tile) + 1; i++) {
        const seed = first + i, x = i * tile - shift, y = ground + 24 + random(seed + 40) * Math.max(10, height - ground - 40);
        rect(x, y, 10 + random(seed) * 12, 3, forest ? "#3d4230" : "#756441");
        if (seed % 2 === 0 || !forest) {
          rect(x + 25, ground - 10, 2, 11, "#547746");
          ctx.fillStyle = forest ? "#c7ba8a" : seed % 2 ? "#f2d79b" : "#e5bdb7";
          ctx.beginPath(); ctx.arc(x + 26, ground - 11, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      const spacing = Math.min(68, width * 0.34 / Math.max(1, members.length - 1));
      const avatarScale = Math.max(0.55, Math.min(2, height / 300, spacing / 43));
      const leadingX = width * 0.16 + (members.length - 1) * spacing;
      const rangedReach = Math.min(width * 0.38, Math.max(150, avatarScale * 170));
      const contactReach = Math.max(38, avatarScale * 35);
      const upcoming = foe?.stage === "fighting" ? foe.battle?.steps[foe.step] : undefined;
      const front = Math.max(...members.flatMap((_, index) => teamHp[index] > 0 ? [memberPositions[index] ?? width * 0.16 + (members.length - 1 - index) * spacing] : []), width * 0.16);
      monsters.forEach((monster) => {
        if (monster.hp <= 0 || monster.stage === "result") return;
        const ranged = monster.data.stats.range === "range";
        const victim = upcoming?.actor === "enemy" && activeGroup[upcoming.enemyIndex ?? 0] === monster
          ? members.findIndex(({ character }) => character.id === upcoming.characterId) : -1;
        const targetX = victim >= 0 ? memberPositions[victim] ?? front : front;
        const stop = Math.min(width * 0.94, targetX + (ranged ? rangedReach : contactReach));
        const current = monster.x * width;
        monster.moving = Math.abs(stop - current) > 2;
        monster.x = (current + Math.sign(stop - current) * Math.min(Math.abs(stop - current), dt * 175)) / width;
        // Engage at sight range, but melee attacks wait below until contact.
        if (monster.stage === "approach" && monster.x * width <= leadingX + rangedReach) monster.stage = "ready";
      });
      const memberMoving: boolean[] = [];
      members.forEach(({ character }, index) => {
        const home = width * 0.16 + (members.length - 1 - index) * spacing;
        const nextAction = foe?.battle?.steps.slice(foe.step).find((step) => step.actor === "team" && step.characterId === character.id && step.kind !== "poison");
        const castingAtRange = isRangedSkill(foe?.casts[index]?.name) || isRangedSkill(nextAction?.label);
        const attacking = upcoming?.actor === "team" && upcoming.characterId === character.id ? activeGroup[upcoming.enemyIndex ?? 0] : undefined;
        const target = attacking ?? monsters.find((monster) => monster.hp > 0 && monster.stage !== "approach" && monster.stage !== "result");
        const desired = castingAtRange ? memberPositions[index] ?? home : target && character.stats?.range !== "range" && teamHp[index] > 0
          ? Math.max(home, target.x * width - contactReach) : home;
        const current = memberPositions[index] ?? home;
        memberMoving[index] = Math.abs(desired - current) > 2;
        memberPositions[index] = current + Math.sign(desired - current) * Math.min(Math.abs(desired - current), dt * 320);
      });
      if (!foe) {
        const ready = monsters.filter((monster) => monster.stage === "ready");
        if (ready.length) void fight(ready);
      }
      if (foe) {
        if (foe.stage === "fighting" && foe.battle && elapsed >= foe.nextStep) {
          while (foe.stage === "fighting" && elapsed >= foe.nextStep) {
          const pending = foe.battle.steps[foe.step];
          if (pending && pending.damage > 0 && pending.kind !== "poison") {
            const member = members.findIndex(({ character }) => character.id === pending.characterId);
            const enemy = activeGroup[pending.enemyIndex ?? 0];
            const ranged = pending.actor === "enemy" ? enemy?.data.stats.range === "range"
              : members[member]?.character.stats?.range === "range" || isRangedSkill(pending.label);
            if (!ranged && member >= 0 && enemy && Math.abs(enemy.x * width - memberPositions[member]) > contactReach + 8) {
              foe.battleStartedAt += dt;
              foe.nextStep += dt;
              break;
            }
          }
          const step = foe.battle.steps[foe.step++];
          if (step) {
            const memberIndex = members.findIndex(({ character }) => character.id === step.characterId);
            const enemy = activeGroup[step.enemyIndex ?? 0];
            const actor = step.actor === "enemy" ? enemy?.data.name ?? "Enemy" : members[memberIndex]?.character.name ?? "Ally";
            const detail = (step.label ?? "Attack") + (step.damage ? ` -${step.damage} HP` : "")
              + (step.healing ? ` +${step.healing} HP` : "") + (step.critical ? " · Critical" : "");
            battleLog.unshift({ actor, detail });
            battleLog.length = Math.min(battleLog.length, 5);
            if (memberIndex >= 0 && enemy) {
              const character = members[memberIndex].character;
              const playerX = memberPositions[memberIndex];
              effects.push({ step, startedAt: elapsed, enemyId: enemy.data.id,
                source: step.actor === "team" ? playerX : enemy.x * width,
                target: step.actor === "team" ? enemy.x * width : playerX,
                weapon: character.weapon, ranged: step.actor === "team" ? character.stats?.range === "range" || isRangedSkill(step.label) : enemy.data.stats.range === "range" });
            }
            foe.hp = step.enemyHp; foe.teamHp = step.teamHp; foe.teamMp = step.teamMp ?? foe.teamMp;
            teamHp = [...foe.teamHp]; teamMp = [...foe.teamMp];
            foe.casts = step.teamCasting ?? []; foe.lastHit = step; foe.lastHitAt = elapsed;
            activeGroup.forEach((monster, index) => {
              monster.hp = step.enemyHps?.[index] ?? (index === 0 ? step.enemyHp : monster.hp);
              monster.lastHit = step; monster.lastHitAt = elapsed;
            });
          }
          const teamDefeated = foe.teamHp.length > 0 && foe.teamHp.every((hp) => hp <= 0);
          const battleLost = foe.step >= foe.battle.steps.length && !foe.battle.won;
          if (teamDefeated || battleLost) {
            void returnToRoom();
            frame = requestAnimationFrame(draw);
            return;
          }
          if (foe.step >= foe.battle.steps.length) {
            for (const monster of activeGroup) monster.stage = "result";
            foe.until = elapsed + 1.5;
          }
          else foe.nextStep = foe.battleStartedAt + (foe.battle.steps[foe.step].at ?? foe.step * 0.45 + 0.45);
          }
        } else if (foe.stage === "result" && elapsed >= foe.until) {
          if (!foe.battle?.won) { void returnToRoom(); }
          if (activeGroup.some((monster) => monster.data.boss)) nextSpawn = elapsed + spawnDelay();
          monsters = monsters.filter((monster) => !activeGroup.includes(monster));
          activeGroup = []; foe = null;
        }
      }
      // Keep the formation on the left, with Front slots leading toward the right.
      members.forEach(({ character, slot }, index) => {
        const x = memberPositions[index];
        const health = teamHp[index];
        const action = [...effects].reverse().find((effect) => effect.step.characterId === character.id && effect.step.actor === "team" && effect.step.kind !== "poison" && elapsed - effect.startedAt < 0.4);
        const swing = action ? Math.sin(Math.min(1, (elapsed - action.startedAt) / 0.4) * Math.PI) : 0;
        const rangedAction = action?.ranged || action?.step.kind === "cast";
        const phase = elapsed * 9 + index * 0.7, stride = health <= 0 || (battling && !memberMoving[index]) ? 0 : Math.sin(phase), bob = Math.abs(stride) * 1.6;
        if (health <= 0) ctx.globalAlpha = 0.3;
        ctx.save(); ctx.translate(x + swing * (rangedAction ? -3 : 12) * avatarScale, ground - 1 - bob * avatarScale); ctx.scale(avatarScale, avatarScale);
        drawCharacter(ctx, character.weapon, { stride, swing: swing * (rangedAction ? -0.2 : 1) }); ctx.restore();
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        text(character.name, x, ground - 92 * avatarScale, "600 12px system-ui", forest ? "#eef0cf" : "#173c2e", Math.max(28, spacing - 6));
        text(`${slot < 3 ? "Front" : "Back"} ${slot % 3 + 1}`, x, ground + 25 * avatarScale, "10px system-ui", "#f1ebce", Math.max(28, spacing - 6));
        ctx.textAlign = "left";
        {
          const barWidth = Math.max(24, Math.min(52, spacing - 4));
          rect(x - barWidth / 2, ground - 84 * avatarScale, barWidth, 4, "#392c29");
          rect(x - barWidth / 2, ground - 84 * avatarScale, barWidth * Math.min(1, health / (character.stats?.hp ?? 100)), 4, "#9cce7e");
          const maxMp = character.stats?.mp ?? 0;
          if (maxMp > 0) {
            rect(x - barWidth / 2, ground - 78 * avatarScale, barWidth, 3, "#26383e");
            rect(x - barWidth / 2, ground - 78 * avatarScale, barWidth * Math.min(1, teamMp[index] / maxMp), 3, "#7cbad1");
          }
          const cast = foe?.casts[index];
          if (cast && health > 0 && foe) {
            const progress = Math.max(0, Math.min(1, (elapsed - foe.battleStartedAt - cast.startedAt) / (cast.endsAt - cast.startedAt)));
            rect(x - barWidth / 2, ground - 72 * avatarScale, barWidth, 3, "#403d2a");
            rect(x - barWidth / 2, ground - 72 * avatarScale, barWidth * progress, 3, "#f0d68a");
          }
        }
      });
      for (const monster of monsters) {
        const foe = monster;
        const x = foe.x * width, size = Math.max(1, Math.min(2, height / 300)) * (foe.data.boss ? 1.45 : 1);
        const attack = [...effects].reverse().find((effect) => effect.enemyId === foe.data.id && effect.step.actor === "enemy" && elapsed - effect.startedAt < 0.45);
        const attackProgress = attack ? Math.min(1, (elapsed - attack.startedAt) / 0.45) : 0;
        const strike = attack && foe.hp > 0 ? Math.sin(attackProgress * Math.PI) : 0;
        const ranged = foe.data.stats.range === "range";
        if (foe.hp <= 0) ctx.globalAlpha = 0.25;
        ctx.save(); ctx.translate(x + strike * (ranged ? 3 : -14) * size, ground - 1 - (foe.data.type === "slime" ? strike * 7 * size : 0)); ctx.scale(-size, size);
        ctx.rotate(strike * (ranged ? -0.08 : 0.16));
        if (foe.data.type === "slime") ctx.scale(1 + strike * 0.22, 1 - strike * 0.16);
        const stride = foe.hp > 0 && foe.moving ? Math.sin(elapsed * 10) : 0;
        if (foe.data.type === "boar" || foe.data.type === "mutant-boar") {
          rect(-16 + stride * 3, -11, 7, 12, "#4d382a"); rect(8 - stride * 3, -11, 7, 12, "#4d382a");
          ctx.fillStyle = foe.data.boss ? "#81576d" : "#916445"; ctx.beginPath(); ctx.ellipse(-2, -22, 25, 16, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#755039"; ctx.beginPath(); ctx.ellipse(20, -21, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
          rect(14, -29, 4, 4, "#242b20");
          ctx.fillStyle = "#5e4230"; ctx.beginPath(); ctx.moveTo(10, -34); ctx.lineTo(8, -45); ctx.lineTo(20, -34); ctx.fill();
          ctx.fillStyle = "#f1e4bd"; ctx.beginPath(); ctx.moveTo(24, -16); ctx.lineTo(32, -25); ctx.lineTo(30, -12); ctx.fill();
          rect(-20, -37, 28, 5, "#60442f");
          if (foe.data.boss) {
            ctx.fillStyle = "#e4d3a8"; ctx.beginPath(); ctx.moveTo(-4, -37); ctx.lineTo(3, -57); ctx.lineTo(9, -37); ctx.fill();
            rect(14, -29, 4, 4, "#e17662");
          }
        } else if (foe.data.type === "slime") {
          const bounce = foe.stage === "approach" ? Math.abs(stride) * 5 : 0;
          ctx.fillStyle = "#6cba75"; ctx.beginPath(); ctx.ellipse(0, -14 - bounce, 24 + bounce * 0.3, 17 - bounce * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#a4db93"; ctx.beginPath(); ctx.ellipse(-7, -21 - bounce, 7, 4, -0.3, 0, Math.PI * 2); ctx.fill();
          rect(7, -18 - bounce, 4, 5, "#234b32"); rect(-5, -18 - bounce, 4, 5, "#234b32"); rect(0, -9 - bounce, 5, 2, "#234b32");
        } else if (foe.data.type === "plant") {
          const sway = stride * 3 + strike * 15;
          ctx.strokeStyle = "#4c793c"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -20, sway, -35); ctx.stroke();
          ctx.fillStyle = "#5d943e"; ctx.beginPath(); ctx.ellipse(-12, -13, 14, 5, 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(11, -18, 14, 5, -0.45, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#c57b68"; ctx.beginPath(); ctx.ellipse(sway, -40, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
          rect(sway - 13, -40 - strike * 4, 26, 5 + strike * 9, "#613f36");
          for (let tooth = 0; tooth < 4; tooth++) {
            rect(sway - 10 + tooth * 6, -40 - strike * 4, 3, 3, "#eee4bc");
            rect(sway - 10 + tooth * 6, -38 + strike * 5, 3, 3, "#eee4bc");
          }
        } else {
        rect(-10 + stride * 3, -9, 7, 10, "#5c442f"); rect(3 - stride * 3, -9, 7, 10, "#5c442f");
        ctx.fillStyle = foe.data.type === "warrior" ? "#9c7145" : "#b48b58";
        ctx.beginPath(); ctx.ellipse(0, -26, 17, 21, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#614b32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(-16, -25, -5, -7); ctx.moveTo(4, -45); ctx.quadraticCurveTo(14, -23, 5, -6); ctx.stroke();
        rect(-17, -45, 34, 7, "#576d3f"); rect(4, -32, 4, 4, "#272e23"); rect(-7, -32, 4, 4, "#272e23");
        if (foe.data.type === "coco-klan-chief") {
          rect(-19, -46, 38, 7, "#d4b56d");
          ctx.fillStyle = "#e9cf83";
          for (let point = 0; point < 3; point++) {
            const crownX = -16 + point * 12;
            ctx.beginPath(); ctx.moveTo(crownX, -45); ctx.lineTo(crownX + 5, -60); ctx.lineTo(crownX + 10, -45); ctx.fill();
          }
          rect(-16, -22, 32, 6, "#78527e");
        }
        ctx.save(); ctx.translate(13, -29); ctx.rotate(strike * (ranged ? -1.8 : 1.5));
        rect(-3, -1, 7, 16, "#9c7145");
        if (foe.data.type === "warrior") { rect(5, -8, 4, 36, "#62452c"); rect(1, -15, 13, 12, "#a2a58a"); }
        else {
          ctx.strokeStyle = "#dbc39a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, 4); ctx.lineTo(14, -10); ctx.lineTo(7, 16); ctx.stroke();
          if (strike > 0.3) { ctx.fillStyle = "#d8c29a"; ctx.beginPath(); ctx.arc(14, -10, 4, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        text(`${foe.data.boss ? "BOSS · " : ""}${foe.data.name}`, x, ground - 67 * size, "600 12px system-ui", foe.data.boss ? forest ? "#f0d68a" : "#7c2836" : forest ? "#f1ebce" : "#173c2e", Math.min(190, width * 0.44));
        rect(x - 36, ground - 51 * size, 72, 6, "#392c29"); rect(x - 36, ground - 51 * size, 72 * foe.hp / foe.data.stats.hp, 6, "#d77e66");
        text(`${foe.hp}/${foe.data.stats.hp} HP`, x, ground - 51 * size - 7, "10px system-ui", "#f1ebce");
        if (foe.stage === "result" && foe.battle) {
          text(`+${foe.battle.goldEarned} gold · +${foe.battle.expEarned} EXP`, x, ground - 88 * size, "600 18px system-ui", "#f0d68a", width * 0.55);
          if (foe.battle.wishEarned) text(`Level up! Lv.${foe.battle.progression.level} · +${foe.battle.wishEarned} wish`, x, ground - 104 * size, "600 17px system-ui", "#f0d68a", width * 0.55);
        }
        ctx.textAlign = "left";
      }
      effects = effects.filter((effect) => elapsed - effect.startedAt < 0.9);
      for (const effect of effects) drawCombatEffect(ctx, effect, elapsed - effect.startedAt, ground, avatarScale, (id) => {
        const index = members.findIndex(({ character }) => character.id === id);
        return index < 0 ? undefined : memberPositions[index];
      });
      const layout = battleHudLayout(width, height);
      const nameX = layout.pad + 12, nameTop = layout.pad;
      box(layout.pad, nameTop, layout.nameWidth, layout.nameHeight, "#102c26e8", "#708360");
      text(nameRef.current, nameX, nameTop + (layout.compact ? layout.nameHeight * 0.31 : 27), `600 ${layout.compact ? 14 : 17}px system-ui`, "#f1ebce", layout.nameWidth - 24);
      text(`${forest ? "Forest" : "Meadow"} · ${Math.floor(distance / 16)} m`, nameX, nameTop + (layout.compact ? layout.nameHeight * 0.59 : 49), `${layout.compact ? 10 : 12}px system-ui`, "#c1cda9", layout.nameWidth - 24);
      text(`Boss: ${meadowProgress.defeated}/${meadowProgress.target ?? "38–45"}`, nameX, nameTop + (layout.compact ? layout.nameHeight * 0.84 : 70), `${layout.compact ? 10 : 12}px system-ui`, "#e4d895", layout.nameWidth - 24);
      if (!layout.compact) battleLog.forEach((entry, index) => {
        const y = layout.logY + index * (layout.rowHeight + layout.rowGap);
        box(layout.pad, y, layout.nameWidth, layout.rowHeight, "#102c26e8", "#708360");
        text(`${entry.actor}: ${entry.detail}`, nameX, y + layout.rowHeight / 2 + 3, `600 ${layout.compact ? 10 : 12}px system-ui`, index === 0 ? "#e4d895" : "#c1cda9", layout.nameWidth - 24);
      });
      const progress = progressRef.current, progressWidth = Math.min(220, width - layout.pad * 2);
      const hudTop = layout.progressY, compactHud = layout.compact;
      box(layout.pad, hudTop, progressWidth, layout.progressHeight, "#102c26ed", "#b8a76d");
      text(`Gold: ${goldRef.current}`, nameX, hudTop + (compactHud ? layout.progressHeight * 0.28 : 26), `600 ${compactHud ? 11 : 15}px system-ui`, "#e4d895", compactHud ? 100 : progressWidth - 28);
      text(compactHud ? `Lv. ${progress.level}` : `Account Lv. ${progress.level}`, compactHud ? layout.pad + 126 : nameX, hudTop + (compactHud ? layout.progressHeight * 0.28 : 50), `600 ${compactHud ? 11 : 14}px system-ui`, "#f1ebce", compactHud ? 76 : progressWidth - 28);
      text(`EXP: ${progress.exp}/${progress.expToNextLevel}`, nameX, hudTop + (compactHud ? layout.progressHeight * 0.58 : 74), `${compactHud ? 10 : 12}px system-ui`, "#c1cda9", progressWidth - 28);
      rect(nameX, hudTop + (compactHud ? layout.progressHeight * 0.72 : 88), progressWidth - 28, 6, "#365642");
      rect(nameX, hudTop + (compactHud ? layout.progressHeight * 0.72 : 88), (progressWidth - 28) * progress.exp / progress.expToNextLevel, 6, "#d7c981");
      if (message && elapsed < messageUntil) text(message, layout.pad, height - layout.progressHeight - 24, "11px system-ui", "#ffcebb", width - 32);
      const controls = [...layout.controls, { ...layout.returnButton, label: "Return to room" }];
      for (const control of controls) {
        const active = control.label === "Character" ? characterFocused.current : control.label === "Return to room" ? focused.current : false;
        box(control.x, control.y, control.width, control.height, "#102c26ed", active ? "#fff0b8" : "#708360");
        ctx.textAlign = "center";
        text(control.label, control.x + control.width / 2, control.y + control.height / 2 + 4, `600 ${layout.fontSize}px system-ui`, "#f1ebce", control.width - 12);
        ctx.textAlign = "left";
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw); returnRef.current?.focus({ preventScroll: true });
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [location, team, client, userId, returnToRoom]);

  return <div className="relative h-full w-full overflow-hidden bg-[#173d3a]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); if (rosterOpen) closeRoster(); else if (collectionOpen) closeCollection(); else void returnToRoom(); }
  }}>
    <div inert={overlayOpen} className="h-full w-full">
    <canvas ref={canvasRef} role="img" aria-label={`Your team is automatically walking from left to right through an endless ${location}.`} className="block h-full w-full" />
    <button ref={returnRef} type="button" style={{ left: hud.returnButton.x, top: hud.returnButton.y, width: hud.returnButton.width, height: hud.returnButton.height }} onClick={() => void returnToRoom()} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }} className="absolute cursor-pointer rounded-xl outline-none"><span className="sr-only">Return to room</span></button>
    {returnError && <p role="alert" className="absolute top-40 left-4 rounded bg-[#102c26] p-3 text-sm text-red-200">{returnError} Use Return to room to retry.</p>}
    <button type="button" style={{ left: hud.controls[0].x, top: hud.controls[0].y, width: hud.controls[0].width, height: hud.controls[0].height }} aria-label="Character" aria-expanded={rosterOpen} onClick={() => { paused.current = true; setRosterOpen(true); }} onFocus={() => { characterFocused.current = true; }} onBlur={() => { characterFocused.current = false; }} className="absolute cursor-pointer rounded-xl outline-none"><span className="sr-only">Character</span></button>
    <p role="status" className="sr-only">{characterName}. Gold {gold}. Account level {progression.level}. EXP {progression.exp} of {progression.expToNextLevel}.</p>
    {hud.controls.slice(1).map((control) => <button key={control.label} type="button" style={{ left: control.x, top: control.y, width: control.width, height: control.height }} aria-label={control.label} aria-expanded={collectionOpen === control.label} onClick={() => { if (control.label === "Shop" || control.label === "Artifacts") { paused.current = true; setCollectionOpen(control.label); } }} className="absolute cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]"><span className="sr-only">{control.label}</span></button>)}
    </div>
    {rosterOpen && <CharacterRoster characters={characters} onClose={closeRoster} />}
    {collectionOpen && <CollectionPanel title={collectionOpen} onClose={closeCollection} />}
  </div>;
}
