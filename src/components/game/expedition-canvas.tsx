"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStoreApi } from "./game-store";
import { weaponDetails, type Character, type AccountProgress } from "@/lib/character";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import type { EnemyEncounter, BattleResult, BattleStep } from "@/lib/encounter";
import { CharacterRoster } from "./character-roster";

export function ExpeditionCanvas({ location, team, gold, characterName, characters, progression }: {
  location: "meadow" | "forest"; team: (Character | null)[]; gold: number;
  characterName: string; characters: Character[]; progression: AccountProgress;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);
  const focused = useRef(false);
  const characterFocused = useRef(false);
  const paused = useRef(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const store = useGameStoreApi();
  const session = useSession();
  const userId = session.data?.user.id;
  const client = useQueryClient();
  const goldRef = useRef(gold);
  const nameRef = useRef(characterName);
  const progressRef = useRef(progression);
  useEffect(() => { goldRef.current = gold; }, [gold]);
  useEffect(() => { nameRef.current = characterName; progressRef.current = progression; }, [characterName, progression]);
  useEffect(() => { if (!rosterOpen) returnRef.current?.focus({ preventScroll: true }); }, [rosterOpen]);

  function closeRoster() { paused.current = false; setRosterOpen(false); }

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const forest = location === "forest";
    const members = team.flatMap((character, slot) => character ? [{ character, slot, weapon: new Path2D(weaponDetails(character.weapon).path) }] : []);
    let width = 1, height = 1, ratio = 1, frame = 0, last = 0, distance = 0, elapsed = 0;
    const spawnDelay = () => 5 + Math.random() * 10;
    let teamHp = members.map(({ character }) => character.stats?.hp ?? 100);
    let teamMp = members.map(({ character }) => character.stats?.mp ?? 0);
    let alive = true, spawning = false, firstSpawn = true, nextSpawn = spawnDelay(), message = "", messageUntil = 0;
    type Monster = {
      data: EnemyEncounter; x: number; stage: "approach" | "ready" | "waiting" | "fighting" | "result";
      hp: number; teamHp: number[]; teamMp: number[]; casts: NonNullable<BattleStep["teamCasting"]>; battle?: BattleResult; step: number; nextStep: number; until: number; lastHit?: BattleStep; battleStartedAt: number; lastHitAt: number;
    };
    let foe: Monster | null = null, monsters: Monster[] = [], activeGroup: Monster[] = [];
    let meadowProgress: { defeated: number; target: number | null } = { defeated: 0, target: null };

    function failed(error: unknown, resetBattle = false) {
      message = error instanceof Error ? error.message : "Encounter unavailable. Please try again.";
      messageUntil = elapsed + 6; nextSpawn = elapsed + spawnDelay();
      if (resetBattle) { monsters = monsters.filter((monster) => !activeGroup.includes(monster)); activeGroup = []; foe = null; }
    }
    async function spawn() {
      spawning = true;
      nextSpawn = elapsed + spawnDelay();
      try {
        const data = await api<EnemyEncounter>("/encounters", { method: "POST", body: JSON.stringify({ location, teamIds: members.map(({ character }) => character.id), newExpedition: firstSpawn }) });
        if (!alive) return;
        firstSpawn = false;
        const progress = forest ? data.forestProgress : data.meadowProgress;
        if (progress) meadowProgress = progress;
        monsters.push({ data, x: 1.08, stage: "approach", hp: data.stats.hp, teamHp: members.map(({ character }) => character.stats?.hp ?? 100), teamMp: members.map(({ character }) => character.stats?.mp ?? 0), casts: [], step: 0, nextStep: 0, until: 0, battleStartedAt: 0, lastHitAt: 0 });
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
      const battling = !!foe && foe.stage !== "approach";
      if (!battling) distance += dt * 90;
      if (!spawning && elapsed >= nextSpawn && !document.hidden) void spawn();
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
      monsters.forEach((monster, index) => {
        if (monster.stage !== "approach") return;
        const reach = monster.data.stats.range === "range" ? Math.max(95, avatarScale * 100) : Math.max(38, avatarScale * 35);
        const stop = Math.min(width * 0.94, leadingX + reach + index * Math.min(58, width * 0.09));
        monster.x = Math.max(stop / width, monster.x - dt * 175 / width);
        if (monster.x * width <= stop + 1) monster.stage = "ready";
      });
      if (!foe) {
        const ready = monsters.filter((monster) => monster.stage === "ready");
        if (ready.length) void fight(ready);
      }
      if (foe) {
        if (foe.stage === "fighting" && foe.battle && elapsed >= foe.nextStep) {
          while (foe.stage === "fighting" && elapsed >= foe.nextStep) {
          const step = foe.battle.steps[foe.step++];
          if (step) {
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
            alive = false;
            store.getState().returnToRoom();
            return;
          }
          if (foe.step >= foe.battle.steps.length) {
            for (const monster of activeGroup) monster.stage = "result";
            foe.until = elapsed + 1.5;
          }
          else foe.nextStep = foe.battleStartedAt + (foe.battle.steps[foe.step].at ?? foe.step * 0.45 + 0.45);
          }
        } else if (foe.stage === "result" && elapsed >= foe.until) {
          if (!foe.battle?.won) { store.getState().returnToRoom(); }
          monsters = monsters.filter((monster) => !activeGroup.includes(monster));
          activeGroup = []; foe = null;
        }
      }
      // Keep the formation on the left, with Front slots leading toward the right.
      members.forEach(({ character, slot, weapon }, index) => {
        const x = width * 0.16 + (members.length - 1 - index) * spacing;
        const health = teamHp[index];
        const phase = elapsed * 9 + index * 0.7, stride = battling ? 0 : Math.sin(phase), bob = Math.abs(stride) * 1.6;
        if (health <= 0) ctx.globalAlpha = 0.3;
        ctx.save(); ctx.translate(x, ground - 1 - bob * avatarScale); ctx.scale(avatarScale, avatarScale);
        ctx.fillStyle = "#16271d55"; ctx.beginPath(); ctx.ellipse(0, 4 + bob, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
        for (const leg of [-1, 1]) {
          ctx.save(); ctx.translate(leg * 6, -12); ctx.rotate(stride * 0.55 * leg);
          rect(-4, 0, 8, 13, "#263c34"); rect(-4, 10, 11, 4, "#1c2d27"); ctx.restore();
        }
        rect(-12, -29, 24, 19, "#cda367"); rect(-9, -44, 18, 17, "#efce9f");
        rect(-13, -47, 26, 7, "#35654d"); rect(-16, -41, 32, 4, "#35654d"); rect(5, -34, 3, 3, "#233b33");
        ctx.save(); ctx.translate(-10, -25); ctx.rotate(-stride * 0.4); rect(-3, 0, 6, 13, "#b68d54"); ctx.restore();
        ctx.save(); ctx.translate(12, -29); ctx.rotate(stride * 0.1); ctx.scale(0.5, 0.5);
        ctx.strokeStyle = "#f0e8c9"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(weapon); ctx.restore();
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        text(character.name, x, ground - 58 * avatarScale, "600 12px system-ui", forest ? "#eef0cf" : "#173c2e", Math.max(28, spacing - 6));
        text(`${slot < 3 ? "Front" : "Back"} ${slot % 3 + 1}`, x, ground + 25 * avatarScale, "10px system-ui", "#f1ebce", Math.max(28, spacing - 6));
        ctx.textAlign = "left";
        {
          const barWidth = Math.max(24, Math.min(52, spacing - 4));
          rect(x - barWidth / 2, ground - 51 * avatarScale, barWidth, 4, "#392c29");
          rect(x - barWidth / 2, ground - 51 * avatarScale, barWidth * health / (character.stats?.hp ?? 100), 4, "#9cce7e");
          const maxMp = character.stats?.mp ?? 0;
          if (maxMp > 0) {
            rect(x - barWidth / 2, ground - 46 * avatarScale, barWidth, 3, "#26383e");
            rect(x - barWidth / 2, ground - 46 * avatarScale, barWidth * teamMp[index] / maxMp, 3, "#7cbad1");
          }
          const cast = foe?.casts[index];
          if (cast && health > 0 && foe) {
            const progress = Math.max(0, Math.min(1, (elapsed - foe.battleStartedAt - cast.startedAt) / (cast.endsAt - cast.startedAt)));
            rect(x - barWidth / 2, ground - 39 * avatarScale, barWidth, 3, "#403d2a");
            rect(x - barWidth / 2, ground - 39 * avatarScale, barWidth * progress, 3, "#f0d68a");
          }
        }
      });
      for (const monster of monsters) {
        const foe = monster;
        const x = foe.x * width, size = Math.max(1, Math.min(2, height / 300)) * (foe.data.boss ? 1.45 : 1);
        if (foe.hp <= 0) ctx.globalAlpha = 0.25;
        ctx.save(); ctx.translate(x, ground - 1); ctx.scale(-size, size);
        const stride = foe.stage === "approach" ? Math.sin(elapsed * 10) : 0;
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
          const sway = stride * 3;
          ctx.strokeStyle = "#4c793c"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -20, sway, -35); ctx.stroke();
          ctx.fillStyle = "#5d943e"; ctx.beginPath(); ctx.ellipse(-12, -13, 14, 5, 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(11, -18, 14, 5, -0.45, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#c57b68"; ctx.beginPath(); ctx.ellipse(sway, -40, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
          rect(sway - 13, -40, 26, 5, "#613f36");
          for (let tooth = 0; tooth < 4; tooth++) rect(sway - 10 + tooth * 6, -40, 3, 3, "#eee4bc");
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
        if (foe.data.type === "warrior") { rect(18, -37, 4, 36, "#62452c"); rect(14, -44, 13, 12, "#a2a58a"); }
        else { ctx.strokeStyle = "#dbc39a"; ctx.beginPath(); ctx.moveTo(14, -25); ctx.lineTo(27, -39); ctx.lineTo(20, -13); ctx.stroke(); }
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
        if (foe.lastHit && foe.stage === "fighting" && (foe.lastHit.enemyIndex ?? 0) === activeGroup.indexOf(foe)) {
          const targetIndex = members.findIndex(({ character }) => character.id === foe!.lastHit!.characterId);
          const targetX = foe.lastHit.actor === "team" ? x : width * 0.16 + (members.length - 1 - targetIndex) * spacing;
          if (foe.lastHit.damage > 0) text(`${foe.lastHit.critical ? "CRIT " : ""}-${foe.lastHit.damage}`, targetX, ground - 78 * size, "600 17px system-ui", foe.lastHit.kind === "poison" ? "#b2de89" : "#ffd1aa");
          if (foe.lastHit.actor === "team" && targetIndex >= 0 && foe.lastHit.damage > 0 && foe.lastHit.kind !== "poison") {
            const attacker = members[targetIndex].character;
            const originX = width * 0.16 + (members.length - 1 - targetIndex) * spacing;
            const progress = Math.max(0, Math.min(1, (elapsed - foe.lastHitAt) / 0.35));
            if (attacker.stats?.range === "range" || ["Fireball", "Inferno", "Throw Spear"].includes(foe.lastHit.label ?? "")) {
              ctx.strokeStyle = ["Fireball", "Inferno"].includes(foe.lastHit.label ?? "") ? "#f2a25a" : "#fff0b8"; ctx.lineWidth = 3; ctx.beginPath();
              const projectileX = originX + (x - originX) * progress;
              ctx.moveTo(projectileX - 8, ground - 30 * size); ctx.lineTo(projectileX + 8, ground - 30 * size); ctx.stroke();
            } else {
              ctx.strokeStyle = "#f0e8c9"; ctx.lineWidth = 3; ctx.beginPath();
              ctx.arc(x, ground - 26 * size, 20 * size, -1.2 + progress, 0.6 + progress); ctx.stroke();
            }
          }
          if (foe.lastHit.kind === "heal") {
            for (const id of foe.lastHit.targetIds ?? []) {
              const recipient = members.findIndex(({ character }) => character.id === id);
              if (recipient >= 0) text("+", width * 0.16 + (members.length - 1 - recipient) * spacing, ground - 70 * size, "600 24px system-ui", "#b5eb99");
            }
          }
          if (foe.lastHit.kind === "block") {
            ctx.strokeStyle = "#c2daf3"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(targetX, ground - 25 * size, 25 * size, -1.4, 1.4); ctx.stroke();
          }
          if (foe.data.stats.range === "range" && foe.lastHit.actor === "enemy") {
            const progress = Math.max(0, Math.min(1, (elapsed - foe.lastHitAt) / 0.35));
            ctx.fillStyle = "#d6cfaf"; ctx.beginPath(); ctx.arc(x + (targetX - x) * progress, ground - 35 * size - Math.sin(progress * Math.PI) * 32, 4, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.textAlign = "left";
      }
      box(16, 16, Math.max(100, Math.min(260, width - 176)), 88, "#102c26e8", "#708360");
      text(nameRef.current, 30, 43, "600 17px system-ui", "#f1ebce", Math.max(72, Math.min(232, width - 204)));
      text(`${forest ? "Forest" : "Meadow"} · ${Math.floor(distance / 16)} m`, 30, 65, "12px system-ui", "#c1cda9", Math.max(80, Math.min(230, width - 202)));
      text(`Boss: ${meadowProgress.defeated}/${meadowProgress.target ?? "25–30"}`, 30, 86, "12px system-ui", "#e4d895", Math.max(80, Math.min(230, width - 202)));
      if (foe?.lastHit?.label && foe.stage !== "approach") {
        const label = foe.lastHit.label + (foe.lastHit.healing ? ` +${foe.lastHit.healing} HP` : "") + (foe.lastHit.critical ? " · Critical" : "");
        box(16, 116, Math.min(420, width - 32), 38, "#102c26e8", "#708360");
        text(label, 28, 140, "600 12px system-ui", "#e4d895", Math.min(396, width - 56));
      }
      const progress = progressRef.current, progressWidth = Math.min(220, width - 32);
      const compactHud = height < 480, hudTop = height - (compactHud ? 88 : 126);
      box(16, hudTop, progressWidth, compactHud ? 72 : 110, "#102c26ed", "#b8a76d");
      text(`Gold: ${goldRef.current}`, 30, hudTop + 26, `600 ${compactHud ? 12 : 15}px system-ui`, "#e4d895", compactHud ? 100 : progressWidth - 28);
      text(compactHud ? `Lv. ${progress.level}` : `Account Lv. ${progress.level}`, compactHud ? 142 : 30, hudTop + (compactHud ? 26 : 50), "600 14px system-ui", "#f1ebce", compactHud ? 76 : progressWidth - 28);
      text(`EXP: ${progress.exp}/${progress.expToNextLevel}`, 30, hudTop + (compactHud ? 46 : 74), "12px system-ui", "#c1cda9", progressWidth - 28);
      rect(30, hudTop + (compactHud ? 56 : 88), progressWidth - 28, 6, "#365642");
      rect(30, hudTop + (compactHud ? 56 : 88), (progressWidth - 28) * progress.exp / progress.expToNextLevel, 6, "#d7c981");
      if (message && elapsed < messageUntil) text(message, 20, height - 142, "12px system-ui", "#ffcebb", width - 40);
      const characterX = width - (width < 640 ? 148 : 264), characterY = width < 640 ? 76 : 16, characterWidth = width < 640 ? 132 : 104;
      box(characterX, characterY, characterWidth, 48, "#102c26ed", characterFocused.current ? "#fff0b8" : "#708360");
      ctx.textAlign = "center"; text("Character", characterX + characterWidth / 2, characterY + 30, "600 13px system-ui", "#f1ebce"); ctx.textAlign = "left";
      box(width - 148, 16, 132, 48, "#102c26ed", focused.current ? "#fff0b8" : "#708360");
      ctx.textAlign = "center"; text("Return to room", width - 82, 46, "600 13px system-ui", "#f1ebce"); ctx.textAlign = "left";
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw); returnRef.current?.focus({ preventScroll: true });
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [location, team, client, userId, store]);

  return <div className="relative h-full w-full overflow-hidden bg-[#173d3a]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); if (rosterOpen) closeRoster(); else store.getState().returnToRoom(); }
  }}>
    <div inert={rosterOpen} className="h-full w-full">
    <canvas ref={canvasRef} role="img" aria-label={`Your team is automatically walking from left to right through an endless ${location}.`} className="block h-full w-full" />
    <button ref={returnRef} type="button" onClick={() => store.getState().returnToRoom()} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }} className="absolute top-4 right-4 h-12 w-[132px] cursor-pointer rounded-xl outline-none"><span className="sr-only">Return to room</span></button>
    <button type="button" aria-label="Character" aria-expanded={rosterOpen} onClick={() => { paused.current = true; setRosterOpen(true); }} onFocus={() => { characterFocused.current = true; }} onBlur={() => { characterFocused.current = false; }} className="absolute top-[76px] right-4 h-12 w-[132px] cursor-pointer rounded-xl outline-none sm:top-4 sm:right-40 sm:w-[104px]"><span className="sr-only">Character</span></button>
    <p role="status" className="sr-only">{characterName}. Gold {gold}. Account level {progression.level}. EXP {progression.exp} of {progression.expToNextLevel}.</p>
    </div>
    {rosterOpen && <CharacterRoster characters={characters} onClose={closeRoster} />}
  </div>;
}
