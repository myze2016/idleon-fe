"use client";
import { useState } from "react";
import type { Catalog, Config } from "./balance-controls";

const field = "menu-field mt-1 min-h-10 w-full px-3 py-2 text-sm";
const labels: Record<string, string> = { hp: "HP", mp: "MP", atk: "Attack", def: "Defense", magic: "Magic", magicDef: "Magic defense", speed: "Speed", blockChance: "Block chance (0–1)", mana: "MP cost", damage: "Damage", cooldown: "Cooldown (seconds)", duration: "Duration (seconds)", skill: "Native skill", burnAll: "Burn all", slashAll: "Slash all", bubbleBeam: "Bubble beam" };
function fields(value: Record<string, unknown>, path: string[] = []): { path: string[]; value: number }[] {
  return Object.entries(value).flatMap(([key, entry]) => typeof entry === "number" ? [{ path: [...path, key], value: entry }] : entry && typeof entry === "object" ? fields(entry as Record<string, unknown>, [...path, key]) : []);
}
export function EnemyBalanceEditor({ config, catalog, onChange }: { config: Config; catalog: Catalog; onChange: (config: Config) => void }) {
  const [id, setId] = useState(catalog.monsters[0].id);
  const stats = config.enemies[id];
  function update(path: string[], value: number) {
    const next = structuredClone(stats); let node: Record<string, unknown> = next;
    for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
    node[path.at(-1)!] = value;
    onChange({ ...config, enemies: { ...config.enemies, [id]: next } });
  }
  return <section className="menu-info space-y-4 p-4" aria-labelledby="enemy-balance-title"><h4 id="enemy-balance-title" className="font-semibold">Enemy balancing</h4>
    <label className="block text-xs font-semibold">Enemy<select className={field} value={id} onChange={event => setId(event.target.value)}>{catalog.monsters.map(enemy => <option key={enemy.id} value={enemy.id}>{enemy.name} ({enemy.id})</option>)}</select></label>
    <p className="text-xs">Edit base stats and native skill numbers. Publish below to apply changes and generate patch notes. Attack range: {stats.range}.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{fields(stats).map(({ path, value }) => {
      const key = path.at(-1)!;
      return <label key={path.join(".")} className="text-xs font-semibold">{path.map(key => labels[key] ?? key).join(" · ")}<input type="number" required value={Number.isFinite(value) ? value : ""} min={key === "hp" ? 1 : key === "cooldown" ? .1 : 0} max={key === "blockChance" ? 1 : key === "speed" ? 1000 : ["cooldown", "duration"].includes(key) ? 300 : 100000} step={["blockChance", "cooldown", "duration"].includes(key) ? .1 : 1} className={field} onChange={event => update(path, event.target.value === "" ? NaN : Number(event.target.value))} /></label>;
    })}</div>
    <button type="button" className="menu-action min-h-10 px-4 py-2 text-sm" onClick={() => onChange({ ...config, enemies: { ...config.enemies, [id]: structuredClone(catalog.defaults.enemies[id]) } })}>Reset this enemy to defaults</button>
  </section>;
}
