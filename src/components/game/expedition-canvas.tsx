"use client";
import { drawPlayerInfo } from "./player-info";
import { adventureFormation, BattlefieldFraming, battlefieldHasOpponent, battlefieldView, combatEncounterDistance, enemySpawnSpacing, interpolateCameraTravel, PartyMotion } from "./adventure-formation";
import { tourneySpectatorPlacement } from "./tourney-crowd";
import { drawRpgButton } from "./rpg-button";
import { drawMonster, preloadMonsterSprites } from "./meadow-monsters";
import { drawCharacter } from "./character-design";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStoreApi } from "./game-store";
import { type Character, type AccountProgress } from "@/lib/character";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { useQueryClient } from "@tanstack/react-query";
import type { EnemyEncounter, BattleResult, BattleStep } from "@/lib/encounter";
import { CharacterRoster } from "./character-roster";
import { CollectionPanel } from "./collection-panel";
import { InventoryPanel } from "./inventory-panel";
import { WikiPanel } from "./wiki-panel";
import { battleHudLayout } from "./battle-hud-layout";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { isRangedSkill } from "@/lib/skill-range";
import { drawCombatEffect, type CombatEffect } from "./combat-effects";
import { recordDamage, type DamageEntry } from "@/lib/battle-damage";
import { DamageSpread } from "./damage-spread";
import { drawCurrencyBadge } from "./currency-art";
import { LevelUpNotification, type LevelUpNotice } from "./level-up-notification";
import { drawLocationIcon } from "./location-icons";
import { BattleLog } from "./battle-log";
import { Skill2Controls } from "./skill-2-controls";
import type { Skill2Control } from "./pvp-types";
import { BATTLE_SKILL_LABEL_SECONDS, battleSkillName, eventCursor, indexCombatMovement, movementSample } from "@/lib/duel-playback";
import { drawFighterHud } from "./battle-labels";
import { drawFighterStatuses, preloadSkillEffects } from "./skill-effect-art";
import { activeCombatStatuses } from "@/lib/combat-status";
import { applyCharacterDeath, characterDeathSeconds } from "./character-death";

type ExpeditionPlayback = Pick<BattleResult, "steps" | "won" | "enemies" | "initialTeamHp" | "initialTeamMp"> & {
  skill2: Skill2Control[];
  movement: { at: number; x: number[]; travel?: number; cameraWorld?: number; kind?: string; label?: string }[];
};

function expeditionSkill2(team: (Character | null)[], roster: Character[]) {
  return team.flatMap(member => {
    if (!member?.id) return [];
    const fighter = roster.find(owned => owned.id === member.id) ?? member;
    const skill = fighter.skills?.[1];
    return skill?.unlocked && !skill.passive
      ? [{ id: member.id, name: fighter.name, enabled: true, skillId: skill.id, skillName: skill.name }] : [];
  });
}

export function ExpeditionCanvas({ location, team, gold, wishCurrency, characterName, characters, progression }: {
  location: "meadow" | "forest" | "garnaland" | "harbor" | "tourney" | "deepsea" | "deepsea-2f" | "deepsea-palace"; team: (Character | null)[]; gold: number;
  characterName: string; characters: Character[]; progression: AccountProgress; wishCurrency: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState(() => battleHudLayout(950, 300));
  const [damageSpread, setDamageSpread] = useState<DamageEntry[]>([]);
  const [logEntries, setLogEntries] = useState<{ actor: string; detail: string }[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpNotice | null>(null);
  useEffect(() => {
    if (!levelUp) return;
    const timer = window.setTimeout(() => setLevelUp(null), 5000);
    return () => window.clearTimeout(timer);
  }, [levelUp]);
  const returnRef = useRef<HTMLButtonElement>(null);
  const focused = useRef(false);
  const characterFocused = useRef(false);
  const focusedControl = useRef("");
  const summonAction = useRef<(() => Promise<void>) | null>(null);
  const spectatorButton = useRef<HTMLButtonElement>(null);
  const [yellowSpectator, setYellowSpectator] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const paused = useRef(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState<"Shop" | "Artifacts" | "Inventory" | "Wiki" | null>(null);
  const overlayOpen = rosterOpen || collectionOpen !== null;
  const [returnError, setReturnError] = useState("");
  const [spawnError, setSpawnError] = useState("");
  const [spawnPending, setSpawnPending] = useState(false);
  const retrySpawn = useRef<(() => void) | null>(null);
  const [skill2, setSkill2] = useState<Skill2Control[]>([]);
  const [skill2Busy, setSkill2Busy] = useState(false);
  const [combatError, setCombatError] = useState<{ message: string; retry?: () => void } | null>(null);
  const changeSkill2 = useRef<((fighterId: string, enabled: boolean) => void) | null>(null);
  const returning = useRef(false);
  const store = useGameStoreApi();
  const session = useSession();
  const userId = session.data?.user.id;
  const account = useCharacter(userId);
  const hasEvidence = account.data?.questItems.some((item) => item.id === "zugwangs-evidence") ?? false;
  const evidenceOwned = useRef(hasEvidence);
  useEffect(() => { evidenceOwned.current = hasEvidence; }, [hasEvidence]);
  const client = useQueryClient();
  const returnToRoom = useCallback(async () => {
    if (returning.current) return;
    returning.current = true; paused.current = true; setReturnError("");
    store.getState().setTravel("room");
    try {
      await api<void>("/encounters/return", { method: "POST" });
      store.getState().returnToRoom();
    } catch (error) {
      store.getState().setTravel(null);
      setReturnError(error instanceof Error ? error.message : "Could not return. Try again.");
      paused.current = false;
    } finally { returning.current = false; }
  }, [store]);
  const goldRef = useRef(gold);
  const wishesRef = useRef(wishCurrency);
  useEffect(() => { wishesRef.current = wishCurrency; }, [wishCurrency]);
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
    preloadSkillEffects();
    const buttonIcons = new Image(); buttonIcons.src = "/optimized/ui/adventure-button-icons-v2.c022326897c4.webp";
    const meadowArtwork = new Image(); if (!location.startsWith("deepsea")) meadowArtwork.src = location === "garnaland" ? "/optimized/maps/garnaland-painted-v1.1a69c9e916ff.webp" : location === "tourney" ? "/optimized/maps/tourney-seated-crowd-v2.bb8eb62bd7e4.webp" : location === "harbor" ? "/optimized/maps/harbor-painted-v1.f0301e091aa5.webp" : location === "forest" ? "/optimized/maps/forest-painted-v1.2233514177d4.webp" : "/optimized/maps/meadow-painted-v1.0509ccc36dff.webp";
    const garnaland = location === "garnaland";
    const forest = location === "forest";
    const harbor = location === "harbor";
    const tourney = location === "tourney";
    const yellowSpectatorArt = new Image();
    if (tourney) {
      yellowSpectatorArt.src = "/optimized/sprites/yellow-spectator-front-v2.c134c981238b.webp";
    }
    const deepsea = location.startsWith("deepsea");
    const deepseaBackground = new Image();
    if (deepsea) deepseaBackground.src = location === "deepsea" ? "/optimized/maps/deepsea-floor1-harbor-v4.7d2f476449e3.webp" : location === "deepsea-2f" ? "/optimized/maps/deepsea-floor2-harbor-v4.271cd3940422.webp" : "/optimized/maps/deepsea-palace-harbor-v4.f1cb7b684899.webp";
    preloadMonsterSprites(location);
    const meadowEffects = new Image();
    meadowEffects.src = "/optimized/sprites/meadow-hit-death.a9920b82286e.webp";
    const meadowAnimation = new Map<string, { hp: number; hurtAt: number; diedAt?: number }>();
    const deepSeaName = location === "deepsea-palace" ? "DeepSea Moot Royal Palace" : location === "deepsea-2f" ? "DeepSea Moot 2F" : "DeepSea Moot";
    let period: "day" | "night" = "day";
    const members = team.flatMap((character, slot) => character ? [{ character: charactersRef.current.find((owned) => owned.id === character.id) ?? character, slot }] : []);
    let width = 1, height = 1, ratio = 1, frame = 0, last = 0, distance = 0, elapsed = 0;
    let camera: { encounter: typeof foe; slot: number; x: number } | undefined;
    const spawnDelay = () => 5 + Math.random() * (tourney ? 20 : 10);
    let teamHp = members.map(({ character }) => character.stats?.hp ?? 100);
    let teamMp = members.map(({ character }) => character.stats?.mp ?? 0);
    let restStartedAt = 0, restManaPerSecond = 0;
    const resultHold = 1.5;
    const memberPositions: number[] = [];
    const partyMotion = new PartyMotion();
    let framing = new BattlefieldFraming();
    const partyDeaths: ({ x: number; at: number } | undefined)[] = [];
    let statuses: number[] = [];
    let statusEnds: BattleStep["statusEnds"], statusStartedAt = 0;
    let defeatedUntil: number | undefined;
    const recentSkills = new Map<string, { label: string; until: number }>();
    let alive = true, spawning = false, firstSpawn = true, spawnElapsed = 0, nextSpawn = spawnDelay(), message = "", messageUntil = 0;
    let spectatorAvailable = false, summonBusy = false;
    let crowdOffset = 0, crowdGroup = 0, refreshingCrowd = false, crowdStarted = false;
    type Monster = {
      data: EnemyEncounter; x: number; moving?: boolean; spawned?: boolean; stage: "ready" | "waiting" | "fighting" | "result";
      hp: number; mp?: number; teamHp: number[]; teamMp: number[]; casts: NonNullable<BattleStep["teamCasting"]>; battle?: ExpeditionPlayback; step: number; nextStep: number; until: number; lastHit?: BattleStep; battleStartedAt: number; lastHitAt: number;
      regroup?: boolean;
      motion?: ExpeditionPlayback["movement"];
      arrivesAt?: number;
      deferredFrom?: Monster;
    };
    let effects: CombatEffect[] = [];
    const battleLog: { actor: string; detail: string }[] = [];
    let damageRows: DamageEntry[] = [];
    let foe: Monster | null = null, monsters: Monster[] = [], activeGroup: Monster[] = [];
    let victoryReward: { result: BattleResult; x: number; scale: number; until: number } | undefined;
    const disabledSkill2 = new Set<string>();
    let skillChangePending = false;
    let arrivalPendingUntil: number | undefined, retryArrivals: (() => void) | undefined;
    let meadowProgress: { defeated: number; target: number | null } = { defeated: 0, target: null };

    function addEncounter(data: EnemyEncounter, slot: number) {
      const formation = adventureFormation(width, height, members.length);
      const x = battlefieldView(0, [0], width, formation).project(combatEncounterDistance + slot * enemySpawnSpacing) / width;
      monsters.push({ data, x, stage: "ready", hp: data.stats.hp, mp: data.stats.mp, teamHp: [...teamHp], teamMp: [...teamMp], casts: [], step: 0, nextStep: 0, until: 0, battleStartedAt: 0, lastHitAt: 0 });
    }

    function failed(error: unknown) {
      message = error instanceof Error ? error.message : "Encounter unavailable. Please try again.";
      messageUntil = elapsed + 6; nextSpawn = spawnElapsed + spawnDelay();
    }
    async function spawn() {
      if (spawning || summonBusy || paused.current || monsters.some((monster) => monster.data.boss)) return;
      spawning = true;
      nextSpawn = spawnElapsed + spawnDelay();
      setSpawnPending(true);
      try {
        const data = await api<EnemyEncounter>("/encounters", { method: "POST", body: JSON.stringify({ location, teamIds: members.map(({ character }) => character.id), newExpedition: firstSpawn, wave: true }) });
        if (!alive) return;
        firstSpawn = false;
        setSpawnError("");
        if (!crowdStarted) {
          spectatorAvailable = !!data.yellowSpectator; crowdGroup = data.spectatorGroup ?? 0;
          crowdStarted = true; setYellowSpectator(spectatorAvailable);
        }
        if (data.period) period = data.period;
        const progress = garnaland ? data.garnalandProgress : deepsea ? data.deepSeaProgress : tourney ? data.tourneyProgress : harbor ? data.harborProgress : forest ? data.forestProgress : data.meadowProgress;
        if (progress) meadowProgress = progress;
        [data, ...(data.additionalEnemies ?? [])].forEach(addEncounter);
      } catch (error) { if (alive) setSpawnError(error instanceof Error ? error.message : "Could not spawn enemies."); }
      finally { spawning = false; if (alive) setSpawnPending(false); }
    }
    retrySpawn.current = () => { void spawn(); };
    async function fight(group: Monster[]) {
      const engagedAt = elapsed;
      activeGroup = group; const encounter = group[0]; foe = encounter;
      framing = new BattlefieldFraming();
      recentSkills.clear();
      statuses = [];
      statusEnds = undefined;
      damageRows = members.map(({ character }, index) => ({ id: character.id ?? `member-${index}`, name: character.name, basic: 0, skill: 0, dot: 0, total: 0 }));
      setDamageSpread(damageRows);
      encounter.teamHp = [...teamHp]; encounter.teamMp = [...teamMp];
      for (const monster of group) monster.stage = "waiting";
      await prepareFight(encounter, engagedAt);
    }

    function installPlayback(encounter: Monster, battle: ExpeditionPlayback) {
      const previousSummons = activeGroup.filter(monster => monster.data.summoned);
      const summons = (battle.enemies ?? []).map((enemy): Monster => previousSummons.find(monster => monster.data.id === enemy.id) ?? {
        data: enemy, spawned: false, x: 0.85, stage: "fighting", hp: 0, teamHp: [...teamHp], teamMp: [...teamMp], casts: [],
        step: 0, nextStep: 0, until: 0, battleStartedAt: 0, lastHitAt: 0,
      });
      monsters = [...monsters.filter(monster => !previousSummons.includes(monster)), ...summons];
      activeGroup = [...activeGroup.filter(monster => !monster.data.summoned), ...summons];
      encounter.battle = battle;
      encounter.motion = indexCombatMovement(battle.movement);
      setSkill2(battle.skill2 ?? []);
    }
    function encounterIds() {
      return activeGroup.filter(monster => !monster.data.summoned).map(monster => monster.data.id);
    }
    function combatFailure(error: unknown, retry?: () => void) {
      setCombatError({ message: error instanceof Error ? error.message : "Could not update expedition combat.", retry });
    }
    async function joinFight(encounter: Monster, group: Monster[]) {
      arrivalPendingUntil = elapsed + 0.2;
      retryArrivals = undefined;
      setCombatError(null);
      try {
        const update = await api<{ battle: ExpeditionPlayback; arrivals: { id: string; at: number }[] } | null>(
          `/encounters/${encodeURIComponent(encounter.data.id)}/arrivals`,
          { method: "POST", body: JSON.stringify({ encounterIds: group.map(monster => monster.data.id) }) });
        if (!alive || foe !== encounter) return;
        if (!update) {
          group.forEach(monster => { monster.deferredFrom = encounter; });
          return;
        }
        for (const arrival of update.arrivals) {
          const monster = group.find(member => member.data.id === arrival.id);
          if (!monster || activeGroup.includes(monster)) continue;
          monster.stage = "fighting";
          monster.arrivesAt = arrival.at;
          monster.spawned = false;
          activeGroup.push(monster);
        }
        installPlayback(encounter, update.battle);
        const lastPlayed = update.battle.steps[encounter.step - 1];
        statuses = lastPlayed?.statuses ?? [];
        statusEnds = lastPlayed?.statusEnds;
        encounter.nextStep = encounter.battleStartedAt + (update.battle.steps[encounter.step]?.at ?? update.battle.steps.at(-1)?.at ?? 0);
      } catch (error) {
        if (alive && foe === encounter) {
          retryArrivals = () => { void joinFight(encounter, group); };
          combatFailure(error, retryArrivals);
        }
      } finally { arrivalPendingUntil = undefined; }
    }
    async function prepareFight(encounter: Monster, engagedAt: number) {
      setCombatError(null); setSkill2Busy(true);
      try {
        const battle = await api<ExpeditionPlayback>("/encounters/prepare", { method: "POST", body: JSON.stringify({ encounterIds: encounterIds(), disabledSkill2Ids: [...disabledSkill2] }) });
        if (!alive || foe !== encounter) return;
        installPlayback(encounter, battle);
        teamHp = battle.initialTeamHp ?? teamHp; teamMp = battle.initialTeamMp ?? teamMp;
        encounter.teamHp = [...teamHp]; encounter.teamMp = [...teamMp];
        for (const monster of activeGroup) monster.stage = "fighting";
        const openingDelay = battle.steps[0]?.at ?? 0.45;
        encounter.nextStep = Math.max(elapsed, engagedAt + openingDelay);
        encounter.battleStartedAt = encounter.nextStep - openingDelay;
      } catch (error) {
        if (alive && foe === encounter) combatFailure(error, () => { void prepareFight(encounter, elapsed); });
      }
      finally { if (alive) setSkill2Busy(false); }
    }
    async function settleFight(encounter: Monster) {
      setCombatError(null); setSkill2Busy(true);
      for (const monster of activeGroup) monster.stage = "waiting";
      try {
        const result = await api<BattleResult>("/encounters/resolve", { method: "POST", body: JSON.stringify({ encounterIds: encounterIds() }) });
        void client.invalidateQueries({ queryKey: ["character", userId] });
        if (!alive || foe !== encounter) return;
        restStartedAt = performance.now();
        restManaPerSecond = result.manaRegenPerSecond ?? 0;
        goldRef.current = result.gold; wishesRef.current = result.wishCurrency ?? wishesRef.current; progressRef.current = result.progression;
        if (result.garnalandUnlocked) { spectatorAvailable = false; setYellowSpectator(false); }
        const progress = garnaland ? result.garnalandProgress : deepsea ? result.deepSeaProgress : tourney ? result.tourneyProgress : harbor ? result.harborProgress : forest ? result.forestProgress : result.meadowProgress;
        if (progress) meadowProgress = progress;
        if (result.wishEarned && result.wishEarned > 0) setLevelUp({ level: result.progression.level, wishes: result.wishEarned, levels: result.levelsGained ?? Math.max(1, result.wishEarned / 100) });
        if (!result.won) {
          defeatedUntil = Math.max(elapsed, ...partyDeaths.flatMap(death => death ? [death.at + characterDeathSeconds] : []));
          return;
        }
        for (const monster of activeGroup) monster.stage = "result";
        encounter.until = elapsed + resultHold;
        victoryReward = { result, x: encounter.x, scale: encounter.data.boss ? 1.45 : encounter.data.semiBoss ? 1.2 : 1, until: encounter.until };
      } catch (error) { if (alive && foe === encounter) combatFailure(error, () => { void settleFight(encounter); }); }
      finally { if (alive) setSkill2Busy(false); }
    }
    changeSkill2.current = async (fighterId, enabled) => {
      const encounter = foe;
      if (skillChangePending || arrivalPendingUntil !== undefined || retryArrivals || returning.current) return;
      if (!encounter || encounter.stage === "result") {
        if (enabled) disabledSkill2.delete(fighterId); else disabledSkill2.add(fighterId);
        setSkill2(expeditionSkill2(team, charactersRef.current).map(fighter => ({ ...fighter, enabled: !disabledSkill2.has(fighter.id) })));
        return;
      }
      if (!encounter.battle || encounter.stage !== "fighting") return;
      skillChangePending = true; setSkill2Busy(true); setCombatError(null);
      try {
        const battle = await api<ExpeditionPlayback>(`/encounters/${encodeURIComponent(encounter.data.id)}/skill-2`, { method: "POST", body: JSON.stringify({ fighterId, enabled }) });
        if (!alive || foe !== encounter) return;
        if (enabled) disabledSkill2.delete(fighterId); else disabledSkill2.add(fighterId);
        installPlayback(encounter, battle);
        encounter.nextStep = encounter.battleStartedAt + (battle.steps[encounter.step]?.at ?? 0);
      } catch (error) { if (alive && foe === encounter) combatFailure(error); }
      finally { skillChangePending = false; if (alive) setSkill2Busy(false); }
    };
    summonAction.current = async () => {
      if (!alive || !spectatorAvailable || !evidenceOwned.current || summonBusy || paused.current) return;
      if (spawning || monsters.some((monster) => monster.data.boss)) { failed(new Error("Wait for the current spawn or boss to finish, then click the yellow spectator again.")); return; }
      summonBusy = true; setSummoning(true);
      try {
        const data = await api<EnemyEncounter>("/encounters/spectator", { method: "POST" });
        if (!alive) return;
        spectatorAvailable = false; setYellowSpectator(false);
        addEncounter(data, 0);
        message = "The yellow spectator vanishes. Demon Prince enters the arena!"; messageUntil = elapsed + 6;
      } catch (error) { if (alive) failed(error); }
      finally { summonBusy = false; if (alive) setSummoning(false); }
    };
    async function nextCrowd() {
      if (refreshingCrowd || summonBusy || !alive) return;
      refreshingCrowd = true;
      spectatorAvailable = false; setYellowSpectator(false);
      try {
        const data = await api<{ yellowSpectator: boolean; spectatorGroup: number }>("/encounters/spectators/next", { method: "POST", body: JSON.stringify({ group: crowdGroup + 1 }) });
        if (!alive) return;
        crowdGroup = data.spectatorGroup; crowdOffset = 0;
        spectatorAvailable = data.yellowSpectator; setYellowSpectator(spectatorAvailable);
      } catch (error) { if (alive) { failed(error); crowdOffset = Math.max(0, width - 80); } }
      finally { refreshingCrowd = false; }
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
    function specialSpectator() {
      const aspect = meadowArtwork.naturalWidth > 0 ? meadowArtwork.naturalWidth / meadowArtwork.naturalHeight : 1.5;
      return tourneySpectatorPlacement(width, height, distance, crowdOffset, aspect);
    }
    function rect(x: number, y: number, w: number, h: number, color: string) {
      ctx!.fillStyle = color; ctx!.fillRect(x, y, w, h);
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
      const frameSeconds = document.hidden ? 0 : Math.max(0, (time - (last || time)) / 1000);
      const dt = Math.min(frameSeconds, 0.05); last = time;
      elapsed += dt;
      if (defeatedUntil !== undefined && elapsed >= defeatedUntil) {
        defeatedUntil = undefined;
        void returnToRoom();
      }
      const hasLivingEnemy = monsters.some(monster => monster.hp > 0);
      spawnElapsed += frameSeconds / (hasLivingEnemy ? 1 : 0.75);
      // Refresh equipped stats without restarting the running expedition.
      members.forEach((member) => { member.character = charactersRef.current.find((owned) => owned.id === member.character.id) ?? member.character; });
      const waitingForArrivals = arrivalPendingUntil !== undefined && elapsed >= arrivalPendingUntil;
      if (foe?.stage === "fighting" && (skillChangePending || waitingForArrivals || retryArrivals)) {
        foe.battleStartedAt += dt;
        foe.nextStep += dt;
      }
      const battle = foe?.battle;
      const playbackTime = foe ? Math.max(0, elapsed - foe.battleStartedAt) : 0;
      const movement = battle?.movement;
      const { previous: from, next: to, blend } = movementSample(foe?.motion ?? [], playbackTime);
      const latest = movement?.[eventCursor(movement, playbackTime) - 1];
      const worldX = (index: number) => {
        // A summon can appear between movement ticks, before it has a position on the movement track.
        const x = from?.x[index] ?? latest?.x[index];
        return x === undefined ? undefined : x + ((to?.x[index] ?? x) - x) * blend;
      };
      const enemyWorldX = (monster: Monster, slot: number) => {
        if ((monster.arrivesAt ?? 0) > playbackTime) return undefined;
        const index = members.length + slot;
        return (monster.arrivesAt ?? 0) > (from?.at ?? 0) ? latest?.x[index] : worldX(index);
      };
      const moving = (index: number) => blend > 0 && !!from && !!to && from.x[index] !== undefined && Math.abs((to.x[index] ?? from.x[index]) - from.x[index]) > 0.01;
      const positions = members.map((_, index) => worldX(index) ?? 0);
      const memberAlive = (index: number) => teamHp[index] > 0;
      const livingAllies = positions.filter((_, index) => memberAlive(index));
      const livingOpponents = activeGroup.flatMap((monster, slot) => {
        const x = enemyWorldX(monster, slot);
        return monster.hp > 0 && x !== undefined ? [x] : [];
      });
      const ready = monsters.filter(monster => monster.stage === "ready");
      if (foe?.stage === "fighting" && !skillChangePending && arrivalPendingUntil === undefined && !retryArrivals) {
        const joining = ready.filter(monster => monster.deferredFrom !== foe);
        if (joining.length) void joinFight(foe, joining);
      }
      const motionPhase = foe?.regroup || !foe ? (ready.length ? "hold" : "regroup")
        : !battle ? "hold" : battlefieldHasOpponent(livingAllies, livingOpponents) ? "combat" : "regroup";
      const travelling = motionPhase === "regroup";
      const partyAdvancing = foe?.stage === "fighting" && !skillChangePending && !waitingForArrivals && !retryArrivals
        && members.some((_, index) => moving(index));
      const rangedAnchor = members.findIndex(({ character }, index) => teamHp[index] > 0 && character.stats?.range === "range");
      if ((!foe || foe.stage === "result") && restManaPerSecond && !document.hidden) {
        const seconds = Math.floor((time - restStartedAt) / 1000);
        if (seconds > 0) {
          restStartedAt += seconds * 1000;
          teamMp = teamMp.map((mp, index) => teamHp[index] > 0
            ? Math.min(members[index].character.stats?.mp ?? mp, mp + seconds * restManaPerSecond) : mp);
        }
      }
      const front = members.reduce((lead, _, index) => teamHp[index] > 0 && (worldX(index) ?? -Infinity) > (worldX(lead) ?? -Infinity) ? index : lead, -1);
      const travel = interpolateCameraTravel(from?.travel, to?.travel, blend);
      const cameraSlot = travel === undefined ? rangedAnchor < 0 ? front : rangedAnchor : -1;
      const cameraX = travel ?? worldX(cameraSlot);
      let travelStep = travelling ? dt * 90 : 0;
      if (foe?.stage === "fighting" && !skillChangePending && cameraX !== undefined) {
        if (camera?.encounter === foe && camera.slot === cameraSlot) travelStep = Math.max(0, (cameraX - camera.x) * 0.75);
        camera = { encounter: foe, slot: cameraSlot, x: cameraX };
      } else camera = undefined;
      distance += travelStep;
      if (tourney && crowdStarted) {
        // Scroll spectators right to left, opposite the party walking right.
        crowdOffset += travelStep;
        if (crowdOffset >= width + 40 && !refreshingCrowd && !summonBusy) void nextCrowd();
      }
      if (spectatorButton.current) {
        const seat = specialSpectator();
        spectatorButton.current.style.left = seat.x + "px";
        spectatorButton.current.style.top = seat.baseline - seat.height / 2 + "px";
        spectatorButton.current.style.width = Math.max(28, seat.height * 0.7) + "px";
        spectatorButton.current.style.height = seat.height + "px";
        spectatorButton.current.style.visibility = seat.x < -24 || seat.x > width + 24 ? "hidden" : "visible";
      }
      if (spawnElapsed >= nextSpawn && !document.hidden) void spawn();
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
      if (harbor) {
        rect(0, 0, width, ground, period === "night" ? "#142e48" : "#a9dce6");
        ctx.fillStyle = period === "night" ? "#eee8b8" : "#fff1b3"; ctx.beginPath(); ctx.arc(width * 0.8, height * 0.23, 24, 0, Math.PI * 2); ctx.fill();
        rect(0, ground * 0.58, width, ground * 0.42, period === "night" ? "#214f68" : "#4dabc0");
        for (let i = 0; i < 16; i++) rect((i * 109 - distance * 0.3) % (width + 120), ground * 0.65 + (i % 3) * 19, 64, 2, "#a2d5dc66");
        rect(0, ground, width, height - ground, "#c9b182");
        rect(0, ground - 6, width, 8, "#88704e");
        for (let x = -distance % 48; x < width; x += 48) rect(x, ground, 2, 24, "#a28b63");
      }
      if (deepsea) {
        const water = ctx.createLinearGradient(0, 0, 0, height); water.addColorStop(0, "#164c63"); water.addColorStop(1, "#0c252f");
        ctx.fillStyle = water; ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 7; i++) {
          const x = (i * 187 - distance * 0.25) % (width + 187);
          rect(x, ground * 0.28, 26, ground * 0.72, "#285566"); rect(x - 6, ground * 0.28, 38, 9, "#497a80");
          ctx.strokeStyle = "#84b8bb33"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 110, ground); ctx.stroke();
        }
        rect(0, ground, width, height - ground, "#45635e"); rect(0, ground, width, 6, "#789083");
        if (deepseaBackground.complete && deepseaBackground.naturalWidth > 0) {
          const floor = 0;
          const panelHeight = deepseaBackground.naturalHeight;
          // Preserve the wide panel's proportions rather than stretching it
          // vertically to fill the battle viewport. Mirror adjacent tiles for
          // continuous scenery while the party travels.
          const tileWidth = Math.max(width, height * deepseaBackground.naturalWidth / panelHeight);
          const offset = distance % tileWidth;
          const firstTile = Math.floor(distance / tileWidth);
          const horizon = Math.round(panelHeight * 0.75);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          for (let i = 0; i < 2; i++) {
            const mirrored = (firstTile + i) % 2 !== 0;
            ctx.save();
            ctx.translate(i * tileWidth - offset + (mirrored ? tileWidth : 0), 0);
            if (mirrored) ctx.scale(-1, 1);
            ctx.drawImage(deepseaBackground, 0, floor * panelHeight, deepseaBackground.naturalWidth, horizon, 0, 0, tileWidth, ground);
            ctx.drawImage(deepseaBackground, 0, floor * panelHeight + horizon, deepseaBackground.naturalWidth, panelHeight - horizon, 0, ground, tileWidth, height - ground);
            ctx.restore();
          }
        }
        for (let i = 0; i < 20; i++) { const x = (i * 83 - distance * 0.4 + width * 2) % width, y = ground - ((elapsed * 16 + i * 39) % ground); ctx.strokeStyle = "#9ed5d455"; ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.stroke(); }
      }
      const tile = 70, shift = distance % tile, first = Math.floor(distance / tile);
      for (let i = -1; !deepsea && i <= Math.ceil(width / tile) + 1; i++) {
        const seed = first + i, x = i * tile - shift, y = ground + 24 + random(seed + 40) * Math.max(10, height - ground - 40);
        rect(x, y, 10 + random(seed) * 12, 3, forest ? "#3d4230" : "#756441");
        if (seed % 2 === 0 || !forest) {
          rect(x + 25, ground - 10, 2, 11, "#547746");
          ctx.fillStyle = forest ? "#c7ba8a" : seed % 2 ? "#f2d79b" : "#e5bdb7";
          ctx.beginPath(); ctx.arc(x + 26, ground - 11, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      if ((location === "meadow" || forest || harbor || tourney || garnaland) && meadowArtwork.complete && meadowArtwork.naturalWidth > 0) {
        const horizon = Math.round(meadowArtwork.naturalHeight * 0.75);
        const tileWidth = Math.max(width, height * meadowArtwork.naturalWidth / meadowArtwork.naturalHeight);
        const firstTile = Math.floor(distance / tileWidth);
        const offset = distance % tileWidth;
        // Alternate mirrored copies: matching edges loop without jumps or gaps.
        // Distance advances only during travel, so scenery stops for combat.
        for (let i = 0; i < 2; i++) {
          const left = i * tileWidth - offset;
          const mirrored = (firstTile + i) % 2 !== 0;
          ctx.save(); ctx.translate(left + (mirrored ? tileWidth : 0), 0);
          if (mirrored) ctx.scale(-1, 1);
          ctx.drawImage(meadowArtwork, 0, 0, meadowArtwork.naturalWidth, horizon, 0, 0, tileWidth, ground);
          ctx.drawImage(meadowArtwork, 0, horizon, meadowArtwork.naturalWidth, meadowArtwork.naturalHeight - horizon,
            0, ground, tileWidth, height - ground);
          ctx.restore();
        }
      }
      if (tourney) {
        // Everyone else is painted into the seated audience, not floating sprites.
        if (spectatorAvailable && yellowSpectatorArt.complete && yellowSpectatorArt.naturalWidth > 0) {
          const seat = specialSpectator();
          const sourceWidth = yellowSpectatorArt.naturalWidth * 0.6;
          const sourceHeight = yellowSpectatorArt.naturalHeight * 0.76;
          const spriteWidth = seat.height * sourceWidth / sourceHeight;
          ctx.drawImage(yellowSpectatorArt, yellowSpectatorArt.naturalWidth * 0.2, 0, sourceWidth, sourceHeight,
            seat.x - spriteWidth / 2, seat.baseline - seat.height, spriteWidth, seat.height);
        }
        // Repaint the actual foreground railing from the same scrolling tiles.
        // This occludes the front row instead of placing people over the fence.
        if (meadowArtwork.complete && meadowArtwork.naturalWidth > 0) {
          const sourceTop = meadowArtwork.naturalHeight * 0.595;
          const horizon = Math.round(meadowArtwork.naturalHeight * 0.75);
          const tileWidth = Math.max(width, height * meadowArtwork.naturalWidth / meadowArtwork.naturalHeight);
          const firstTile = Math.floor(distance / tileWidth), offset = distance % tileWidth;
          const railY = ground * sourceTop / horizon;
          for (let i = 0; i < 2; i++) {
            const mirrored = (firstTile + i) % 2 !== 0;
            ctx.save(); ctx.translate(i * tileWidth - offset + (mirrored ? tileWidth : 0), 0);
            if (mirrored) ctx.scale(-1, 1);
            ctx.drawImage(meadowArtwork, 0, sourceTop, meadowArtwork.naturalWidth, horizon - sourceTop,
              0, railY, tileWidth, ground - railY);
            ctx.restore();
          }
        }
      }
      if (harbor && period === "night") {
        ctx.fillStyle = "#10234288"; ctx.fillRect(0, 0, width, height);
      }
      const formation = adventureFormation(width, height, members.length);
      const { avatarScale } = formation;
      const cameraWorld = interpolateCameraTravel(from?.cameraWorld, to?.cameraWorld, blend);
      const view = from ? framing.view(cameraWorld ?? worldX(rangedAnchor < 0 ? front : rangedAnchor) ?? 0, livingAllies, width, formation, elapsed) : undefined;
      const screens = view?.party(positions, memberAlive, true);
      const displayedParty = partyMotion.update(motionPhase, elapsed, width, members.map(({ slot }, index) => {
        const home = formation.home(index);
        return { id: String(slot), x: screens?.[index] ?? home, home };
      }));
      const memberMoving = displayedParty.map((member, index) => {
        memberPositions[index] = member.x;
        return travelling || member.moving || (partyAdvancing && moving(index));
      });
      monsters.forEach(monster => {
        if (monster.hp <= 0 || monster.stage === "result") return;
        const index = activeGroup.indexOf(monster);
        if (view && index >= 0) {
          const position = enemyWorldX(monster, index);
          if (position === undefined) return;
          if (monster.arrivesAt !== undefined) monster.spawned = true;
          monster.x = view.project(position) / width;
          monster.moving = moving(members.length + index);
        }
      });
      if (foe?.stage === "result" && (ready.length || elapsed >= foe.until)) {
        if (activeGroup.some((monster) => monster.data.boss)) nextSpawn = spawnElapsed + spawnDelay();
        monsters = monsters.filter((monster) => !activeGroup.includes(monster));
        activeGroup = []; foe = null;
        if (ready.length) void fight(ready);
      } else if (!foe && ready.length) {
        void fight(ready);
      }
      if (foe) {
        if (foe.stage === "fighting" && !skillChangePending && !waitingForArrivals && !retryArrivals && foe.battle && elapsed >= foe.nextStep) {
          while (foe.stage === "fighting" && elapsed >= foe.nextStep) {
          const step = foe.battle.steps[foe.step];
          if (step) {
            foe.step++;
            const memberIndex = members.findIndex(({ character }) => character.id === step.characterId);
            const enemy = activeGroup[step.enemyIndex ?? 0];
            const skill = battleSkillName(step);
            const skillActor = step.actor === "team" ? members[memberIndex]?.character.id : enemy?.data.id;
            if (skill && skillActor) recentSkills.set(skillActor, { label: skill, until: elapsed + BATTLE_SKILL_LABEL_SECONDS });
            const updatedDamage = recordDamage(damageRows, step, enemy?.hp ?? 0);
            if (updatedDamage !== damageRows) { damageRows = updatedDamage; setDamageSpread(updatedDamage); }
            const actor = step.actor === "enemy" ? enemy?.data.name ?? "Enemy" : members[memberIndex]?.character.name ?? "Ally";
            const detail = (step.label ?? "Attack") + (step.damage ? ` -${step.damage} HP` : "")
              + (step.healing ? ` +${step.healing} HP` : "") + (step.critical ? " · Critical" : "");
            if (step.kind !== "mana") battleLog.unshift({ actor, detail });
            battleLog.length = Math.min(battleLog.length, 5);
            if (step.kind !== "mana") setLogEntries([...battleLog]);
            if (step.kind !== "mana") {
              const character = members[memberIndex]?.character;
              const playerX = memberPositions[memberIndex], enemyX = enemy ? enemy.x * width : undefined;
              const friendly = step.actor === "team";
              const source = friendly ? playerX : enemyX;
              const target = (friendly ? enemyX : playerX) ?? source;
              if (source !== undefined && target !== undefined) {
                effects.push({ step, startedAt: elapsed, enemyId: enemy?.data.id, source, target,
                  weapon: (friendly ? character?.weapon : enemy?.data.type) ?? "enemy",
                  ranged: (friendly ? character?.stats?.range : enemy?.data.stats.range) === "range" || isRangedSkill(step.label) });
              }
            }
            foe.hp = step.enemyHp; foe.teamHp = step.teamHp; foe.teamMp = step.teamMp ?? foe.teamMp;
            statuses = step.statuses ?? [];
            statusEnds = step.statusEnds;
            statusStartedAt = foe.battleStartedAt;
            step.teamHp.forEach((hp, index) => {
              if (hp <= 0 && teamHp[index] > 0) partyDeaths[index] = { at: elapsed, x: memberPositions[index] / width };
              else if (hp > 0) partyDeaths[index] = undefined;
            });
            teamHp = [...foe.teamHp]; teamMp = [...foe.teamMp];
            foe.casts = step.teamCasting ?? []; foe.lastHit = step; foe.lastHitAt = elapsed;
            activeGroup.forEach((monster, index) => {
              monster.hp = step.enemyHps?.[index] ?? (index === 0 ? step.enemyHp : monster.hp);
              monster.mp = step.enemyMps?.[index];
              if (monster.hp > 0 && (monster.arrivesAt ?? 0) <= step.at) monster.spawned = true;
              monster.lastHit = step; monster.lastHitAt = elapsed;
            });
          }
          if (foe.step >= foe.battle.steps.length) {
            if (arrivalPendingUntil !== undefined) break;
            if (teamHp.some(hp => hp > 0) && activeGroup.every(monster => monster.hp <= 0)) {
              foe.regroup = true;
            }
            void settleFight(foe);
          } else foe.nextStep = foe.battleStartedAt + foe.battle.steps[foe.step].at;
          }
        }
      }
      // Keep the formation on the left, with Front slots leading toward the right.
      const statusTime = elapsed - (foe?.battle ? foe.battleStartedAt : statusStartedAt);
      members.forEach(({ character }, index) => {
        const x = memberPositions[index];
        const health = teamHp[index];
        if (health <= 0) {
          const death = partyDeaths[index];
          if (!death || elapsed - death.at >= characterDeathSeconds) return;
          ctx.save(); ctx.translate(death.x * width, ground); ctx.scale(avatarScale, avatarScale);
          applyCharacterDeath(ctx, elapsed - death.at, 1);
          drawCharacter(ctx, character.weapon);
          ctx.restore();
          return;
        }
        const activeStatuses = activeCombatStatuses(statusEnds?.[index], statusTime, statuses[index]);
        const immobilized = activeStatuses.includes("freeze") || activeStatuses.includes("stun");
        const action = [...effects].reverse().find((effect) => effect.step.characterId === character.id && effect.step.actor === "team" && effect.step.kind !== "poison" && effect.step.kind !== "bleed" && elapsed - effect.startedAt < 0.4);
        const swing = action && !immobilized ? Math.sin(Math.min(1, (elapsed - action.startedAt) / 0.4) * Math.PI) : 0;
        const rangedAction = action?.ranged || action?.step.kind === "cast";
        const phase = elapsed * 5.25 + index * 0.7, stride = immobilized || !memberMoving[index] ? 0 : Math.sin(phase);
        ctx.save(); ctx.translate(x + swing * (rangedAction ? -3 : 12) * avatarScale, ground); ctx.scale(avatarScale, avatarScale);
        const facing = !immobilized && (motionPhase === "regroup" || displayedParty[index].transitioning) ? displayedParty[index].direction || 1 : 1;
        drawCharacter(ctx, character.weapon, { facing, stride, swing: swing * (rangedAction ? -0.2 : 1) }); ctx.restore();
        drawFighterStatuses(ctx, activeStatuses, x, ground, avatarScale, elapsed);
        ctx.globalAlpha = 1;
        const cast = foe?.casts[index], recent = character.id ? recentSkills.get(character.id) : undefined;
        const activeSkill = cast?.name ?? (recent && recent.until > elapsed ? recent.label : undefined);
        const castProgress = cast && foe ? (elapsed - foe.battleStartedAt - cast.startedAt) / Math.max(0.001, cast.endsAt - cast.startedAt) : undefined;
        drawFighterHud(ctx, x, ground, avatarScale, ground - 72 * avatarScale, {
          name: character.name, hp: health, maxHp: character.stats?.hp ?? 100, mp: teamMp[index], maxMp: character.stats?.mp, skill: activeSkill, castProgress,
          statuses: activeStatuses,
        });
      });
      for (const monster of monsters) {
        if (monster.spawned === false) continue;
        const foe = monster;
        const x = foe.x * width, size = avatarScale * (foe.data.boss ? 1.45 : foe.data.semiBoss ? 1.2 : 1);
        if (location === "meadow") {
          let animation = meadowAnimation.get(foe.data.id);
          if (!animation) {
            animation = { hp: foe.data.stats.hp, hurtAt: -10 };
            meadowAnimation.set(foe.data.id, animation);
          }
          if (foe.hp < animation.hp) animation.hurtAt = elapsed;
          if (foe.hp <= 0 && animation.diedAt === undefined) animation.diedAt = elapsed;
          animation.hp = foe.hp;
          const dead = animation.diedAt !== undefined;
          const age = elapsed - (animation.diedAt ?? animation.hurtAt);
          const duration = dead ? 0.85 : 0.28;
          if (age >= 0 && age < duration && meadowEffects.complete && meadowEffects.naturalWidth > 0) {
            const progress = age / duration;
            const extent = (dead ? 65 + progress * 35 : 42 + progress * 18) * size;
            ctx.save(); ctx.globalAlpha = 1 - progress;
            ctx.drawImage(meadowEffects, dead ? meadowEffects.naturalWidth / 2 : 0, 0, meadowEffects.naturalWidth / 2, meadowEffects.naturalHeight, x - extent / 2, ground - 30 * size - extent / 2, extent, extent);
            ctx.restore();
          }
        }
        if (foe.hp > 0) {
        const enemyIndex = activeGroup.indexOf(foe);
        const statusIndex = members.length + enemyIndex;
        const activeStatuses = enemyIndex < 0 ? [] : activeCombatStatuses(statusEnds?.[statusIndex], statusTime, statuses[statusIndex]);
        const immobilized = activeStatuses.includes("freeze") || activeStatuses.includes("stun");
        const attack = [...effects].reverse().find((effect) => effect.enemyId === foe.data.id && effect.step.actor === "enemy" && elapsed - effect.startedAt < 0.45);
        const attackProgress = attack ? Math.min(1, (elapsed - attack.startedAt) / 0.45) : 0;
        const strike = attack && !immobilized ? Math.sin(attackProgress * Math.PI) : 0;
        const ranged = foe.data.stats.range === "range";
        ctx.save(); ctx.translate(x + strike * (ranged ? 3 : -14) * size, ground - 1 - (foe.data.type === "slime" ? strike * 7 * size : 0)); ctx.scale(-size, size);
        ctx.rotate(strike * (ranged ? -0.08 : 0.16));
        const hurtAge = elapsed - (meadowAnimation.get(foe.data.id)?.hurtAt ?? -10);
        if (location === "meadow" && hurtAge < 0.28) {
          ctx.translate(-Math.sin(hurtAge / 0.28 * Math.PI) * 7, 0);
          ctx.rotate(-Math.sin(hurtAge / 0.28 * Math.PI) * 0.15);
        }
        if (foe.data.type === "slime") ctx.scale(1 + strike * 0.22, 1 - strike * 0.16);
        const stride = foe.hp > 0 && foe.moving ? Math.sin(elapsed * 10) : 0;
        if (drawMonster(ctx, foe.data.type, elapsed, !!foe.moving && !immobilized, strike)) {
          // Generated poses replace the procedural fallback once loaded.
        } else if (deepsea) {
          const fish = !["baracudon", "fishpeople-rider"].includes(foe.data.type);
          if (!fish) {
            ctx.fillStyle = "#6599a0"; ctx.beginPath(); ctx.ellipse(0, -21, 37, 13, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-30, -21); ctx.lineTo(-48, -36); ctx.lineTo(-48, -6); ctx.fill();
            rect(23, -26, 4, 4, "#e5df8c");
            if (foe.data.type === "fishpeople-rider") { rect(-7, -54, 14, 25, "#6eb8b1"); ctx.fillStyle = "#9bd0bd"; ctx.beginPath(); ctx.arc(0, -60, 8, 0, Math.PI * 2); ctx.fill(); }
          } else {
            rect(-11 + stride * 3, -12, 7, 13, "#285c67"); rect(4 - stride * 3, -12, 7, 13, "#285c67");
            rect(-15, -42, 30, 30, foe.data.boss ? "#806f9b" : "#559d9c");
            ctx.fillStyle = "#8bc3b0"; ctx.beginPath(); ctx.ellipse(0, -49, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#4b8993"; ctx.beginPath(); ctx.moveTo(-13, -54); ctx.lineTo(-26, -70); ctx.lineTo(-18, -35); ctx.fill(); rect(5, -52, 5, 4, "#f3e2a7");
            ctx.save(); ctx.translate(18, -30); ctx.rotate(strike * 1.2); rect(-2, -25, 4, 46, "#c1ae7a");
            if (foe.data.type === "fishpeople-guard" || foe.data.type === "fishpeople-guardian" || foe.data.type === "fishpeople-knight") { ctx.fillStyle = "#8baab0"; ctx.beginPath(); ctx.ellipse(-30, 0, 11, 19, 0, 0, Math.PI * 2); ctx.fill(); }
            if (foe.data.type === "fishpeople-cleric" || foe.data.type === "fishpeople-researcher") { ctx.fillStyle = "#a8ecdf"; ctx.beginPath(); ctx.arc(0, -25, 6, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
            if (foe.data.type === "fishpeople-lord") { rect(-17, -65, 34, 6, "#d9c17c"); for (let p = 0; p < 3; p++) rect(-13 + p * 11, -74, 6, 10, "#d9c17c"); }
          }
        } else if (tourney) {
          const assassin = foe.data.type === "assassin", boss = foe.data.boss;
          const demon = foe.data.type === "demon-prince";
          if (assassin) {
            drawCharacter(ctx, "dual-knife", { stride: foe.moving ? Math.sin(elapsed * 5.25) : 0, swing: strike });
          } else {
            rect(-11 + stride * 3, -12, 7, 13, "#3b3335"); rect(4 - stride * 3, -12, 7, 13, "#3b3335");
            rect(-15, -40, 30, 29, demon ? "#512d4c" : assassin ? "#494553" : boss ? "#864c56" : "#9c9790");
            ctx.fillStyle = demon ? "#b75b55" : "#c49e7d"; ctx.beginPath(); ctx.arc(0, -49, 12, 0, Math.PI * 2); ctx.fill();
            rect(-13, -60, 26, 10, assassin ? "#363444" : "#777c83"); rect(-6, -49, 15, 4, "#292c32");
            ctx.save(); ctx.translate(17, -31); ctx.rotate(strike * 1.6);
            rect(-2, -18, 4, 40, "#d5d8cd"); rect(-7, 10, 15, 4, "#bca76e");
            if (foe.data.type === "spearman") rect(-1, 17, 3, 25, "#7c563a");
            ctx.restore();
          }
          if (boss) { rect(-15, -66, 30, 6, "#d7b762"); rect(-9, -73, 5, 8, "#d7b762"); rect(5, -73, 5, 8, "#d7b762"); }
          if (demon) {
            ctx.fillStyle = "#e5c7a1";
            for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 8, -59); ctx.lineTo(side * 22, -82); ctx.lineTo(side * 17, -52); ctx.fill(); }
            rect(-7, -49, 5, 3, "#ffcf65"); rect(4, -49, 5, 3, "#ffcf65");
          }
        } else if (harbor) {
          const crab = foe.data.type.startsWith("crab"), hermit = foe.data.type === "hermit", starfish = foe.data.type === "starfish";
          if (crab || hermit) {
            ctx.strokeStyle = "#a76242"; ctx.lineWidth = 3;
            for (const side of [-1, 1]) for (let leg = 0; leg < 3; leg++) { ctx.beginPath(); ctx.moveTo(side * 10, -14); ctx.lineTo(side * (23 + leg * 2), -4 + leg * 3 + stride * 2); ctx.stroke(); }
            ctx.fillStyle = hermit ? "#b39a73" : "#db805e"; ctx.beginPath(); ctx.ellipse(0, -20, 20, hermit ? 24 : 12, 0, 0, Math.PI * 2); ctx.fill();
            rect(-9, -33, 4, 7, "#263d43"); rect(7, -33, 4, 7, "#263d43");
            if (hermit) { ctx.strokeStyle = "#765f4d"; ctx.beginPath(); ctx.arc(0, -24, 10, 0, Math.PI * 1.7); ctx.stroke(); }
          } else if (starfish) {
            ctx.fillStyle = "#dc937d"; ctx.beginPath();
            for (let point = 0; point < 10; point++) { const a = point * Math.PI / 5 - Math.PI / 2, r = point % 2 ? 11 : 29; const px = Math.cos(a) * r, py = -27 + Math.sin(a) * r; if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fill(); rect(-7, -30, 3, 4, "#263d43"); rect(5, -30, 3, 4, "#263d43");
          } else {
            rect(-11 + stride * 3, -12, 7, 13, "#357b83"); rect(4 - stride * 3, -12, 7, 13, "#357b83");
            ctx.fillStyle = foe.data.boss ? "#879aca" : "#65b5ae"; ctx.beginPath(); ctx.ellipse(0, -30, 16, 24, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#458c97"; ctx.beginPath(); ctx.moveTo(-15, -47); ctx.lineTo(-27, -58); ctx.lineTo(-13, -23); ctx.fill();
            rect(5, -43, 5, 5, "#f3df93");
            ctx.strokeStyle = "#dfc18a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(17, -3); ctx.lineTo(17, -57); ctx.stroke();
            if (foe.data.type === "fishpeople-magos" || foe.data.boss) { ctx.fillStyle = "#a3e5ed"; ctx.beginPath(); ctx.arc(17, -57, 6, 0, Math.PI * 2); ctx.fill(); }
          }
        } else if (foe.data.type === "boar" || foe.data.type === "mutant-boar") {
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
          const bounce = foe.moving ? Math.abs(stride) * 5 : 0;
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
        const recent = recentSkills.get(foe.data.id);
        drawFighterStatuses(ctx, activeStatuses, x, ground, size, elapsed);
        drawFighterHud(ctx, x, ground, avatarScale, ground - 55 * size, {
          name: `${foe.data.boss ? "BOSS · " : ""}${foe.data.name}`, hp: foe.hp, maxHp: foe.data.stats.hp, mp: foe.mp, maxMp: foe.data.stats.mp, enemy: true,
          skill: recent && recent.until > elapsed ? recent.label : undefined,
          statuses: activeStatuses,
        });
        }
        ctx.textAlign = "left";
      }
      if (victoryReward && elapsed < victoryReward.until) {
        const { result: reward, x: rewardX, scale } = victoryReward;
        const x = rewardX * width, size = scale * avatarScale;
        ctx.textAlign = "center";
        if (reward.deepSeaJustUnlocked) text(`Unlocked: ${reward.deepSeaFloor === 2 ? "DeepSea Moot 2F" : "Royal Palace"}`, width * 0.5, height * 0.36, "600 20px system-ui", "#a9e5ed", width * 0.7);
        if (reward.garnalandJustUnlocked) text("Garnaland unlocked!", width * 0.5, height * 0.42, "600 22px system-ui", "#e4d895", width * 0.6);
        ctx.save();
        ctx.font = "bold 18px system-ui";
        const goldGain = `+${reward.goldEarned} gold`, expGain = `+${reward.expEarned} EXP`;
        const goldWidth = ctx.measureText(goldGain).width, rewardWidth = goldWidth + 18 + ctx.measureText(expGain).width;
        const rewardScale = Math.min(1, width * 0.55 / rewardWidth);
        const rewardHalfWidth = rewardWidth * rewardScale / 2;
        ctx.translate(Math.max(rewardHalfWidth + 8, Math.min(width - rewardHalfWidth - 8, x)), ground - 88 * size);
        ctx.scale(rewardScale, rewardScale);
        ctx.textAlign = "left"; ctx.lineJoin = "round";
        ctx.strokeStyle = "#21170f"; ctx.lineWidth = 4;
        ctx.strokeText(goldGain, -rewardWidth / 2, 0);
        ctx.strokeText(expGain, -rewardWidth / 2 + goldWidth + 18, 0);
        ctx.fillStyle = "#ffda45"; ctx.fillText(goldGain, -rewardWidth / 2, 0);
        ctx.fillStyle = "#70f0ff"; ctx.fillText(expGain, -rewardWidth / 2 + goldWidth + 18, 0);
        ctx.restore();
        if (reward.questItemsEarned?.length) text(`Obtained: ${reward.questItemsEarned.map((item) => item.name).join(", ")}`, x, ground - 122 * size, "600 16px system-ui", "#a9e5ed", width * 0.65);
        if (reward.artifactsEarned?.length) text(`Obtained: ${reward.artifactsEarned.map((item) => item.name).join(", ")}`, x, ground - 140 * size, "600 16px system-ui", "#79d8d5", width * 0.65);
        ctx.textAlign = "left";
      }
      effects = effects.filter((effect) => elapsed - effect.startedAt < 0.9);
      for (const effect of effects) drawCombatEffect(ctx, effect, elapsed - effect.startedAt, ground, avatarScale, (id) => {
        const index = members.findIndex(({ character }) => character.id === id);
        return index < 0 ? undefined : memberPositions[index];
      });
      const layout = battleHudLayout(width, height);
      const nameX = layout.pad + 12, nameTop = layout.pad;
      const starter = charactersRef.current.find((character) => character.isStarter) ?? charactersRef.current[0];
      drawPlayerInfo(ctx, { x: layout.pad, y: nameTop, width: layout.nameWidth, height: layout.nameHeight, name: nameRef.current, weapon: starter?.weapon, progression: progressRef.current });
      const locationY = nameTop + 115;
      drawLocationIcon(ctx, location, nameX - 3, locationY - 18, 24);
      text(`${deepsea ? deepSeaName : tourney ? "Zugwangs Battle Tourney" : harbor ? `Harbor · ${period}` : garnaland ? "Garnaland" : forest ? "Forest" : "Meadow"} · ${Math.floor(distance / 16)} m`, nameX + 24, locationY, `${layout.compact ? 10 : 12}px system-ui`, "#66513b", Math.max(24, layout.nameWidth - 48));
      text(`Boss: ${meadowProgress.defeated}/${meadowProgress.target ?? (deepsea ? "30–40" : tourney ? "50–70" : "38–45")}`, nameX, nameTop + 134, `${layout.compact ? 10 : 12}px system-ui`, "#68491e", layout.nameWidth - 24);
      if (message && elapsed < messageUntil) text(message, layout.pad, height - layout.progressHeight - 24, "11px system-ui", "#ffcebb", width - 32);
      for (const badge of layout.currencies) drawCurrencyBadge(ctx, badge.kind, badge.kind === "gold" ? goldRef.current : wishesRef.current, badge.x, badge.y, badge.width, badge.height);
      const controls = [...layout.controls, { ...layout.returnButton, label: "Return to room" }];
      for (const control of controls) {
        const active = control.label === "Character" ? characterFocused.current : control.label === "Return to room" ? focused.current : focusedControl.current === control.label;
        drawRpgButton(ctx, buttonIcons, control.label === "Return to room" ? "map" : control.label.toLowerCase(),
          control.label === "Return to room" ? "Room" : control.label,
          control.x, control.y, control.width, control.height, active);

      }
      if (store.getState().travel === "expedition") store.getState().setTravel(null);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw); returnRef.current?.focus({ preventScroll: true });
    return () => { alive = false; summonAction.current = null; changeSkill2.current = null; retrySpawn.current = null; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [location, team, client, userId, returnToRoom, store]);

  const skillControls = skill2.length ? skill2 : expeditionSkill2(team, characters);
  return <ResponsiveCanvasFrame fit overlay={false} minHeight={560} narrowMinHeight={600}><div className="relative h-full w-full overflow-hidden bg-[#173d3a]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); if (rosterOpen) closeRoster(); else if (collectionOpen) closeCollection(); else void returnToRoom(); }
  }}>
    <div inert={overlayOpen} className="h-full w-full">
    <canvas ref={canvasRef} role="img" aria-label={`Your team is automatically walking from left to right through an endless ${location}.`} className="block h-full w-full" />
    <Skill2Controls fighters={skillControls} busy={skill2Busy || !!combatError?.retry} onChange={(id, enabled) => changeSkill2.current?.(id, enabled)} />
    {(combatError || spawnError) && <div role="alert" className={`menu-info absolute inset-x-4 bottom-24 z-20 flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-[#963f2d] ${skillControls.length > 4 ? "max-[430px]:bottom-[10.5rem]" : ""}`}>
      {combatError ? combatError.message : `Could not load enemies. ${spawnError}`}
      <button type="button" className="menu-action px-3 py-1" disabled={!combatError && spawnPending} onClick={combatError
        ? combatError.retry ?? (() => setCombatError(null)) : () => retrySpawn.current?.()}>
        {combatError ? combatError.retry ? "Retry" : "Dismiss" : spawnPending ? "Loading…" : "Retry spawn"}
      </button>
    </div>}
    <DamageSpread rows={damageSpread} compact={hud.compact} top={Math.max(hud.returnButton.y + hud.returnButton.height, ...hud.controls.map((control) => control.y + control.height)) + hud.gap} pad={hud.pad} />
    <BattleLog key={hud.compact ? "compact" : "wide"} label="Adventure battle log" defaultExpanded={!hud.compact} className={`absolute z-10 ${hud.compact && skillControls.length ? "bottom-24" : ""} ${hud.compact && skillControls.length > 4 ? "max-[430px]:bottom-[10.5rem]" : ""}`} style={{ left: hud.pad, width: hud.nameWidth, ...(hud.compact ? (skillControls.length ? {} : { bottom: hud.pad + hud.progressHeight + hud.gap }) : { top: hud.logY }) }} listStyle={{ maxHeight: Math.max(50, Math.min(200, hud.progressY - hud.logY - 52)) }}>
      {logEntries.length ? logEntries.map((entry, index) => <li key={index}>{entry.actor}: {entry.detail}</li>) : <li>{spawnPending ? "Loading enemies…" : "Waiting for enemies…"}</li>}
    </BattleLog>
    {location === "tourney" && yellowSpectator && hasEvidence && <button ref={spectatorButton} type="button" aria-label="Recognize the yellow spectator from Zugwangs Evidence" disabled={summoning} onClick={() => void summonAction.current?.()}
      className="absolute left-[82%] top-[41%] z-10 h-[72px] w-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 disabled:cursor-wait">
      <span className="sr-only">{summoning ? "Summoning Demon Prince…" : "A yellow-headed person hidden among the spectators"}</span>
    </button>}
    <button ref={returnRef} type="button" style={{ left: hud.returnButton.x, top: hud.returnButton.y, width: hud.returnButton.width, height: hud.returnButton.height }} onClick={() => void returnToRoom()} title="Return to room" onPointerEnter={() => { focused.current = true; }} onPointerLeave={() => { focused.current = false; }} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }} className="absolute cursor-pointer rounded-xl outline-none"><span className="sr-only">Return to room</span></button>
    {returnError && <p role="alert" className="absolute top-40 left-4 rounded bg-[#102c26] p-3 text-sm text-red-200">{returnError} Use Return to room to retry.</p>}
    <button type="button" style={{ left: hud.controls[0].x, top: hud.controls[0].y, width: hud.controls[0].width, height: hud.controls[0].height }} aria-label="Character" aria-expanded={rosterOpen} onClick={() => { paused.current = true; setRosterOpen(true); }} title="Character" onPointerEnter={() => { characterFocused.current = true; }} onPointerLeave={() => { characterFocused.current = false; }} onFocus={() => { characterFocused.current = true; }} onBlur={() => { characterFocused.current = false; }} className="absolute cursor-pointer rounded-xl outline-none"><span className="sr-only">Character</span></button>
    <p role="status" className="sr-only">{characterName}. Gold {gold}. Wish currency {wishCurrency}. Account level {progression.level}. EXP {progression.exp} of {progression.expToNextLevel}.</p>
    {hud.controls.slice(1).map((control) => <button key={control.label} type="button" style={{ left: control.x, top: control.y, width: control.width, height: control.height }} aria-label={control.label} title={control.label} onPointerEnter={() => { focusedControl.current = control.label; }} onPointerLeave={() => { focusedControl.current = ""; }} onFocus={() => { focusedControl.current = control.label; }} onBlur={() => { focusedControl.current = ""; }} aria-expanded={collectionOpen === control.label} onClick={() => { if (control.label === "Shop" || control.label === "Artifacts" || control.label === "Inventory" || control.label === "Wiki") { paused.current = true; setCollectionOpen(control.label); } }} className="absolute cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]"><span className="sr-only">{control.label}</span></button>)}
    </div>
    {levelUp && <LevelUpNotification notice={levelUp} />}
    {rosterOpen && <CharacterRoster characters={characters} onClose={closeRoster} />}
    {collectionOpen === "Wiki" && <WikiPanel onClose={closeCollection} />}
    {collectionOpen === "Inventory" && <InventoryPanel onClose={closeCollection} />}
    {collectionOpen && collectionOpen !== "Inventory" && collectionOpen !== "Wiki" && <CollectionPanel title={collectionOpen} onClose={closeCollection} />}
  </div></ResponsiveCanvasFrame>;
}
