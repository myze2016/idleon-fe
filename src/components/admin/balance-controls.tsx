"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EnemyBalanceEditor } from "./enemy-balance-editor";
import { AdminArenaLab } from "./arena-lab";
import { BalancePicker } from "./balance-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { weaponDetails, specialWeapons, type WeaponType } from "@/lib/character";

export type Stats = { hp: number; mp: number; atk: number; def: number; magic: number; magicDef: number; speed: number; range: string };
type Skill = { id: string; name: string; description: string; passive: boolean; mpCost: number; hpCost: number; baseCastTime: number; cooldown: number; damage?: { base: number; stat: string }; power?: number; duration?: number; chance?: number; multiplier?: number; bounces?: number };
export type Config = { stats: Record<string, Stats>; skills: Record<string, Skill>; enemies: Record<string, Stats & Record<string, unknown>>; rewards: Record<string, { gold: number; experience: number }> };
export type Catalog = { version: number; config: Config; defaults: Config; weapons: { weapon: string; skills: string[] }[]; monsters: { id: string; name: string; stats: Stats; locations?: string[] }[]; history: { id: number; note: string; createdAt: string }[] };
const action = "menu-action min-h-10 px-4 py-2 text-sm disabled:opacity-50";
const field = "menu-field min-h-10 w-full px-3 py-2 text-sm";
const labels: Record<string, string> = { hp: "HP", mp: "MP", atk: "Attack", def: "Defense", magic: "Magic", magicDef: "Magic defense", speed: "Speed", mpCost: "MP cost", hpCost: "HP cost", baseCastTime: "Cast time (seconds)", cooldown: "Cooldown (seconds)", power: "Effect amount", duration: "Effect duration (seconds)", chance: "Chance (0–1)", multiplier: "Critical multiplier", bounces: "Extra bounces" };

export function AdminBalanceControls() {
  const query = useQuery({ queryKey: ["admin", "balance", "rewards"], queryFn: () => api<Catalog>("/admin/balance"), staleTime: Infinity, refetchOnWindowFocus: false });
  if (query.isPending) return <p className="mt-6" role="status">Loading balance tools…</p>;
  if (query.error) return <div className="mt-6"><p role="alert">{query.error.message}</p><button className={action} onClick={() => void query.refetch()}>Retry balance tools</button></div>;
  return <BalanceEditor key={query.data.version} catalog={query.data} />;
}

function BalanceEditor({ catalog }: { catalog: Catalog }) {
  const router = useRouter(), params = useSearchParams();
  const screen = params.get("view") === "arena" ? "arena" : params.get("view") === "lab" ? "lab" : "balance";
  const [tab, setTab] = useState<"characters" | "enemies">("characters");
  const client = useQueryClient();
  const [config, setConfig] = useState<Config>(() => structuredClone(catalog.config));
  const [weapon, setWeapon] = useState(catalog.weapons[0].weapon);
  const [characterType, setCharacterType] = useState("all");
  function matchesCharacterType(id: string, type: string) {
    const special = specialWeapons.some(entry => entry.id === id);
    return type === "all" || (type === "special" ? special : !special);
  }
  const filteredWeapons = catalog.weapons.filter(entry => matchesCharacterType(entry.weapon, characterType));
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = JSON.stringify(config) !== JSON.stringify(catalog.config);
  const save = useMutation({ mutationFn: () => api("/admin/balance", { method: "PUT", body: JSON.stringify({ config, version: catalog.version, note }) }), onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["admin", "balance"] }), client.invalidateQueries({ queryKey: ["character"] }), client.invalidateQueries({ queryKey: ["character-wiki"] }), client.invalidateQueries({ queryKey: ["enemy-wiki"] }), client.invalidateQueries({ queryKey: ["patch-notes"] })]);
  } });
  const restore = useMutation({ mutationFn: (id: number) => api<{ config: Config }>(`/admin/balance/history/${id}`), onSuccess: data => { setConfig(data.config); setNotice("Revision loaded as a draft. Test it or publish with a change note."); } });
  const reload = useMutation({ mutationFn: () => api<Catalog>("/admin/balance"), onSuccess: data => { client.setQueryData(["admin", "balance", "rewards"], data); setConfig(structuredClone(data.config)); setNotice("Published values loaded. Draft changes discarded."); } });
  function stat(key: string, value: number) { setConfig(previous => ({ ...previous, stats: { ...previous.stats, [weapon]: { ...previous.stats[weapon], [key]: value } } })); }
  function skill(id: string, key: string, value: number) {
    setConfig(previous => ({ ...previous, skills: { ...previous.skills, [id]: key === "damage" ? { ...previous.skills[id], damage: { ...previous.skills[id].damage!, base: value } } : { ...previous.skills[id], [key]: value } } }));
  }
  function numeric(label: string, value: number, update: (value: number) => void, min = 0, max = 100000, step = 1) {
    return <label key={label} className="text-xs font-semibold">{label}<input className={field + " mt-1"} type="number" min={min} max={max} step={step} required value={Number.isFinite(value) ? value : ""} onChange={event => update(event.target.value === "" ? NaN : Number(event.target.value))} /></label>;
  }
  const error = save.error?.message ?? restore.error?.message ?? reload.error?.message;
  return <section className="mt-8 space-y-5 border-t border-slate-200/50 pt-6" aria-labelledby="balance-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="balance-title" className="font-sans text-xl">{screen === "balance" ? "Character & enemy balancing" : "Battle Lab"}</h3>{screen === "balance" ? <button type="button" className={action} onClick={() => router.push("/dashboard/admin/balance?view=lab", { scroll: false })}>Open Battle Lab</button> : <button type="button" className={action} onClick={() => router.push("/dashboard/admin/balance", { scroll: false })}>Back to balancing</button>}</div>
    <p className="text-sm">Live version {catalog.version}. {dirty ? "You have unpublished changes." : "Showing published values."} Publishing affects new fights and character stats for everyone. Existing battle results stay as recorded.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <div hidden={screen !== "balance"} className="space-y-5">
    <div role="tablist" aria-label="Balance category" className="flex gap-2">{(["characters", "enemies"] as const).map(value => <button key={value} id={`balance-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`balance-panel-${value}`} tabIndex={tab === value ? 0 : -1} className={action} onClick={() => setTab(value)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const next = event.key === "Home" ? "characters" : event.key === "End" ? "enemies" : value === "characters" ? "enemies" : "characters";
      setTab(next); document.getElementById(`balance-tab-${next}`)?.focus();
    }}>{value === "characters" ? "Characters" : "Enemies"}</button>)}</div>
    <div role="tabpanel" id="balance-panel-characters" aria-labelledby="balance-tab-characters" hidden={tab !== "characters"} className="menu-info space-y-5 p-4">
      <label className="block text-xs font-semibold">Character type<select className={field + " mt-1"} value={characterType} onChange={event => {
        const next = event.target.value;
        setCharacterType(next);
        if (!matchesCharacterType(weapon, next)) {
          const first = catalog.weapons.find(entry => matchesCharacterType(entry.weapon, next));
          if (first) setWeapon(first.weapon);
        }
      }}><option value="all">All characters</option><option value="standard">Standard</option><option value="special">Special</option></select></label>
      <BalancePicker label="Characters" options={filteredWeapons.map(entry => { const details = weaponDetails(entry.weapon as WeaponType); const name = ({ glaive: "Kent", "ice-staff": "Juan", "dual-axe": "Jeffrey" } as Record<string, string>)[entry.weapon]; return { id: entry.weapon, name: name ? `${name} · ${details.label}` : details.label, aliases: details.description }; })} selected={weapon} onSelect={setWeapon} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(config.stats[weapon]).filter(([key]) => key !== "range").map(([key, value]) => numeric(labels[key], Number(value), value => stat(key, value), key === "hp" ? 1 : 0, key === "speed" ? 1000 : 100000))}</div>
      <p className="text-xs">Base stats before upgrades and artifacts. Attack range: {config.stats[weapon].range}.</p>
      {catalog.weapons.find(entry => entry.weapon === weapon)!.skills.map(id => {
        const current = config.skills[id];
        return <fieldset key={id} className="border-t border-slate-200/40 pt-4"><legend className="px-2 text-sm font-semibold">{current.name} {current.passive ? "· Passive" : "· Active"}</legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(current).filter(([key, value]) => typeof value === "number" && !(current.passive && ["mpCost", "hpCost", "baseCastTime", "cooldown"].includes(key))).map(([key, value]) => numeric(labels[key] ?? key, Number(value), value => skill(id, key, value), ["baseCastTime", "cooldown"].includes(key) ? .1 : 0, key === "chance" ? 1 : ["bounces", "multiplier"].includes(key) ? 10 : ["duration", "baseCastTime", "cooldown"].includes(key) ? 300 : 100000, ["chance", "duration", "multiplier", "baseCastTime", "cooldown"].includes(key) ? .1 : 1))}
          {current.damage && numeric(`Base damage (+ current ${current.damage.stat})`, current.damage.base, value => skill(id, "damage", value))}</div>
          {current.passive && !["power", "chance", "duration", "multiplier"].some(key => key in current) && <p className="text-xs">This passive has no editable numeric values.</p>}
        </fieldset>;
      })}
      <div className="flex flex-wrap gap-2"><button className={action} type="button" onClick={() => { setConfig(previous => ({ ...previous, stats: { ...previous.stats, [weapon]: structuredClone(catalog.defaults.stats[weapon]) }, skills: { ...previous.skills, ...Object.fromEntries(catalog.weapons.find(entry => entry.weapon === weapon)!.skills.map(id => [id, structuredClone(catalog.defaults.skills[id])])) } })); }}>Reset this character to defaults</button>
      <button className={action} type="button" disabled={reload.isPending} onClick={() => reload.mutate()}>Reload published values</button></div>
      <p className="text-xs">Dual gun and dual knife share their skill values. Chance 0.3 means 30%. Effect amount controls healing, buffs or damage per status tick.</p>
    </div>
    <div role="tabpanel" id="balance-panel-enemies" aria-labelledby="balance-tab-enemies" hidden={tab !== "enemies"}><EnemyBalanceEditor config={config} catalog={catalog} onChange={setConfig} /></div>
    <form className="menu-info space-y-3 p-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <label className="block text-xs font-semibold">Private change note (optional)<input className={field + " mt-1"} maxLength={300} value={note} onChange={event => setNote(event.target.value)} placeholder="An optional note for admin history" /></label>
      <button className={action} type="submit" disabled={!dirty || save.isPending}>{save.isPending ? "Publishing…" : "Publish changes & patch notes"}</button>
      <p className="text-xs">Publishing applies your changes and automatically posts the changed stats and skills with their before-and-after values to Patch Notes in My Room. Your private note stays in admin history. Previous revisions can be loaded and published again to roll back.</p>
    </form>
    {!!catalog.history.length && <details className="menu-info p-4"><summary className="cursor-pointer text-sm font-semibold">Recent balance history</summary><ul className="mt-3 space-y-3">{catalog.history.map(revision => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>#{revision.id} · {revision.note} · {new Date(revision.createdAt).toLocaleString()}</span><button className={action} disabled={restore.isPending} onClick={() => restore.mutate(revision.id)}>Load as draft</button></li>)}</ul></details>}
    </div>
    <div hidden={screen === "balance"}><AdminArenaLab config={config} catalog={catalog} screen={screen} onEnterArena={() => router.push("/dashboard/admin/balance?view=arena", { scroll: false })} onSelectTeams={() => router.push("/dashboard/admin/balance?view=lab", { scroll: false })} /></div>
  </section>;
}
