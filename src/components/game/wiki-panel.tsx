"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { CharacterStats } from "@/lib/character";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { CharacterWikiPanel } from "./character-wiki-panel";

interface WikiEnemy {
  id: string; name: string; boss: boolean; locations: string[]; stats: CharacterStats; gold: number; experience: number; attackInterval: number; note: string | null;
  skills: { name: string; description: string; mana: number; cooldown: number | null; duration?: number; damage?: number; damageType?: "Physical" | "Magic" }[];
}
const statLabels = [["hp", "HP"], ["mp", "MP"], ["atk", "Attack"], ["def", "Defense"], ["magic", "Magic"], ["magicDef", "Sp. Defense"], ["speed", "Speed"]] as const;

export function WikiPanel({ onClose }: { onClose: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<"enemies" | "characters">("enemies");
  const [search, setSearch] = useState(""), [location, setLocation] = useState("all"), [kind, setKind] = useState("all");
  const query = useQuery({ queryKey: ["enemy-wiki"], queryFn: () => api<WikiEnemy[]>("/wiki/enemies") });
  useEffect(() => { searchRef.current?.focus({ preventScroll: true }); }, [category]);
  const entries = query.data ?? [];
  const locations = [...new Set(entries.flatMap((enemy) => enemy.locations))].sort();
  const filtered = entries.filter((enemy) => (location === "all" || enemy.locations.includes(location))
    && (kind === "all" || enemy.boss === (kind === "boss"))
    && `${enemy.name} ${enemy.locations.join(" ")} ${enemy.skills.map((skill) => `${skill.name} ${skill.description}`).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  const inputClass = "min-w-0 rounded-lg border border-[#708360] bg-[#163a30] px-3 py-2 text-sm text-[#f1ebce] outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895]";
  if (category === "characters") return <CharacterWikiPanel onClose={onClose} onEnemies={() => setCategory("enemies")} />;
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="wiki-title" className="absolute inset-0 z-40 overflow-auto bg-gradient-to-b from-[#102e29] to-[#3d5e47] text-[#f1ebce]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input, select"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header className="sticky top-0 z-10 space-y-3 border-b border-[#708360] bg-[#102e29] p-5">
      <h2 id="wiki-title" className="flex items-center gap-2 pr-14 text-2xl font-semibold"><BookOpen size={24} /> Enemy Wiki</h2>
      <button type="button" aria-label="Close wiki" onClick={onClose} className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-xl border border-[#708360] outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895]"><X size={20} /></button>
      <div role="group" aria-label="Wiki category" className="flex gap-2"><button type="button" className={`${inputClass} cursor-pointer border-[#e4d895]`} aria-pressed={true}>Enemies</button><button type="button" onClick={() => setCategory("characters")} className={`${inputClass} cursor-pointer`} aria-pressed={false}>Characters</button></div>
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[180px] flex-1"><Search size={16} aria-hidden="true" className="absolute top-3 left-3 text-[#c1cda9]" /><input ref={searchRef} aria-label="Search enemies or skills" placeholder="Search enemies or skills…" value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} w-full pl-9`} /></label>
        <select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} className={`${inputClass} max-w-full`}><option value="all">All locations</option>{locations.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select aria-label="Filter by enemy type" value={kind} onChange={(event) => setKind(event.target.value)} className={inputClass}><option value="all">All enemies</option><option value="boss">Bosses</option><option value="regular">Regular enemies</option></select>
      </div>
      <p role="status" className="text-xs text-[#c1cda9]">{filtered.length} of {entries.length} enemies</p>
    </header>
    <div className="mx-auto max-w-5xl space-y-4 p-5">
      <p className="text-xs leading-relaxed text-[#c1cda9]">Damage shown is before the target’s defenses. Basic attacks use the greater of Attack − Defense or Magic − Sp. Defense, with a minimum of 1 damage. Skills use their listed damage type and also deal at least 1 damage. Enemies do not regenerate mana.</p>
      {query.isPending && <p role="status">Loading enemy wiki…</p>}
      {query.isError && <div role="alert" className="text-[#ffbca8]"><p>{query.error.message}</p><button type="button" onClick={() => void query.refetch()} className={`${inputClass} mt-2 cursor-pointer`}>Retry</button></div>}
      {filtered.map((enemy) => <article key={enemy.id} className="rounded-xl border border-[#708360] bg-[#163a30] p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{enemy.name}</h3>{enemy.boss && <span className="rounded bg-[#e4d895] px-2 py-0.5 text-xs font-semibold text-[#17392e]">Boss</span>}</div>
        <p className="mt-1 text-xs text-[#a9ced0]">{enemy.locations.join(" · ")}</p>
        {enemy.note && <p className="mt-1 text-xs text-[#c1cda9]">{enemy.note}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statLabels.map(([stat, label]) => <div key={stat} className="rounded bg-[#244b3e] px-3 py-2"><dt className="text-xs text-[#c1cda9]">{label}</dt><dd className="font-semibold">{enemy.stats[stat]}</dd></div>)}
          <div className="rounded bg-[#244b3e] px-3 py-2"><dt className="text-xs text-[#c1cda9]">Range</dt><dd className="font-semibold">{enemy.stats.range === "range" ? "Ranged" : "Melee"}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-[#e4d895]">Reward: {enemy.experience} EXP · {enemy.gold.toLocaleString()} gold</p>
        <p className="mt-1 text-xs text-[#c1cda9]">Basic attack: {enemy.stats.atk} physical / {enemy.stats.magic} magic · every {Number(enemy.attackInterval.toFixed(3))}s</p>
        <h4 className="mt-4 text-sm font-semibold">Skills</h4>
        {enemy.skills.length ? <ul className="mt-2 space-y-2">{enemy.skills.map((skill) => <li key={skill.name} className="rounded-lg border border-[#527969] p-3">
          <p className="font-semibold text-[#a9d4ff]">{skill.name}{skill.damage !== undefined && <span className="ml-2 text-sm">{skill.damage} {skill.damageType?.toLowerCase()} damage</span>}</p>
          <p className="mt-1 text-xs text-[#e4d895]">{skill.mana ? `${skill.mana} MP` : "Passive"}{skill.cooldown !== null ? ` · ${skill.cooldown}s cooldown` : ""}{skill.duration ? ` · ${skill.duration}s duration` : ""}</p>
          <p className="mt-1 text-sm text-[#c1cda9]">{skill.description}</p>
        </li>)}</ul> : <p className="mt-1 text-sm text-[#c1cda9]">No skills. Uses basic attacks.</p>}
      </article>)}
      {!query.isPending && !query.isError && !filtered.length && <p className="text-[#c1cda9]">No enemies match your search.</p>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
