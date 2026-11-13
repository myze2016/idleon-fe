"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { weaponDetails, type CharacterStats, type WeaponType, type ActionTiming, type CharacterUpgrade } from "@/lib/character";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

interface WikiCharacter {
  id: WeaponType; name: string; special: boolean; stats: CharacterStats; timing: ActionTiming; upgrade: CharacterUpgrade | null;
  skills: { id: string; slot: number; name: string; description: string; passive: boolean; mpCost: number; hpCost: number; baseCastTime: number; cooldown: number; unlockCost: number; damage?: { base: number; stat: "atk" | "magic" } }[];
}
const statLabels = [["hp", "HP"], ["mp", "MP"], ["atk", "Attack"], ["def", "Defense"], ["magic", "Magic"], ["magicDef", "Sp. Defense"], ["speed", "Speed"]] as const;

export function CharacterWikiPanel({ onClose, onEnemies }: { onClose: () => void; onEnemies: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(""), [pool, setPool] = useState("all");
  const query = useQuery({ queryKey: ["character-wiki"], queryFn: () => api<WikiCharacter[]>("/wiki/characters") });
  useEffect(() => { searchRef.current?.focus({ preventScroll: true }); }, []);
  const entries = query.data ?? [];
  const filtered = entries.filter((entry) => (pool === "all" || entry.special === (pool === "special")) &&
    `${entry.name} ${weaponDetails(entry.id).label} ${entry.skills.map((skill) => `${skill.name} ${skill.description}`).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  const inputClass = "min-w-0 rounded-lg border border-[#708360] bg-[#163a30] px-3 py-2 text-sm text-[#f1ebce] outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895]";
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="character-wiki-title" className="absolute inset-0 z-40 overflow-auto bg-gradient-to-b from-[#102e29] to-[#3d5e47] text-[#f1ebce]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input, select"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header className="sticky top-0 z-10 space-y-3 border-b border-[#708360] bg-[#102e29] p-5">
      <h2 id="character-wiki-title" className="flex items-center gap-2 pr-14 text-2xl font-semibold"><BookOpen size={24} /> Character Wiki</h2>
      <button type="button" aria-label="Close wiki" onClick={onClose} className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-xl border border-[#708360] outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895]"><X size={20} /></button>
      <div role="group" aria-label="Wiki category" className="flex gap-2"><button type="button" onClick={onEnemies} className={`${inputClass} cursor-pointer`} aria-pressed={false}>Enemies</button><button type="button" className={`${inputClass} cursor-pointer border-[#e4d895]`} aria-pressed={true}>Characters</button></div>
      <div className="flex flex-wrap gap-2"><label className="relative min-w-[180px] flex-1"><Search size={16} aria-hidden="true" className="absolute top-3 left-3 text-[#c1cda9]" /><input ref={searchRef} aria-label="Search characters or skills" placeholder="Search characters or skills…" value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} w-full pl-9`} /></label>
        <select aria-label="Filter character pool" value={pool} onChange={(event) => setPool(event.target.value)} className={inputClass}><option value="all">All characters</option><option value="normal">Normal characters</option><option value="special">Special characters</option></select>
      </div>
      <p role="status" className="text-xs text-[#c1cda9]">{filtered.length} of {entries.length} characters</p>
    </header>
    <div className="mx-auto max-w-5xl space-y-4 p-5">
      <p className="text-xs leading-relaxed text-[#c1cda9]">Base stats exclude upgrades and artifacts. Damage formulas use current Attack or Magic before the target’s corresponding defense. Living characters regenerate 5 MP per second in battle. Speed shortens attack intervals and cast times. Skill 1 starts unlocked; Skill 2 costs 1,000 gold per character.</p>
      {query.isPending && <p role="status">Loading character wiki…</p>}
      {query.isError && <div role="alert" className="text-[#ffbca8]"><p>{query.error.message}</p><button type="button" onClick={() => void query.refetch()} className={`${inputClass} mt-2 cursor-pointer`}>Retry</button></div>}
      {filtered.map((entry) => <article key={entry.id} className="rounded-xl border border-[#708360] bg-[#163a30] p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{entry.name}</h3>{entry.special && <span className="rounded bg-[#e4d895] px-2 py-0.5 text-xs font-semibold text-[#17392e]">Special</span>}</div>
        <p className="mt-1 text-xs text-[#a9ced0]">Weapon: {weaponDetails(entry.id).label} · {entry.special ? "Special wish · 200 currency" : "Starter selection or normal wish · 100 currency"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statLabels.map(([stat, label]) => <div key={stat} className="rounded bg-[#244b3e] px-3 py-2"><dt className="text-xs text-[#c1cda9]">{label}</dt><dd className="font-semibold">{entry.stats[stat]}</dd></div>)}
          <div className="rounded bg-[#244b3e] px-3 py-2"><dt className="text-xs text-[#c1cda9]">Basic attack range</dt><dd className="font-semibold">{entry.stats.range === "range" ? "Ranged" : "Melee"}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-[#e4d895]">{entry.upgrade ? `Upgrade: +${entry.upgrade.amount} ${entry.upgrade.label} for ${entry.upgrade.cost.toLocaleString()} gold per level` : "Character upgrade unavailable"}</p>
        <p className="mt-1 text-xs text-[#c1cda9]">Base attack interval: {Number(entry.timing.attackInterval.toFixed(3))}s · Base spell cast time after Speed: {Number(entry.timing.spellCastTime.toFixed(3))}s</p>
        <h4 className="mt-4 text-sm font-semibold">Skills</h4>
        <ul className="mt-2 space-y-2">{entry.skills.map((skill) => <li key={skill.slot} className="rounded-lg border border-[#527969] p-3">
          <p className="font-semibold text-[#a9d4ff]">Skill {skill.slot}: {skill.name} <span className="text-xs font-normal">({skill.passive ? "Passive" : "Active"})</span></p>
          <p className="mt-1 text-xs text-[#e4d895]">{skill.unlockCost ? `${skill.unlockCost.toLocaleString()} gold to unlock` : "Unlocked from the start"}{!skill.passive ? ` · ${skill.mpCost} MP${skill.hpCost ? ` · ${skill.hpCost} HP` : ""} · ${skill.cooldown}s cooldown · ${skill.baseCastTime}s cast before Speed` : ""}</p>
          {skill.damage && <p className="mt-2 text-sm font-semibold text-[#69b7ff]">Damage: {skill.damage.base} + current {skill.damage.stat === "atk" ? "Attack (physical)" : "Magic (magic)"}, before defense</p>}
          <p className="mt-1 text-sm text-[#c1cda9]">{skill.description}</p>
        </li>)}</ul>
      </article>)}
      {!query.isPending && !query.isError && !filtered.length && <p className="text-[#c1cda9]">No characters match your search.</p>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
