"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Infinity as InfinityIcon, Play, RotateCcw, Trophy, X } from "lucide-react";
import { api } from "@/lib/api";
import { requestKey } from "@/lib/request-key";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { endlessStatFactor } from "@/lib/endless";
import type { EndlessHome, EndlessRun, EndlessLeaderboard, EndlessResult } from "@/lib/endless";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { PvpBattleCanvas } from "./pvp-battle-canvas";
import { useGameState } from "./game-store";
import { EndlessBattleHud } from "./endless-battle-hud";

const button = "menu-action inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 py-2 text-sm disabled:cursor-default disabled:opacity-50";
export function EndlessPanel({ onClose }: { onClose: () => void }) {
  const userId = useSession().data?.user.id, roster = useCharacter(userId), client = useQueryClient();
  const key = ["endless", userId];
  const home = useQuery({ queryKey: key, enabled: !!userId, queryFn: ({ signal }) => api<EndlessHome>("/endless", { signal }), refetchInterval: 10000 });
  const [leaderboard, setLeaderboard] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const resetRef = useRef<HTMLButtonElement>(null), cancelResetRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (resetOpen) cancelResetRef.current?.focus({ preventScroll: true }); }, [resetOpen]);
  const adventureTeam = useGameState(state => state.teamSlots);
  const [now, setNow] = useState(() => Date.now());
  const [visual, setVisual] = useState<EndlessResult | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const run = home.data?.run, pending = run?.pending, active = run?.status === "active";
  const scores = useQuery({ queryKey: ["endless-leaderboard", userId], enabled: !!userId && leaderboard, queryFn: () => api<EndlessLeaderboard>("/endless/leaderboard"), refetchInterval: leaderboard ? 10000 : false });
  const currentTeam = adventureTeam.some(Boolean) ? adventureTeam : [roster.data?.characters.find(member => member.isStarter) ?? roster.data?.character ?? null];
  const ids = currentTeam.flatMap(member => member?.id && roster.data?.characters.some(owned => owned.id === member.id) ? [member.id] : []);
  const action = useMutation({ mutationFn: async (input: { kind: "start" | "wave" | "resolve" | "reset"; body?: object }) => {
    if (input.kind === "reset") {
      const retired = await api<EndlessRun>(`/endless/${run!.id}/retire`, { method: "POST", body: "{}" });
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<EndlessHome>(key, previous => previous ? { ...previous, run: retired } : previous);
      return api<EndlessRun>("/endless/start", { method: "POST", body: JSON.stringify(input.body) });
    }
    const path = input.kind === "start" ? "/endless/start" : `/endless/${run!.id}/${input.kind}`;
    return api<EndlessRun>(path, { method: "POST", body: JSON.stringify(input.body ?? {}) });
  }, onSuccess: async (next, input) => {
    if (input.kind === "reset") { setVisual(null); setResetOpen(false); requestAnimationFrame(() => resetRef.current?.focus({ preventScroll: true })); }
    else if (next.pending) setVisual(next.pending.result);
    else if (run?.pending) setVisual(run.pending.result);
    await client.cancelQueries({ queryKey: key });
    client.setQueryData<EndlessHome>(key, previous => previous ? { ...previous, run: next } : previous);
    if (next.status !== "active") await client.invalidateQueries({ queryKey: ["endless-leaderboard", userId] });
  }, onError: (_error, input) => { if (input.kind === "reset") void client.invalidateQueries({ queryKey: key }); } });
  const mutate = action.mutate;
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!active || action.isPending || action.error || home.isError || !run) return;
    const wait = run.pending && run.readyAt ? Math.max(0, Date.parse(run.readyAt) - Date.parse(run.serverNow) - (Date.now() - home.dataUpdatedAt)) + 80 : 0;
    const timer = setTimeout(() => mutate({ kind: run.pending ? "resolve" : "wave", body: run.pending ? { wave: run.wave } : {} }), wait);
    return () => clearTimeout(timer);
  }, [active, action.isPending, action.error, home.isError, home.dataUpdatedAt, run, mutate]);
  const remaining = run?.readyAt ? Math.max(0, Date.parse(run.readyAt) - Date.parse(run.serverNow) - (now - home.dataUpdatedAt)) : 0;
  const elapsed = pending ? Math.max(0, pending.result.duration - remaining / 1000) : visual?.duration ?? 0;
  const distance = (run?.distance ?? 0) + (pending ? Math.floor(elapsed * 10) : 0);
  const result = pending?.result ?? visual;
  const latest = result?.steps.findLast(step => step.at <= elapsed);
  const error = action.error?.message ?? home.error?.message;
  return <ResponsiveCanvasFrame fit minHeight={560} narrowMinHeight={600}><div role="dialog" aria-modal="true" aria-labelledby="endless-title" className="paper-menu absolute inset-0 z-40 overflow-hidden bg-[#3e452d] text-[#43311f]" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (resetOpen) { if (!action.isPending) { setResetOpen(false); resetRef.current?.focus(); } } else if (leaderboard) setLeaderboard(false); else onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")).filter(control => !control.closest("[inert]") && control.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <div inert={resetOpen} className="absolute inset-0">
    <div className="absolute inset-0"><PvpBattleCanvas adventure fullScreen fighters={result?.fighters ?? run?.team ?? []} steps={result?.steps ?? []} elapsed={elapsed} playing={!!pending && remaining > 0} distance={distance} hostId={userId ?? ""} backgroundSrc="/optimized/maps/meadow-painted-v1.0509ccc36dff.webp" /></div>
    <header className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
      <div className="menu-info px-4 py-2"><h2 id="endless-title" className="flex items-center gap-2 font-serif text-xl font-semibold"><InfinityIcon size={22} />Endless</h2><p className="text-xs">Season {active ? run?.season : home.data?.version ?? 1}</p></div>
      <div className="menu-info px-4 py-2 text-center"><p className="text-xs font-semibold uppercase">Distance travelled</p><p role="status" className="text-2xl font-bold tabular-nums">{distance.toLocaleString()} m</p><p className="text-xs">Enemy stats ×{endlessStatFactor(distance, run?.settings.statMultiplier ?? home.data?.config.statMultiplier ?? 1.1).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
      <div className="pointer-events-auto flex flex-wrap gap-2">{active && <button ref={resetRef} className={button} disabled={action.isPending || !ids.length || !home.data?.config.enabled} onClick={() => setResetOpen(true)}><RotateCcw size={18} />Reset progress</button>}<button className={button} onClick={() => setLeaderboard(true)} aria-label="Endless leaderboard"><Trophy size={20} /></button><button ref={closeRef} className={button} onClick={onClose}><ArrowLeft size={18} />My room</button></div>
    </header>
    {active && <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3">
      <section aria-label="Run team" className="menu-info ml-auto max-w-[min(380px,100%)] p-3"><div className="flex flex-wrap gap-x-5 gap-y-2">{run!.team.map(member => {
        const index = result?.fighters.findIndex(fighter => fighter.id === member.id && fighter.userId === userId) ?? -1;
        const hp = latest?.hp[index] ?? member.hp ?? member.stats.hp, mp = latest?.mp[index] ?? member.mp ?? member.stats.mp;
        return <div key={member.id} className="text-xs"><p className="font-semibold">{member.name}{hp <= 0 ? " · Defeated" : ""}</p><p>{Math.ceil(hp)} HP · {Math.floor(mp)} MP</p></div>;
      })}</div></section>

    </div>}
    {run && <EndlessBattleHud key={run.id} runId={run.id} checkpoint={run.wave} result={pending?.result ?? null} elapsed={elapsed} distance={distance} userId={userId ?? ""} playing={!!pending} />}
    {error && <div role="alert" className="menu-info absolute inset-x-4 top-32 z-20 flex flex-wrap items-center gap-3 p-3 text-sm text-[#963f2d]">{error}<button className={button} onClick={() => { action.reset(); void home.refetch(); }}>Retry</button></div>}
    {!active && !leaderboard && <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-[#20180c66] p-4"><section className="menu-info my-auto w-full max-w-lg space-y-4 p-5">
      {home.isPending ? <p role="status">Loading Endless…</p> : <>
        <h3 className="font-serif text-2xl font-semibold">{run ? "Run complete" : "The endless road"}</h3>
        {run && <p role="status" className="font-semibold">Distance reached: {run.distance.toLocaleString()} m</p>}
        <p className="text-sm">Enemies keep arriving every 2–3 seconds. Their stats jump every 500 meters. Survive as far as you can with your current adventure team.</p>
        <p className="text-xs">HP, MP, and combat effects carry over. Defeated characters stay down. No gold or EXP rewards.</p>
        <h4 className="font-semibold">Adventure team ({ids.length}/6)</h4><p className="text-sm">{ids.map(id => roster.data?.characters.find(member => member.id === id)?.name).join(", ") || "Set your adventure team in Team first."}</p>
        <button className={button} disabled={action.isPending || !ids.length || !home.data?.config.enabled} onClick={() => { setVisual(null); action.mutate({ kind: "start", body: { teamIds: ids, requestKey: requestKey() } }); }}><Play size={17} />{action.isPending ? "Starting…" : "Start Endless run"}</button>
        {!home.data?.config.enabled && <p className="text-sm">New runs are currently closed by the admin.</p>}
      </>}
    </section></div>}
    {leaderboard && <section aria-label="Endless leaderboard" className="absolute inset-3 z-30 overflow-auto rounded-lg bg-[#efdfb8] p-4 shadow-xl sm:inset-8">
      <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-xl font-semibold">Farthest travelled · Season {scores.data?.season ?? home.data?.version}</h3><button className={button} onClick={() => setLeaderboard(false)} aria-label="Close leaderboard"><X size={20} /></button></div>
      <p className="my-4 text-sm">Your best: {scores.data?.mine ? `${scores.data.mine.bestWave.toLocaleString()} m · Rank #${scores.data.mine.rank}` : "Travel to enter the rankings."}</p>
      {scores.isPending ? <p role="status">Loading leaderboard…</p> : scores.error ? <p role="alert">{scores.error.message}</p> : <table className="w-full text-left text-sm"><thead><tr className="border-b border-[#a38358]"><th className="p-2">Rank</th><th className="p-2">Player</th><th className="p-2 text-right">Distance</th></tr></thead><tbody>{scores.data?.entries.map(entry => <tr key={entry.rank} className={`border-b border-[#a3835833] ${entry.isMe ? "bg-[#f4dda9] font-semibold" : ""}`}><td className="p-2">#{entry.rank}</td><td className="max-w-40 truncate p-2">{entry.username}{entry.isMe ? " (You)" : ""}</td><td className="p-2 text-right tabular-nums">{entry.bestWave.toLocaleString()} m</td></tr>)}</tbody></table>}
    </section>}
    </div>
    {resetOpen && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#20150dbb] p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="endless-reset-title" aria-describedby="endless-reset-description" className="menu-info w-full max-w-sm space-y-4 p-5">
      <h3 id="endless-reset-title" className="font-serif text-xl font-semibold">Reset Endless progress?</h3>
      <p id="endless-reset-description" className="text-sm">Your current run will end. A new run starts at 0 m with your adventure team at full HP and MP. Your best leaderboard score stays saved.</p>
      {action.error && <p role="alert" className="text-sm text-[#a13725]">{action.error.message}</p>}
      <div className="flex flex-wrap gap-2"><button ref={cancelResetRef} className={button} disabled={action.isPending} onClick={() => { setResetOpen(false); resetRef.current?.focus(); }}>Cancel</button><button className={`${button} text-[#963f2d]`} disabled={action.isPending || !ids.length || !home.data?.config.enabled} onClick={() => action.mutate({ kind: "reset", body: { teamIds: ids, requestKey: requestKey() } })}><RotateCcw size={16} />{action.isPending ? "Resetting…" : "Reset & restart"}</button></div>
    </section></div>}
  </div></ResponsiveCanvasFrame>;
}
