"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

import { useEffect, useRef, useState } from "react";
import { weaponDetails, type Character } from "@/lib/character";
import { useSession } from "@/lib/auth";
import { useCharacter, useUnlockSkill2, useUpgradeCharacter } from "@/lib/character-api";
import { CollectionPanel } from "./collection-panel";
import { artifactDetails } from "@/lib/artifact";

export function CharacterStatsScreen({ character: initialCharacter, onClose }: { character: Character; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [focused, setFocused] = useState("");
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [unlockRect, setUnlockRect] = useState({ x: 0, y: 0, width: 0 });
  const session = useSession();
  const state = useCharacter(session.data?.user.id);
  const unlock = useUnlockSkill2(session.data?.user.id);
  const upgrade = useUpgradeCharacter(session.data?.user.id);
  const character = state.data?.characters.find((member) => member.id === initialCharacter.id) ?? initialCharacter;
  const gold = state.data?.gold ?? 0;
  const unlocked = !!character.skill2Unlocked;
  const canUnlock = !!character.id && gold >= 10000 && !unlocked && !unlock.isPending;
  const error = upgrade.error?.message ?? unlock.error?.message;
  const upgradeDefinition = character.upgrade;
  const canUpgrade = !!character.id && !!upgradeDefinition && gold >= upgradeDefinition.cost && !upgrade.isPending;
  const equipped = state.data?.artifacts?.find((item) => item.id === character.artifactId);
  const entries = character.stats ? [
    ["HP", character.stats.hp], ["MP", character.stats.mp], ["ATK", character.stats.atk], ["DEF", character.stats.def],
    ["Magic", character.stats.magic], ["Magic DEF", character.stats.magicDef], ["Speed", character.stats.speed], ["Range", character.stats.range],
  ] as const : [];

  useEffect(() => { if (!artifactsOpen) closeRef.current?.focus({ preventScroll: true }); }, [artifactsOpen]);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight, ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); ctx.scale(ratio, ratio);
      const background = ctx.createLinearGradient(0, 0, 0, h); background.addColorStop(0, "#102e29"); background.addColorStop(1, "#3d5e47");
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
      function text(value: string, x: number, y: number, font: string, color = "#f1ebce", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      function wrap(value: string, x: number, y: number, maxWidth: number, lines: number) {
        ctx!.font = "12px system-ui";
        let line = "", row = 0;
        for (const word of value.split(" ")) {
          if (line && ctx!.measureText(`${line} ${word}`).width > maxWidth) {
            text(line, x, y + row * 18, "12px system-ui", "#c1cda9"); line = word; row++;
            if (row >= lines) return;
          } else line = line ? `${line} ${word}` : word;
        }
        if (line) text(line, x, y + row * 18, "12px system-ui", "#c1cda9");
      }
      text(character.name, 24, 48, "600 26px system-ui", "#f1ebce", w - 112);
      text(`${weaponDetails(character.weapon).label} / Stats${equipped || character.upgradeLevel ? " (includes bonuses)" : ""}`, 24, 76, "13px system-ui", "#c1cda9", w - 48);
      const top = 106;
      const area = Math.min(720, w - 48), left = (w - area) / 2, cellWidth = (area - 12) / 2;
      const cellHeight = 44;
      const stats = character.stats;
      const rows = stats ? [["HP", stats.hp], ["MP", stats.mp], ["ATK", stats.atk], ["DEF", stats.def], ["Magic", stats.magic], ["Magic DEF", stats.magicDef], ["Speed", stats.speed], ["Range", stats.range]] : [];
      rows.forEach(([label, value], i) => {
        const x = left + i % 2 * (cellWidth + 12), y = top + Math.floor(i / 2) * (cellHeight + 10);
        ctx.beginPath(); ctx.roundRect(x, y, cellWidth, cellHeight, 8); ctx.fillStyle = "#14372e"; ctx.fill(); ctx.strokeStyle = "#708360"; ctx.lineWidth = 1; ctx.stroke();
        text(String(label), x + 12, y + cellHeight / 2 + 5, "12px system-ui", "#c1cda9");
        ctx.textAlign = "right"; text(String(value), x + cellWidth - 12, y + cellHeight / 2 + 5, "600 16px system-ui", "#f1ebce"); ctx.textAlign = "left";
      });
      if (!stats) text("Stats unavailable. Refresh to load them.", 24, top + 30, "14px system-ui", "#c1cda9", w - 48);
      const abilityTop = 332;
      const abilities = [
        { title: `Attack: ${stats?.range === "range" ? "Ranged" : "Melee"}`, detail: character.timing ? `Every ${character.timing.attackInterval.toFixed(2)}s` : "Basic attack", y: abilityTop, height: 66, skill: undefined },
        ...[0, 1].map((index) => {
          const skill = character.skills?.[index];
          return { title: `Skill ${index + 1}${skill ? `: ${skill.name}` : ""}`, detail: skill?.description ?? "Refresh to load skill details.", y: index === 0 ? 410 : 574, height: index === 0 ? 152 : 228, skill };
        }),
      ];
      abilities.forEach((ability, i) => {
        const y = ability.y;
        ctx.beginPath(); ctx.roundRect(left, y, area, ability.height, 8); ctx.fillStyle = "#14372e"; ctx.fill(); ctx.strokeStyle = "#708360"; ctx.stroke();
        text(ability.title, left + 12, y + 24, "600 15px system-ui", "#f1ebce", area - 24);
        wrap(ability.detail, left + 12, y + 47, area - 24, i === 0 ? 1 : i === 1 ? 4 : 5);
        if (ability.skill) {
          const skill = ability.skill;
          const timing = (character.timing?.spellCastTime ?? 1) * skill.baseCastTime;
          const metadata = skill.passive ? "Passive · No mana cost" : `${skill.mpCost} MP${skill.hpCost ? ` · ${skill.hpCost} HP` : ""} · Cast ${timing.toFixed(2)}s · Cooldown ${skill.cooldown}s`;
          text(metadata, left + 12, y + (i === 1 ? 133 : 146), "11px system-ui", "#e4d895", area - 24);
        }
      });
      const buttonWidth = area - 24, buttonX = left + 12, buttonY = 742;
      setUnlockRect({ x: buttonX, y: buttonY, width: buttonWidth });
      ctx.beginPath(); ctx.roundRect(buttonX, buttonY, buttonWidth, 44, 8); ctx.fillStyle = canUnlock ? "#e4d895" : "#365642"; ctx.fill(); ctx.strokeStyle = focused === "unlock" ? "#fff" : "#8f9c72"; ctx.stroke();
      ctx.textAlign = "center";
      text(unlocked ? "Unlocked" : unlock.isPending ? "Unlocking..." : "Unlock · 10,000 gold", buttonX + buttonWidth / 2, buttonY + 27, "600 12px system-ui", canUnlock ? "#17392e" : "#e4d895", buttonWidth - 12);
      ctx.textAlign = "left";
      text(`Gold: ${gold.toLocaleString()}`, left, 830, "600 14px system-ui", "#e4d895", area);
      text(error ?? (!unlocked && gold < 10000 ? `Need ${(10000 - gold).toLocaleString()} more gold to unlock Skill 2.` : "Available skills are used automatically during combat."), left, 854, "12px system-ui", error ? "#ffcebb" : "#c1cda9", area);
      ctx.beginPath(); ctx.roundRect(left, 880, area, 66, 8); ctx.fillStyle = "#14372e"; ctx.fill(); ctx.strokeStyle = focused === "artifact" ? "#fff0b8" : "#708360"; ctx.stroke();
      text("Artifact · Select to equip or unequip", left + 12, 903, "600 14px system-ui", "#e4d895", area - 24);
      text(equipped ? `${artifactDetails(equipped.stat).name} · +5 ${artifactDetails(equipped.stat).label}` : "Empty · Buy artifacts in the Shop", left + 12, 927, "13px system-ui", "#c1cda9", area - 24);
      text(`Character upgrades: ${character.upgradeLevel ?? 0}`, left, 974, "600 15px system-ui", "#e4d895", area);
      text(upgradeDefinition ? `Each upgrade: +${upgradeDefinition.amount} ${upgradeDefinition.label}. Permanent and repeatable.` : "Upgrades are not available for this class yet.", left, 995, "12px system-ui", "#c1cda9", area);
      ctx.beginPath(); ctx.roundRect(buttonX, 1010, buttonWidth, 44, 8); ctx.fillStyle = canUpgrade ? "#e4d895" : "#365642"; ctx.fill(); ctx.strokeStyle = focused === "upgrade" ? "#fff" : "#8f9c72"; ctx.stroke();
      ctx.textAlign = "center";
      text(upgrade.isPending ? "Upgrading..." : upgradeDefinition ? `Upgrade +${upgradeDefinition.amount} ${upgradeDefinition.label} · 1,000 gold` : "Upgrade unavailable", buttonX + buttonWidth / 2, 1038, "600 12px system-ui", canUpgrade ? "#17392e" : "#e4d895", buttonWidth - 12);
      ctx.textAlign = "left";
      if (upgrade.error) text(upgrade.error.message, left, 1080, "12px system-ui", "#ffcebb", area);
      ctx.beginPath(); ctx.roundRect(w - 64, 16, 48, 48, 12); ctx.fillStyle = "#163a30"; ctx.fill(); ctx.strokeStyle = focused === "close" ? "#fff" : "#708360"; ctx.stroke();
      ctx.strokeStyle = "#f1ebce"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w - 47, 33); ctx.lineTo(w - 33, 47); ctx.moveTo(w - 33, 33); ctx.lineTo(w - 47, 47); ctx.stroke();
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [character, focused, gold, unlocked, canUnlock, error, unlock.isPending, equipped, artifactsOpen, upgradeDefinition, canUpgrade, upgrade.isPending, upgrade.error]);

  if (artifactsOpen && character.id) return <CollectionPanel title="Artifacts" characterId={character.id} onClose={() => { setArtifactsOpen(false); }} />;

  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-label={`${character.name} stats and abilities`} className="absolute inset-0 z-30 overflow-auto bg-[#102e29]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div className="relative h-full min-h-[1110px] w-full">
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label="Back to character list" onClick={onClose} onFocus={() => setFocused("close")} onBlur={() => setFocused("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Back to character list</span></button>
    <button type="button" disabled={!canUnlock} onClick={() => { if (character.id) unlock.mutate(character.id, { onSuccess: () => closeRef.current?.focus({ preventScroll: true }) }); }} onFocus={() => setFocused("unlock")} onBlur={() => setFocused("")} className="absolute h-11 cursor-pointer rounded-lg outline-none disabled:cursor-default" style={{ left: unlockRect.x, top: unlockRect.y, width: unlockRect.width }}><span className="sr-only">{unlocked ? "Skill 2 unlocked" : "Unlock Skill 2 for 10,000 gold"}</span></button>
    <button type="button" disabled={!character.id} onClick={() => setArtifactsOpen(true)} onFocus={() => setFocused("artifact")} onBlur={() => setFocused("")} className="absolute top-[880px] h-[66px] cursor-pointer rounded-lg outline-none" style={{ left: unlockRect.x - 12, width: unlockRect.width + 24 }}><span className="sr-only">Equip or unequip artifact. {equipped ? artifactDetails(equipped.stat).name : "Empty slot"}.</span></button>
    <button type="button" disabled={!canUpgrade} onClick={() => { if (character.id) upgrade.mutate(character.id); }} onFocus={() => setFocused("upgrade")} onBlur={() => setFocused("")} className="absolute top-[1010px] h-11 cursor-pointer rounded-lg outline-none disabled:cursor-default" style={{ left: unlockRect.x, width: unlockRect.width }}><span className="sr-only">{upgradeDefinition ? `Upgrade character: +${upgradeDefinition.amount} ${upgradeDefinition.label}, costs 1,000 gold` : "Upgrade unavailable"}</span></button>
    <p role="status" className="sr-only">Character upgrades: {character.upgradeLevel ?? 0}. {upgrade.isPending ? "Upgrading." : ""}</p>
    <p role="status" className="sr-only">Attack: {character.stats?.range === "range" ? "Ranged" : "Melee"}. Skill 2: {unlocked ? "unlocked" : "locked, costs 10,000 gold"}. Gold: {gold}.</p>
    <ul className="sr-only">{character.skills?.map((skill) => <li key={skill.id}>{skill.name}. {skill.description} {skill.passive ? "Passive" : `${skill.mpCost} MP, ${skill.hpCost} HP, ${skill.cooldown} second cooldown.`} {skill.unlocked ? "Available" : "Locked"}.</li>)}</ul>
    {error && <p role="alert" className="sr-only">{error}</p>}
    <dl className="sr-only">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
  </div></ResponsiveCanvasFrame>;
}
