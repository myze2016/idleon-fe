"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { drawCharacterInfoPortrait, drawWeaponTypeIcon, useCharacterPortraits } from "./character-info-icons";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { weaponDetails, type Character } from "@/lib/character";
import { useSession } from "@/lib/auth";
import { useCharacter, useUnlockSkill2, useUpgradeCharacter } from "@/lib/character-api";
import { CollectionPanel } from "./collection-panel";
import { ArtifactIcon } from "./artifact-icon";
import { CurrencyBadge } from "./currency-badge";
import { artifactDetails, artifactStatText } from "@/lib/artifact";

const action = "menu-action inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 py-2 text-xs font-semibold disabled:cursor-default disabled:opacity-50";
const landscapeQuery = "(max-height: 450px) and (min-width: 600px)";
function subscribeLandscape(listener: () => void) {
  const query = window.matchMedia(landscapeQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const landscapeSnapshot = () => window.matchMedia(landscapeQuery).matches;
const serverLandscapeSnapshot = () => false;
export function CharacterStatsScreen({ character: initialCharacter, onClose }: { character: Character; onClose: () => void }) {
  const shortLandscape = useSyncExternalStore(subscribeLandscape, landscapeSnapshot, serverLandscapeSnapshot);
  const portraitVersion = useCharacterPortraits(), id = useId();
  const portrait = useRef<HTMLCanvasElement>(null), closeRef = useRef<HTMLButtonElement>(null);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [panel, setPanel] = useState("stats"), [skillIndex, setSkillIndex] = useState(0);
  const userId = useSession().data?.user.id;
  const state = useCharacter(userId), unlock = useUnlockSkill2(userId), upgrade = useUpgradeCharacter(userId);
  const character = state.data?.characters.find(member => member.id === initialCharacter.id) ?? initialCharacter;
  const gold = state.data?.gold ?? 0, unlocked = !!character.skill2Unlocked;
  const unlockCost = state.data?.economy?.skillUnlockCost ?? 1000;
  const canUnlock = !!character.id && gold >= unlockCost && !unlocked && !unlock.isPending;
  const upgradeDefinition = character.upgrade;
  const canUpgrade = !!character.id && !!upgradeDefinition && gold >= upgradeDefinition.cost && !upgrade.isPending;
  const error = upgrade.error?.message ?? unlock.error?.message;
  const equipped = state.data?.artifacts?.find(item => item.id === character.artifactId);
  const stats = character.stats;
  const entries = stats ? [["HP", stats.hp], ["MP", stats.mp], ["ATK", stats.atk], ["DEF", stats.def], ["Magic", stats.magic], ["Magic DEF", stats.magicDef], ["Speed", stats.speed], ["Range", stats.range]] : [];
  const skill = character.skills?.[skillIndex];
  useEffect(() => { if (!artifactsOpen) closeRef.current?.focus({ preventScroll: true }); }, [artifactsOpen]);
  useEffect(() => {
    const canvas = portrait.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 60 * ratio; canvas.height = 60 * ratio; ctx.scale(ratio, ratio);
    drawCharacterInfoPortrait(ctx, character.weapon, 2, 2, 52);
    drawWeaponTypeIcon(ctx, character.weapon, 40, 40, 20);
  }, [character.weapon, portraitVersion, artifactsOpen]);

  if (typeof document === "undefined") return null;
  return createPortal(<div className="fixed inset-0 z-[100]">{artifactsOpen && character.id ? <CollectionPanel title="Artifacts" characterId={character.id} onClose={() => setArtifactsOpen(false)} /> : <ResponsiveCanvasFrame fit minHeight={360}><div role="dialog" aria-modal="true" aria-label={`${character.name} stats and abilities`} className="paper-menu character-info-screen absolute inset-0 z-30 bg-[#efdfb8] text-[#43311f]" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")).filter(button => button.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    }
  }}>
    <header className="menu-info character-info-header" style={{ flexWrap: "wrap" }}>
      <div className="flex min-w-[140px] flex-1 items-center gap-2">
      <canvas ref={portrait} aria-hidden="true" className="character-info-portrait shrink-0" />
      <div className="min-w-0 flex-1"><h1 className="character-info-name truncate font-serif font-semibold" title={character.name}>{character.name}</h1><p className="truncate text-xs text-[#71583c]">{weaponDetails(character.weapon).label} · Character info</p></div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
      <CurrencyBadge kind="gold" amount={gold} className="w-[clamp(120px,26vw,216px)] !h-11" />
      <button ref={closeRef} type="button" aria-label="Back to character list" onClick={onClose} className={action + " size-11 shrink-0 p-0"}><X size={20} /></button>
      </div>
    </header>
    <nav aria-label="Character info sections" className="character-info-nav">{["stats", "skills", "equipment"].map(name => <button key={name} type="button" aria-pressed={panel === name} aria-controls={`${id}-${name}`} onClick={() => setPanel(name)} className={action} data-active={panel === name}>{name === "stats" ? "Stats" : name === "skills" ? "Skills" : "Equipment"}</button>)}</nav>
    <div className="character-info-panels">
      <section id={`${id}-stats`} aria-label="Character stats" data-active={panel === "stats"} className="menu-info character-info-panel">
        <h2 className="character-panel-heading font-serif text-lg font-semibold">Stats</h2>
        {stats ? <dl className="character-info-stat-grid" style={shortLandscape ? { gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 4 } : undefined}>{entries.map(([label, value]) => <div key={label} className="menu-info character-info-stat"><dt className="text-[11px] text-[#71583c]">{label}</dt><dd className="font-serif text-lg font-semibold tabular-nums">{value}</dd></div>)}</dl> : <p className="text-sm">Stats unavailable. Refresh to load them.</p>}
        <div className="menu-info character-basic-attack"><h3 className="text-sm font-semibold">Attack: {stats?.range === "range" ? "Ranged" : "Melee"}</h3><p className="text-xs text-[#71583c]">{character.timing ? `Every ${character.timing.attackInterval.toFixed(2)}s` : "Basic attack"}</p></div>
        <p className="character-info-note">{equipped || character.upgradeLevel ? "Includes artifact and character upgrade bonuses." : "Your current combat stats."}</p>
      </section>
      <section id={`${id}-skills`} aria-label="Character skills" data-active={panel === "skills"} className="menu-info character-info-panel">
        <h2 className="character-panel-heading font-serif text-lg font-semibold">Skills</h2>
        <div className="character-skill-selector">{[0, 1].map(index => <button key={index} type="button" aria-pressed={skillIndex === index} onClick={() => setSkillIndex(index)} className={action} data-active={skillIndex === index}>Skill {index + 1}{index === 1 && !unlocked ? " · Locked" : ""}</button>)}</div>
        <div className="character-skill-card">
          <h3 className="character-skill-title text-sm font-semibold">{skill?.name ?? `Skill ${skillIndex + 1}`}</h3>
          <p className="character-skill-description">{skill?.description ?? "Refresh to load skill details."}</p>
          <div className="character-skill-meta">{skill?.passive ? <p>Passive · No mana cost</p> : skill ? <><p>{skill.mpCost} MP{skill.hpCost ? ` · ${skill.hpCost} HP` : ""}</p><p>Cast {((character.timing?.spellCastTime ?? 1) * skill.baseCastTime).toFixed(2)}s · Cooldown {skill.cooldown}s</p></> : null}</div>
          {skillIndex === 1 && <div className="character-skill-unlock"><button type="button" disabled={!canUnlock} onClick={() => { if (character.id) unlock.mutate(character.id, { onSuccess: () => closeRef.current?.focus({ preventScroll: true }) }); }} className={action + " w-full"}>{unlocked ? "Skill 2 unlocked" : unlock.isPending ? "Unlocking…" : <>Unlock Skill 2 · {unlockCost.toLocaleString()} gold</>}</button>{!unlocked && gold < unlockCost && <p className="character-info-note mt-1">Need {(unlockCost - gold).toLocaleString()} more gold.</p>}</div>}
        </div>
        <p className="character-info-note">Available skills are used automatically in combat.</p>
      </section>
      <section id={`${id}-equipment`} aria-label="Character equipment and upgrades" data-active={panel === "equipment"} className="menu-info character-info-panel">
        <h2 className="character-panel-heading font-serif text-lg font-semibold">Equipment &amp; upgrades</h2>
        <button type="button" disabled={!character.id} onClick={() => setArtifactsOpen(true)} aria-label={`Equip or unequip artifact. ${equipped ? artifactDetails(equipped.stat).name : "Empty slot"}.`} className={action + " character-artifact-button text-left"}>
          <div className="min-w-0 flex-1"><p className="text-sm">Artifact · Select to equip</p><p className="mt-1 text-xs font-normal">{equipped ? `${artifactDetails(equipped.stat).name} · ${artifactStatText(equipped.stat, equipped.enhancementLevel, state.data?.economy?.artifactEnhancements)}` : "Empty · Buy artifacts in the Shop"}</p></div>{equipped && <ArtifactIcon stat={equipped.stat} />}
        </button>
        <div className="character-upgrade-card"><h3 className="text-sm font-semibold">Character upgrades: {character.upgradeLevel ?? 0}</h3><p className="character-info-note">{upgradeDefinition ? `Next: +${upgradeDefinition.amount} ${upgradeDefinition.label}. Permanent and repeatable.` : "Upgrades are not available for this class yet."}</p><button type="button" disabled={!canUpgrade} onClick={() => { if (character.id) upgrade.mutate(character.id); }} className={action + " w-full"}>{upgrade.isPending ? "Upgrading…" : upgradeDefinition ? <>Upgrade +{upgradeDefinition.amount} {upgradeDefinition.label} · {upgradeDefinition.cost.toLocaleString()} gold</> : "Upgrade unavailable"}</button></div>
      </section>
    </div>
    {error && <footer className="character-info-footer"><p role="alert" className="min-w-0 text-xs text-[#a13725]">{error}</p></footer>}
  </div></ResponsiveCanvasFrame>}</div>, document.body);
}
