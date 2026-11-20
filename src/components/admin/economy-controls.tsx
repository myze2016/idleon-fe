"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { artifactCatalog } from "@/lib/artifact";
import { weaponDetails, type WeaponType } from "@/lib/character";
import type { EconomySettings, UpgradeStep } from "@/lib/economy";
import { editCharacterCosts, type CharacterCostEdit } from "@/lib/character-costs";

type Catalog = { version: number; settings: EconomySettings; defaults: EconomySettings; upgrades: Record<string, { stat: string; label: string; amount: number }> };
const action = "menu-action inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm disabled:opacity-50";
const input = "menu-field min-h-11 w-full min-w-0 px-3 py-2 text-sm";
const pageSize = 10;
function NumberField({ label, value, onChange, min = 0, max = 1_000_000_000, validate = true }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; validate?: boolean }) {
  return <label className="block min-w-0 text-xs font-semibold">{label}<input className={input + " mt-1"} type="number" required={validate} min={validate ? min : undefined} max={validate ? max : undefined} step={validate ? 1 : "any"} value={Number.isFinite(value) ? value : ""} onChange={event => onChange(event.target.value === "" ? NaN : Number(event.target.value))} /></label>;
}
function Pager({ count, page, onChange }: { count: number; page: number; onChange: (page: number) => void }) {
  const pages = Math.ceil(count / pageSize);
  return <div className="flex flex-wrap items-center gap-3"><button type="button" className={action} disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button><span className="text-sm">Page {page + 1} of {pages} · {count} rows</span><button type="button" className={action} disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>Next</button></div>;
}
function BulkCharacterCosts({ tables, onChange }: { tables: Record<string, UpgradeStep[]>; onChange: (tables: Record<string, UpgradeStep[]>) => void }) {
  const [group, setGroup] = useState<CharacterCostEdit["group"]>("all");
  const [multiplier, setMultiplier] = useState(1), [range, setRange] = useState(false);
  const [from, setFrom] = useState(1), [to, setTo] = useState(20);
  const [notice, setNotice] = useState("");
  let preview: ReturnType<typeof editCharacterCosts> | undefined, error = "";
  try { preview = editCharacterCosts(tables, { group, multiplier, ...(range ? { from, to } : {}) }); } catch (cause) { error = (cause as Error).message; }
  return <section className="menu-info space-y-3 p-4"><h2 className="text-lg font-semibold">Bulk character upgrade costs</h2>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Characters to update<select className={input + " mt-1"} value={group} onChange={event => { setGroup(event.target.value as CharacterCostEdit["group"]); setNotice(""); }}><option value="all">All characters</option><option value="standard">Standard characters</option><option value="special">Special characters</option></select></label><NumberField validate={false} label="Gold cost multiplier" value={multiplier} onChange={setMultiplier} /></div>
    <p className="text-xs">Multiplies each selected draft cost and rounds to the nearest gold. Use 1.5 for a 50% increase or 0.5 for half price.</p>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={range} onChange={event => setRange(event.target.checked)} />Apply to a specific plus range</label>
    {range && <div className="grid grid-cols-2 gap-3"><NumberField validate={false} label="From plus" value={from} onChange={setFrom} min={1} max={1000} /><NumberField validate={false} label="Through plus" value={to} onChange={setTo} min={1} max={1000} /></div>}
    <p className="text-xs">{preview ? `${preview.characters} character types, ${preview.steps} upgrade rows selected.` : error} {range ? "Missing rows are added using that character’s last configured stat gain." : "Applies to every configured row; the last row still repeats for later upgrades."}</p>
    <button type="button" className={action} disabled={!preview || !preview.steps} onClick={() => { if (preview) { onChange(preview.tables); setNotice(`Updated costs for ${preview.characters} character types in your draft. Publish below to apply.`); } }}>Apply costs to draft</button>
    <p className="text-xs">Stat gains stay unchanged. Wand upgrades remain unavailable.</p>{notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
function ExpTable({ rows, onChange }: { rows: number[]; onChange: (rows: number[]) => void }) {
  const [page, setPage] = useState(0), current = Math.min(page, Math.ceil(rows.length / pageSize) - 1);
  return <section className="menu-info space-y-4 p-4"><h2 className="text-lg font-semibold">EXP required at each level</h2><p className="text-sm">Enter the EXP needed for that single level, not total lifetime EXP. Beyond the final row, its requirement repeats. Add rows to set different later levels.</p>
    <Pager count={rows.length} page={current} onChange={setPage} />
    <div className="grid gap-3 sm:grid-cols-2">{rows.slice(current * pageSize, (current + 1) * pageSize).map((value, offset) => {
      const index = current * pageSize + offset;
      return <NumberField key={index} label={`Level ${index + 1} to ${index + 2}: EXP required`} value={value} min={1} max={2147483647} onChange={next => onChange(rows.map((old, i) => i === index ? next : old))} />;
    })}</div>
    <div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={rows.length >= 1000} onClick={() => { onChange([...rows, rows.at(-1)!]); setPage(Math.floor(rows.length / pageSize)); }}>Add level {rows.length + 1} to {rows.length + 2}</button><button type="button" className={action} disabled={rows.length <= 1} onClick={() => onChange(rows.slice(0, -1))}>Remove final level row</button></div>
    <p className="text-sm">Publishing recalculates account levels from existing total EXP. Total EXP and previously earned wishes stay unchanged.</p>
  </section>;
}
function UpgradeTable({ title, stat, rows, onChange }: { title: string; stat: string; rows: UpgradeStep[]; onChange: (rows: UpgradeStep[]) => void }) {
  const [page, setPage] = useState(0), current = Math.min(page, Math.ceil(rows.length / pageSize) - 1);
  const [fillCost, setFillCost] = useState(rows[0].cost), [fillGain, setFillGain] = useState(rows[0].gain);
  function change(index: number, key: keyof UpgradeStep, value: number) { onChange(rows.map((old, i) => i === index ? { ...old, [key]: value } : old)); }
  return <section className="menu-info space-y-4 p-4"><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm">Each row sets the gold cost and extra {stat} for that upgrade. Stat gains add together across completed upgrades. Beyond the final row, its cost and gain repeat.</p>
    <Pager count={rows.length} page={current} onChange={setPage} />
    <div className="space-y-3">{rows.slice(current * pageSize, (current + 1) * pageSize).map((row, offset) => {
      const index = current * pageSize + offset;
      return <fieldset key={index} className="rounded border border-[#a3835866] p-3"><legend className="px-2 text-sm font-semibold">+{index} to +{index + 1}</legend><div className="grid grid-cols-2 gap-3"><NumberField label={`Gold cost for +${index + 1}`} value={row.cost} onChange={value => change(index, "cost", value)} /><NumberField label={`${stat} added at +${index + 1}`} value={row.gain} max={10000} onChange={value => change(index, "gain", value)} /></div></fieldset>;
    })}</div>
    <div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={rows.length >= 1000} onClick={() => { onChange([...rows, { ...rows.at(-1)! }]); setPage(Math.floor(rows.length / pageSize)); }}>Add +{rows.length + 1}</button><button type="button" className={action} disabled={rows.length <= 1} onClick={() => onChange(rows.slice(0, -1))}>Remove final upgrade row</button></div>
    <details className="rounded border border-[#a3835866] p-3"><summary className="cursor-pointer text-sm font-semibold">Fill this page with the same values</summary><div className="mt-3 grid grid-cols-2 gap-3"><NumberField validate={false} label="Gold cost to apply" value={fillCost} onChange={setFillCost} /><NumberField validate={false} label={`${stat} gain to apply`} value={fillGain} max={10000} onChange={setFillGain} /></div><button type="button" className={action + " mt-3"} disabled={!Number.isSafeInteger(fillCost) || fillCost < 0 || fillCost > 1_000_000_000 || !Number.isSafeInteger(fillGain) || fillGain < 0 || fillGain > 10000} onClick={() => onChange(rows.map((row, index) => index >= current * pageSize && index < (current + 1) * pageSize ? { cost: fillCost, gain: fillGain } : row))}>Apply to visible rows</button></details>
  </section>;
}
export function EconomyControls() {
  const query = useQuery({ queryKey: ["admin", "economy"], queryFn: () => api<Catalog>("/admin/economy"), refetchOnWindowFocus: false });
  const [message, setMessage] = useState("");
  if (query.isPending) return <p className="mt-6" role="status">Loading progression settings…</p>;
  if (query.error) return <div className="mt-6"><p role="alert">{query.error.message}</p><button className={action} onClick={() => void query.refetch()}>Retry</button></div>;
  return <><p role="status" className="mt-4 text-sm">{message}</p><EconomyEditor key={query.data.version} catalog={query.data} onPublished={() => setMessage("Progression settings published and patch notes posted.")} /></>;
}
function EconomyEditor({ catalog, onPublished }: { catalog: Catalog; onPublished: () => void }) {
  const client = useQueryClient(), [draft, setDraft] = useState(() => structuredClone(catalog.settings));
  const [tab, setTab] = useState("exp"), [weapon, setWeapon] = useState(Object.keys(catalog.settings.characterUpgrades)[0]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(catalog.settings);
  const publish = useMutation({ mutationFn: () => api<Catalog>("/admin/economy", { method: "PUT", body: JSON.stringify({ version: catalog.version, settings: draft }) }),
    onSuccess: async data => {
      onPublished(); client.setQueryData(["admin", "economy"], data);
      await Promise.all([["admin", "balance"], ["character"], ["character-wiki"], ["patch-notes"], ["admin-resource-accounts"], ["admin-donation-tiers"]].map(queryKey => client.invalidateQueries({ queryKey })));
    } });
  const tabs = { exp: "EXP per level", artifacts: "Artifact upgrades", characters: "Character upgrades", skill: "Skill 2", shop: "Shop prices" };
  const specialNames: Record<string, string> = { glaive: "Kent", "ice-staff": "Juan", "dual-axe": "Jeffrey" };
  return <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); publish.mutate(); }}>
    <p className="text-sm">Live version {catalog.version}. {dirty ? "You have unpublished changes." : "Showing published settings."}</p>
    <fieldset disabled={publish.isPending} className="space-y-5">
      <div role="group" aria-label="Progression settings" className="flex flex-wrap gap-2">{Object.entries(tabs).map(([id, label]) => <button key={id} type="button" className={action} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === "exp" && <ExpTable rows={draft.levelExp} onChange={levelExp => setDraft(previous => ({ ...previous, levelExp }))} />}
      {tab === "artifacts" && <UpgradeTable title="Artifact enhancement per plus" stat="main stat" rows={draft.artifactEnhancements} onChange={artifactEnhancements => setDraft(previous => ({ ...previous, artifactEnhancements }))} />}
      {tab === "characters" && <><BulkCharacterCosts tables={draft.characterUpgrades} onChange={characterUpgrades => setDraft(previous => ({ ...previous, characterUpgrades }))} /><label className="block text-sm font-semibold">Character type<select className={input + " mt-1"} value={weapon} onChange={event => setWeapon(event.target.value)}>{Object.keys(draft.characterUpgrades).map(id => <option key={id} value={id}>{specialNames[id] ? `${specialNames[id]} · ` : ""}{weaponDetails(id as WeaponType).label}</option>)}</select></label><UpgradeTable key={weapon} title={`${weaponDetails(weapon as WeaponType).label} upgrades`} stat={catalog.upgrades[weapon].label} rows={draft.characterUpgrades[weapon]} onChange={rows => setDraft(previous => ({ ...previous, characterUpgrades: { ...previous.characterUpgrades, [weapon]: rows } }))} /><p className="text-xs">Each character type has its own cost and gain table. Wand upgrades remain unavailable.</p></>}
      {tab === "skill" && <section className="menu-info space-y-3 p-4"><h2 className="text-lg font-semibold">Skill 2 unlock</h2><NumberField label="Gold to unlock Skill 2 per character" value={draft.skillUnlockCost} max={1_000_000} onChange={skillUnlockCost => setDraft(previous => ({ ...previous, skillUnlockCost }))} /><p className="text-sm">Charged once per character. Already unlocked skills remain unlocked.</p></section>}
      {tab === "shop" && <section className="menu-info space-y-4 p-4"><h2 className="text-lg font-semibold">Artifact shop prices</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{artifactCatalog.map(item => <NumberField key={item.stat} label={item.name} value={draft.shopPrices[item.stat]} max={1_000_000} onChange={price => setDraft(previous => ({ ...previous, shopPrices: { ...previous.shopPrices, [item.stat]: price } }))} />)}</div></section>}
      <p className="menu-info p-4 text-sm">Publishing stat gains recalculates bonuses for existing artifact plus levels and character upgrades. Past gold payments are not changed. Saved Endless runs keep their original stat snapshot.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className={action} disabled={!dirty || publish.isPending}>{publish.isPending ? "Publishing…" : "Publish settings & patch notes"}</button><button type="button" className={action} onClick={() => setDraft(structuredClone(catalog.defaults))}>Load defaults as draft</button><button type="button" className={action} onClick={() => { setDraft(structuredClone(catalog.settings)); void client.invalidateQueries({ queryKey: ["admin", "economy"] }); }}>Reload published settings</button></div>
    </fieldset>
    {publish.error && <p role="alert" className="text-sm text-red-800">{publish.error.message}</p>}
  </form>;
}
