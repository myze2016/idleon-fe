"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PvpBattleCanvas } from "@/components/game/pvp-battle-canvas";
import type { ArenaFighter, DuelStep } from "@/components/game/pvp-types";
import type { Catalog, Config } from "./balance-controls";

type Member = { kind: "character" | "enemy"; id: string; slot: number; upgradeLevel: number; skill2Unlocked: boolean };
type Result = { fighters: ArenaFighter[]; steps: DuelStep[]; duration: number; winnerId: string | null; seed: number };
const action = "menu-action min-h-10 px-4 py-2 text-sm disabled:opacity-50";
const field = "menu-field min-h-10 w-full px-3 py-2 text-sm";
export function AdminArenaLab({ config, catalog, screen, onEnterArena, onSelectTeams }: { config: Config; catalog: Catalog; screen: "balance" | "lab" | "arena"; onEnterArena: () => void; onSelectTeams: () => void }) {
  const [teams, setTeams] = useState<Member[][]>([[{ kind: "character", id: "glaive", slot: 0, upgradeLevel: 0, skill2Unlocked: true }], [{ kind: "enemy", id: "slime", slot: 0, upgradeLevel: 0, skill2Unlocked: false }]]);
  const [seed, setSeed] = useState(42), [result, setResult] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(-2), [playing, setPlaying] = useState(false);
  const playhead = useRef(-2);
  useEffect(() => {
    if (screen !== "arena" || !result) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.querySelector<HTMLButtonElement>(".admin-combat-screen button")?.focus({ preventScroll: true });
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); setPlaying(false); onSelectTeams(); } }
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [screen, result, onSelectTeams]);
  const test = useMutation({ mutationFn: () => api<Result>("/admin/balance/arena-test", { method: "POST", body: JSON.stringify({ config, team1: teams[0], team2: teams[1], seed }) }), onSuccess: data => {
    setResult(data); playhead.current = -2; setElapsed(-2); setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); onEnterArena();
  } });
  useEffect(() => {
    if (!playing || !result || screen !== "arena") return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(); playhead.current = Math.min(result.duration, playhead.current + Math.min(.25, (now - last) / 1000)); last = now;
      setElapsed(playhead.current);
      if (playhead.current >= result.duration) setPlaying(false);
    }, 50);
    return () => clearInterval(timer);
  }, [playing, result, screen]);
  function update(side: number, slot: number, member: Member | null) { setTeams(previous => previous.map((team, index) => index === side ? [...team.filter(m => m.slot !== slot), ...(member ? [member] : [])] : team)); }
  const finished = !!result && elapsed >= result.duration;
  const events = result?.steps.filter(step => step.at <= elapsed && !["move", "mana"].includes(step.kind)).slice(-15) ?? [];
  if (screen === "arena" && result) return <section aria-label="Combat arena" className="admin-combat-screen fixed inset-0 z-50 flex h-dvh flex-col overflow-auto bg-[#d7bc8c] text-[#43311f]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#805b35] bg-[#efdfb8] px-4 py-3"><h2 className="text-lg font-bold">Battle Lab - Combat Arena</h2><button type="button" className={action} onClick={() => { setPlaying(false); onSelectTeams(); }}>Back to character & enemy selection</button></header>
    <div className="min-h-[240px] flex-1"><PvpBattleCanvas fullScreen backgroundSrc="/optimized/maps/battle-lab-arena-v1.4614031f6de5.webp" fighters={result.fighters} steps={result.steps} elapsed={elapsed} playing={playing} hostId="team-1" /></div>
    <footer className="space-y-3 border-t border-[#805b35] bg-[#efdfb8] p-4">
      <div className="flex flex-wrap items-center gap-3"><button className={action} disabled={finished} onClick={() => setPlaying(value => !value)}>{playing ? "Pause" : "Play"}</button><button className={action} onClick={() => { playhead.current = -2; setElapsed(-2); setPlaying(true); }}>Replay</button><label className="flex min-w-44 flex-1 items-center gap-2 text-xs">Timeline<input className="min-w-16 flex-1" type="range" min={-2} max={result.duration} step={.1} value={elapsed} onChange={event => { setPlaying(false); playhead.current = Number(event.target.value); setElapsed(playhead.current); }} />{Math.max(0, elapsed).toFixed(1)} / {result.duration.toFixed(1)}s</label></div>
      <p role="status" className="text-sm font-semibold">{finished ? result.winnerId === null ? "Draw" : `${result.winnerId === "team-1" ? "Team 1" : "Team 2"} wins!` : elapsed < 0 ? "Get ready!" : "Battle in progress"}</p>
      <p className="text-xs">Replay snapshot from the last test · seed {result.seed}. Editing the draft or teams requires starting a new battle.</p>

      <details><summary className="cursor-pointer text-xs font-semibold">Recent battle events</summary><ul className="mt-2 space-y-1 text-xs">{events.map((event, index) => <li key={index}>{event.at.toFixed(1)}s · {result.fighters[event.actor]?.name} · {event.label}{event.healing ? ` +${event.healing} HP` : event.damage ? ` ${event.damage} damage` : ""}</li>)}</ul></details>
    </footer>
  </section>;
  return <section className="menu-info space-y-4 p-4" aria-labelledby="arena-lab-title"><h4 id="arena-lab-title" className="font-semibold">Battle lab · Team 1 vs Team 2</h4>
    <p className="text-xs">Mix any characters and enemies on either side, up to six per team. Uses the current unpublished draft and PvP movement, range and combat rules. Enemy native abilities remain active. No rewards or account changes.</p>
    <div className="grid gap-4 xl:grid-cols-2">{teams.map((team, side) => <fieldset key={side} className="min-w-0 space-y-3 rounded border border-slate-200/50 p-3"><legend className="px-2 font-semibold">Team {side + 1}</legend>{Array.from({ length: 6 }, (_, slot) => {
      const member = team.find(m => m.slot === slot);
      return <div key={slot} className="space-y-2 border-b border-slate-200/25 pb-3"><label className="block text-xs font-semibold">Slot {slot + 1}<select disabled={test.isPending} className={field + " mt-1 capitalize"} value={member ? `${member.kind}:${member.id}` : ""} onChange={event => {
        const [kind, id] = event.target.value.split(":"); update(side, slot, id ? { kind: kind as Member["kind"], id, slot, upgradeLevel: 0, skill2Unlocked: kind === "character" } : null);
      }}><option value="">Empty</option><optgroup label="Characters">{catalog.weapons.map(character => <option key={character.weapon} value={`character:${character.weapon}`}>{character.weapon.replaceAll("-", " ")}</option>)}</optgroup><optgroup label="Enemies">{catalog.monsters.map(enemy => <option key={enemy.id} value={`enemy:${enemy.id}`}>{enemy.name} ({enemy.id})</option>)}</optgroup></select></label>
      {member?.kind === "character" && <div className="flex flex-wrap items-center gap-3 text-xs"><label>Upgrade level<input type="number" min={0} max={100} step={1} className={field + " mt-1 max-w-24"} value={Number.isFinite(member.upgradeLevel) ? member.upgradeLevel : ""} onChange={event => update(side, slot, { ...member, upgradeLevel: event.target.value === "" ? NaN : Number(event.target.value) })} /></label><label className="flex items-center gap-2"><input type="checkbox" checked={member.skill2Unlocked} onChange={event => update(side, slot, { ...member, skill2Unlocked: event.target.checked })} />Skill 2</label></div>}
      {member?.kind === "enemy" && <p className="text-xs">{config.enemies[member.id].hp} HP · {config.enemies[member.id].mp} MP · Native skills enabled</p>}
      </div>;
    })}</fieldset>)}</div>
    <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold">Random seed<input type="number" min={0} max={4294967295} step={1} className={field + " mt-1 max-w-40"} value={Number.isFinite(seed) ? seed : ""} onChange={event => setSeed(event.target.value === "" ? NaN : Number(event.target.value))} /></label><button className={action} disabled={teams.some(team => !team.length) || test.isPending} onClick={() => { setPlaying(false); setResult(null); test.mutate(); }}>{test.isPending ? "Preparing battle…" : "Start battle"}</button></div>
    <p className="text-xs">Both teams start at opposite ends. Melee fighters advance; ranged fighters attack within reach. Use the same seed for comparisons. Summons fill living team spaces, with a maximum of 24 total fighters per side. Battles end after 180 seconds if neither team wins.</p>
    {test.error && <p role="alert" className="text-sm text-red-700">{test.error.message}</p>}

  </section>;
}
