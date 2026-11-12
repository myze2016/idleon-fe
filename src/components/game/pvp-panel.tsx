"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { weaponDetails } from "@/lib/character";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { PvpBattleCanvas } from "./pvp-battle-canvas";
import type { RoomState } from "./pvp-types";

export function PvpPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState(""), [joinCode, setJoinCode] = useState(""), [now, setNow] = useState(() => Date.now());
  const session = useSession(), userId = session.data?.user.id, roster = useCharacter(userId), client = useQueryClient();
  const lobby = useQuery({ queryKey: ["pvp-lobby", userId], enabled: !!userId && !code, refetchInterval: 1500,
    queryFn: async () => {
      const data = await api<{ rooms: { code: string; hostName: string; hostUsername: string; isMine: boolean }[]; activeCode: string | null }>("/pvp");
      if (data.activeCode) setCode(data.activeCode);
      return data;
    } });
  const room = useQuery({ queryKey: ["pvp-room", userId, code], enabled: !!userId && !!code, queryFn: () => api<RoomState>(`/pvp/${code}`), retry: false,
    refetchInterval: (query) => query.state.error || ["complete", "canceled", "closed", "expired"].includes(query.state.data?.phase ?? "") ? false : 500 });
  const action = useMutation({ mutationFn: (input: { path: string; body?: object }) => api<{ code: string }>(input.path, { method: "POST", ...(input.body ? { body: JSON.stringify(input.body) } : {}) }),
    onSuccess: async (data) => { setCode(data.code); await client.invalidateQueries({ queryKey: ["pvp-room", userId, data.code] }); await client.invalidateQueries({ queryKey: ["pvp-lobby", userId] }); } });
  const leave = useMutation({ mutationFn: () => code ? api(`/pvp/${code}/leave`, { method: "POST" }) : Promise.resolve(),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["pvp-lobby", userId] }); onClose(); } });
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  const data = room.data, me = data?.players.find((player) => player?.id === userId);
  const selected = me?.characterIds ?? [];
  const serverTime = data ? Date.parse(data.serverNow) + Math.max(0, now - room.dataUpdatedAt) : now;
  const elapsed = data?.startsAt ? (serverTime - Date.parse(data.startsAt)) / 1000 : -5;
  const steps = data?.result?.steps.filter((step) => step.at <= elapsed) ?? [];
  const recent = steps.filter((step) => !["mana", "move"].includes(step.kind)).slice(-8).reverse();
  const fighters = data?.result?.fighters ?? data?.players.flatMap((player) => player?.fighters ?? []) ?? [];
  const busy = action.isPending || leave.isPending;
  const button = "cursor-pointer rounded-lg border border-[#b8a76d] bg-[#e4d895] px-4 py-2 text-sm font-semibold text-[#17392e] outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8] disabled:cursor-not-allowed disabled:opacity-50";
  const error = action.error?.message ?? leave.error?.message ?? room.error?.message ?? lobby.error?.message;
  function close() { if (!busy) { if (code && data && ["waiting", "countdown", "battle", "complete"].includes(data.phase)) leave.mutate(); else onClose(); } }
  function select(characterIds: string[]) { action.mutate({ path: `/pvp/${code}/select`, body: { characterIds } }); }

  return <ResponsiveCanvasFrame minHeight={520}><div role="dialog" aria-modal="true" aria-labelledby="pvp-title" className="absolute inset-0 z-40 overflow-auto bg-gradient-to-b from-[#102e29] to-[#203d4e] text-[#f1ebce]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header className="sticky top-0 z-10 border-b border-[#708360] bg-[#102e29] p-5">
      <h2 id="pvp-title" className="flex items-center gap-2 pr-14 text-2xl font-semibold"><Swords size={24} /> PvP Arena</h2>
      <p className="mt-2 text-xs text-[#c1cda9]">Up to 6 vs 6 · Uneven teams allowed · Full HP/MP · Current equipment and upgrades</p>
      <button ref={closeRef} type="button" onClick={close} disabled={busy} aria-label={code ? "Leave PvP room" : "Close PvP"} className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-xl border border-[#708360] outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]"><X size={20} /></button>
      {error && <p role="alert" className="mt-2 text-sm text-[#ffbca8]">{error}</p>}
    </header>
    <div className="mx-auto max-w-7xl space-y-5 p-5">
      {!code ? <>
        <p className="text-sm text-[#c1cda9]">Create a room and share its code, or join another player on this server.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className={button} onClick={() => action.mutate({ path: "/pvp" })}>Create room</button>
          <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); action.mutate({ path: `/pvp/${joinCode.trim().toUpperCase()}/join` }); }}>
            <input aria-label="Room code" placeholder="Room code" maxLength={10} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} className="w-40 rounded-lg border border-[#708360] bg-[#163a30] px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895]" />
            <button type="submit" disabled={busy || !/^[A-F0-9]{10}$/.test(joinCode.trim())} className={button}>Join</button>
          </form>
        </div>
        <h3 className="font-semibold">Open rooms</h3>
        {lobby.isPending ? <p role="status">Loading rooms…</p> : lobby.data?.rooms.length ? <ul className="space-y-2">{lobby.data.rooms.map((entry) => <li key={entry.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#708360] bg-[#163a30] p-4">
          <div><p>{entry.hostName} <span className="text-xs text-[#c1cda9]">({entry.hostUsername})</span></p><p className="font-mono text-sm text-[#e4d895]">{entry.code}</p></div>
          <button type="button" disabled={busy || entry.isMine} className={button} onClick={() => action.mutate({ path: `/pvp/${entry.code}/join` })}>Join room</button>
        </li>)}</ul> : <p className="text-sm text-[#c1cda9]">No open rooms yet. Create one for the other player to join.</p>}
      </> : room.isPending ? <p role="status">Opening room…</p> : data && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p>Room: <strong className="font-mono text-[#e4d895]">{code}</strong></p><span role="status" className="text-sm text-[#a9d4ff]">{data.phase === "waiting" ? "Choose your team and ready up" : data.phase === "countdown" ? "Starting positions · Countdown" : data.phase === "battle" ? "Battle in progress" : data.phase === "complete" ? "Battle complete" : "This room has ended"}</span></div>
        <div className="grid grid-cols-2 gap-3">{data.players.map((player, side) => <div key={side} className="min-w-0 rounded-xl border border-[#708360] bg-[#163a30] p-3 text-center">
          <h3 className="truncate font-semibold">{player ? `${player.name}${player.id === userId ? " (You)" : ""}` : "Waiting for player…"}</h3>
          <p className="mt-1 text-xs text-[#e4d895]">{player ? `${player.selectedCount ?? player.fighters.length} / 6 characters · ${player.ready ? "Ready" : "Choosing team"}` : "Share the room code"}</p>
          {player?.fighters.length ? <p className="mt-2 text-xs text-[#c1cda9]">{player.fighters.map((fighter) => fighter.name).join(", ")}</p> : null}
        </div>)}</div>
        {!!fighters.length && <PvpBattleCanvas fighters={fighters} steps={data.result?.steps ?? []} elapsed={data.phase === "complete" ? data.result?.duration ?? elapsed : elapsed} playing={data.phase === "countdown" || data.phase === "battle"} hostId={data.players[0]!.id} />}
        {data.phase === "waiting" && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Your team ({selected.length}/6)</h3>
            <button type="button" className={button} disabled={busy || !!me?.ready || !roster.data?.characters.length} onClick={() => {
              const saved = roster.data?.teamSlots.filter((id): id is string => !!id && !!roster.data?.characters.some((member) => member.id === id)) ?? [];
              select(saved.length ? saved : roster.data!.characters.slice(0, 6).map((member) => member.id!));
            }}>Use room team</button>
          </div>
          <p className="text-xs text-[#c1cda9]">Select 1–6 characters in formation order. First three lead; the next three stay behind. Click a selected character to remove it. A team of six can fight a team of one.</p>
          <ol aria-label="Selected team formation" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, slot) => {
            const member = roster.data?.characters.find((entry) => entry.id === selected[slot]);
            return <li key={slot} className="rounded-lg border border-[#708360] bg-[#163a30] p-2 text-xs"><span className="block text-[#e4d895]">{slot < 3 ? "Front" : "Back"} {slot % 3 + 1}</span><span>{member?.name ?? "Empty"}</span></li>;
          })}</ol>
          {roster.isPending ? <p>Loading characters…</p> : roster.data?.characters.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{roster.data.characters.map((member) => {
            const chosen = selected.includes(member.id!);
            return <button key={member.id} type="button" disabled={busy || !!me?.ready || (!chosen && selected.length >= 6)} aria-pressed={chosen} onClick={() => select(chosen ? selected.filter((id) => id !== member.id) : [...selected, member.id!])} className={`cursor-pointer rounded-xl border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8] disabled:opacity-60 ${chosen ? "border-[#e4d895] bg-[#375940]" : "border-[#708360] bg-[#163a30]"}`}>
              <span className="font-semibold">{chosen ? `${selected.indexOf(member.id!) + 1}. ` : ""}{member.name}</span><span className="ml-2 text-xs text-[#c1cda9]">{weaponDetails(member.weapon).label}</span><span className="mt-1 block text-xs text-[#c1cda9]">HP {member.stats?.hp} · MP {member.stats?.mp} · ATK {member.stats?.atk} · Magic {member.stats?.magic} · Speed {member.stats?.speed}</span>
            </button>;
          })}</div> : <p className="text-sm text-[#c1cda9]">Create your starter character first.</p>}
          <button type="button" disabled={busy || !selected.length} className={button} onClick={() => action.mutate({ path: `/pvp/${code}/ready`, body: { ready: !me?.ready } })}>{me?.ready ? "Unready" : "Ready"}</button>
          <p className="text-xs text-[#c1cda9]">Both players must be ready. Teams start at opposite ends after the five-second countdown. Ranged attacks reach farther; melee characters must close the gap. Opponent selections are hidden until both are ready.</p>
        </>}
        {data.phase === "complete" && <div role="status" className="rounded-xl border border-[#b8a76d] bg-[#294a40] p-5 text-center"><p className="text-2xl font-semibold text-[#e4d895]">{data.result?.winnerId ? data.result.winnerId === userId ? "Victory!" : "Defeat" : "Draw"}</p><p className="mt-2 text-sm text-[#c1cda9]">PvE health, mana, gold, and progression are unchanged.</p><button type="button" disabled={busy} className={`${button} mt-4`} onClick={() => action.mutate({ path: `/pvp/${code}/return` })}>Return to PvP room</button></div>}
        {["canceled", "closed", "expired"].includes(data.phase) && <p className="rounded-xl border border-[#708360] p-4 text-sm">The room was closed, canceled, or expired. Return to the room to start another match.</p>}
        {!!fighters.length && <ol aria-label="PvP battle log" tabIndex={0} className="h-[clamp(8rem,22dvh,12rem)] space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[#708360] bg-[#102e29] p-4 text-xs break-words [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-[#fff0b8]">{recent.length ? recent.map((step, index) => <li key={`${step.at}-${index}`} className={step.critical ? "text-[#c58aff]" : step.kind === "skill" ? "text-[#69b7ff]" : "text-[#c1cda9]"}>{step.at.toFixed(1)}s · {fighters[step.actor]?.name ?? data.players[step.side]?.name}: {step.label}{step.damage ? ` · −${step.damage} HP` : ""}{step.healing ? ` · +${step.healing} HP` : ""}</li>) : <li className="text-[#c1cda9]">Waiting for battle to begin…</li>}</ol>}
      </>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
