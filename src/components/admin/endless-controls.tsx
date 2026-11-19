"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EndlessConfig } from "@/lib/endless";

interface Catalog { version: number; config: EndlessConfig; enemies: { id: string; name: string; locations: string[]; stats: { hp: number; atk: number } }[] }
const button = "menu-action min-h-11 cursor-pointer px-4 py-2 text-sm disabled:opacity-50";
export function EndlessControls() {
  const query = useQuery({ queryKey: ["admin", "endless"], queryFn: () => api<Catalog>("/admin/endless"), refetchOnWindowFocus: false });
  const [notice, setNotice] = useState("");
  if (query.isPending) return <p className="mt-6" role="status">Loading Endless controls…</p>;
  if (query.error) return <div className="mt-6"><p role="alert">{query.error.message}</p><button className={button} onClick={() => void query.refetch()}>Retry</button></div>;
  return <><p className="mt-4 text-sm" role="status">{notice}</p><Editor key={query.data.version} catalog={query.data} onPublished={() => setNotice("Endless settings published. A new leaderboard season has started.")} /></>;
}
function Editor({ catalog, onPublished }: { catalog: Catalog; onPublished: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(() => structuredClone(catalog.config));
  const [search, setSearch] = useState(""), [location, setLocation] = useState("all");
  const locations = [...new Set(catalog.enemies.flatMap(enemy => enemy.locations))];
  const names: Record<string, string> = { meadow: "Meadow", forest: "Forest", garnaland: "Garnaland", harbor: "Harbor", tourney: "Zugwang's Tourney", deepsea: "DeepSea Floor 1", "deepsea-2f": "DeepSea Floor 2", "deepsea-palace": "DeepSea Palace" };
  const filtered = catalog.enemies.filter(enemy => (location === "all" || enemy.locations.includes(location)) && `${enemy.id} ${enemy.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const normalized = (config: EndlessConfig) => JSON.stringify({ ...config, enemyPool: [...config.enemyPool].sort() });
  const dirty = normalized(draft) !== normalized(catalog.config);
  const publish = useMutation({ mutationFn: () => api("/admin/endless", { method: "PUT", body: JSON.stringify({ version: catalog.version, config: draft }) }),
    onSuccess: async () => { onPublished(); await Promise.all([client.invalidateQueries({ queryKey: ["admin", "endless"] }), client.invalidateQueries({ queryKey: ["endless"] }), client.invalidateQueries({ queryKey: ["endless-leaderboard"] })]); } });
  const field = "menu-field mt-1 min-h-11 w-full px-3 py-2 text-sm";
  const factor = (distance: number) => Number.isFinite(draft.statMultiplier) ? Math.min(1_000_000, draft.statMultiplier ** (distance / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
  return <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); publish.mutate(); }}>
    <p className="text-sm">Current season {catalog.version}. {dirty ? "You have unpublished changes." : "Showing published settings."}</p>
    <fieldset disabled={publish.isPending} className="space-y-5">
      <section className="menu-info space-y-4 p-4"><h2 className="text-lg font-semibold">Difficulty</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input className="size-5" type="checkbox" checked={draft.enabled} onChange={event => setDraft(previous => ({ ...previous, enabled: event.target.checked }))} />Allow new Endless runs</label>
        <label className="block text-sm font-semibold">Stat multiplier per 100 meters<input className={field} type="number" required min={1.01} max={3} step={.01} value={Number.isFinite(draft.statMultiplier) ? draft.statMultiplier : ""} onChange={event => setDraft(previous => ({ ...previous, statMultiplier: event.target.value === "" ? NaN : Number(event.target.value) }))} /></label>
        <p className="text-sm">Enemy stats grow with distance: base stats times multiplier raised to (distance / 100), rounded up. Travel speed is 10 meters per second. HP, MP, Attack, Defense, Magic, Magic Defense, Speed, and native skill damage scale.</p>
        <div className="flex flex-wrap gap-3 text-sm">{[0, 100, 500, 1000].map(distance => <span key={distance} className="menu-info px-3 py-2">{distance} m: x{factor(distance)}</span>)}</div>
        <p className="text-xs">Stats and skill damage cap at 1,000,000; Speed caps at 1,000. Ability timing and chances stay unchanged. Enemies continuously spawn at random intervals of 2–3 seconds. Up to 40 enemies can remain on the field. Runs end when the whole team is defeated.</p>
      </section>
      <section className="menu-info space-y-4 p-4"><h2 className="text-lg font-semibold">Enemy pool ({draft.enemyPool.length} selected)</h2><p className="text-sm">Each spawn chooses randomly from this pool with equal chance. Bosses and their native skills are supported.</p>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Location<select className={field} value={location} onChange={event => setLocation(event.target.value)}><option value="all">All locations</option>{locations.map(id => <option key={id} value={id}>{names[id] ?? id}</option>)}</select></label><label className="text-sm">Search enemies<input className={field} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Enemy name…" /></label></div>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setDraft(previous => ({ ...previous, enemyPool: [...new Set([...previous.enemyPool, ...filtered.map(enemy => enemy.id)])] }))}>Select visible</button><button type="button" className={button} onClick={() => setDraft(previous => ({ ...previous, enemyPool: previous.enemyPool.filter(id => !filtered.some(enemy => enemy.id === id)) }))}>Clear visible</button></div>
        <div className="grid max-h-96 gap-2 overflow-auto p-1 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(enemy => <label key={enemy.id} className="menu-info flex min-h-16 cursor-pointer items-center gap-3 p-3 text-sm"><input type="checkbox" className="size-5 shrink-0" checked={draft.enemyPool.includes(enemy.id)} onChange={event => setDraft(previous => ({ ...previous, enemyPool: event.target.checked ? [...previous.enemyPool, enemy.id] : previous.enemyPool.filter(id => id !== enemy.id) }))} /><span className="min-w-0"><span className="block font-semibold">{enemy.name}</span><span className="text-xs">{enemy.stats.hp} HP · {enemy.stats.atk} ATK</span></span></label>)}</div>
        {!filtered.length && <p className="text-sm">No matching enemies.</p>}{!draft.enemyPool.length && <p role="alert" className="text-sm text-red-800">Select at least one enemy before publishing.</p>}
      </section>
      <p className="menu-info p-4 text-sm">Publishing starts a new leaderboard season. Existing runs keep their original enemies, multiplier, team, and balance snapshot, and remain ranked in their original season. Endless awards leaderboard scores only; it does not grant gold, EXP, or items.</p>
      <div className="flex flex-wrap gap-3"><button className={button} type="submit" disabled={!dirty || !draft.enemyPool.length || publish.isPending}>{publish.isPending ? "Publishing…" : "Publish & start new season"}</button><button className={button} type="button" onClick={() => { setDraft(structuredClone(catalog.config)); void client.invalidateQueries({ queryKey: ["admin", "endless"] }); }}>Reload published settings</button></div>
    </fieldset>
    {publish.error && <p role="alert" className="text-sm text-red-800">{publish.error.message}</p>}
  </form>;
}
