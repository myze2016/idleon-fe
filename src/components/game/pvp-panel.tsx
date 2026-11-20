"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { TeamScreen } from "./team-screen";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { PvpBattleCanvas } from "./pvp-battle-canvas";
import { PvpChat } from "./pvp-chat";
import { PvpArena } from "./pvp-arena";
import { BattleLog } from "./battle-log";
import type { RoomState } from "./pvp-types";
import { useRealtime } from "@/lib/realtime";

export function PvpPanel({ onClose, initialCode = "" }: { onClose: () => void; initialCode?: string }) {
  const [editingTeam, setEditingTeam] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState(initialCode), [joinCode, setJoinCode] = useState(""), [now, setNow] = useState(() => Date.now());
  const session = useSession(), userId = session.data?.user.id, roster = useCharacter(userId), client = useQueryClient();
  const liveLobby = useRealtime("pvp-lobby", {}, !!userId && !code, () => { void client.invalidateQueries({ queryKey: ["pvp-lobby", userId] }); });
  const liveRoom = useRealtime("pvp", { code }, !!userId && !!code, () => { void client.invalidateQueries({ queryKey: ["pvp-room", userId, code] }); });
  const lobby = useQuery({ queryKey: ["pvp-lobby", userId], enabled: !!userId && !code, refetchInterval: liveLobby.ready ? 15000 : 1500,
    queryFn: async ({ signal }) => {
      const data = await api<{ rooms: { code: string; hostName: string; hostUsername: string; isMine: boolean }[]; activeCode: string | null }>("/pvp", { signal });
      if (data.activeCode) setCode(data.activeCode);
      return data;
    } });
  const room = useQuery<RoomState>({ queryKey: ["pvp-room", userId, code], enabled: !!userId && !!code, queryFn: async ({ signal }) => {
    const previous = client.getQueryData<RoomState>(["pvp-room", userId, code]);
    const known = previous?.result && previous.startsAt ? previous.startsAt : null;
    const next = await api<RoomState>(`/pvp/${code}${known ? `?battle=${encodeURIComponent(known)}` : ""}`, { signal });
    if (next.resultUnchanged && previous?.result && previous.startsAt === next.startsAt) return {
      ...next, result: previous.result,
      players: next.players.map((player, index) => player ? { ...player, fighters: previous.players[index]?.id === player.id ? previous.players[index]!.fighters : player.fighters } : null),
    };
    return next;
  }, retry: false,
    refetchInterval: (query) => query.state.error || ["complete", "canceled", "closed", "expired"].includes(query.state.data?.phase ?? "") ? false : liveRoom.ready ? 15000 : query.state.data?.phase === "battle" && query.state.data.result ? 1500 : 500 });
  const action = useMutation({ mutationFn: (input: { path: string; body?: object }) => api<{ code: string }>(input.path, { method: "POST", ...(input.body ? { body: JSON.stringify(input.body) } : {}) }),
    onSuccess: async (data) => { setCode(data.code); await client.invalidateQueries({ queryKey: ["pvp-room", userId, data.code] }); await client.invalidateQueries({ queryKey: ["pvp-lobby", userId] }); } });
  const leave = useMutation({ mutationFn: () => code ? api(`/pvp/${code}/leave`, { method: "POST" }) : Promise.resolve(),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["pvp-lobby", userId] }); onClose(); } });
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!room.data?.startsAt || !["countdown", "battle"].includes(room.data.phase)) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [room.data?.startsAt, room.data?.phase]);
  useEffect(() => {
    const data = room.data;
    if (!data?.startsAt || !["countdown", "battle"].includes(data.phase)) return;
    const boundary = Date.parse(data.startsAt) + (data.phase === "battle" ? (data.result?.duration ?? 180) * 1000 : 0);
    const delay = Math.max(0, boundary - Date.parse(data.serverNow) - (Date.now() - room.dataUpdatedAt)) + 80;
    const timer = setTimeout(() => { void client.invalidateQueries({ queryKey: ["pvp-room", userId, code] }); }, delay);
    return () => clearTimeout(timer);
  }, [room.data, room.dataUpdatedAt, client, userId, code]);
  const data = room.data, me = data?.players.find((player) => player?.id === userId);
  const selected = me?.characterIds ?? [];
  const serverTime = data ? Date.parse(data.serverNow) + Math.max(0, now - room.dataUpdatedAt) : now;
  const elapsed = data?.startsAt ? (serverTime - Date.parse(data.startsAt)) / 1000 : -5;
  const steps = data?.result?.steps.filter((step) => step.at <= elapsed) ?? [];
  const recent = steps.filter((step) => !["mana", "move"].includes(step.kind)).slice(-8).reverse();
  const fighters = data?.result?.fighters ?? data?.players.flatMap((player) => player?.fighters ?? []) ?? [];
  const busy = action.isPending || leave.isPending;
  const button = "menu-action cursor-pointer rounded-lg border border-[#a38358] paper-card bg-[#e4d895] px-4 py-2 text-sm font-semibold text-[#43311f] outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-not-allowed disabled:opacity-50";
  const error = action.error?.message ?? leave.error?.message ?? room.error?.message ?? lobby.error?.message;
  function close() { if (!busy) { if (code && data && ["waiting", "countdown", "battle", "complete"].includes(data.phase)) leave.mutate(); else onClose(); } }
  function select(characterIds: string[]) { action.mutate({ path: `/pvp/${code}/select`, body: { characterIds } }); }

  if (data && ["countdown", "battle", "complete"].includes(data.phase)) return <PvpArena data={data} userId={userId!} elapsed={elapsed} busy={busy} error={error} onClose={close} onReturn={() => action.mutate({ path: `/pvp/${code}/return` })} />;

  if (editingTeam && data?.phase === "waiting") return <TeamScreen characters={roster.data?.characters ?? []} onClose={() => setEditingTeam(false)} selection={{
    slots: Array.from({ length: 6 }, (_, slot) => roster.data?.characters.find(member => member.id === selected[slot]) ?? null),
    busy: busy || !!me?.ready, saving: action.isPending, error,
    onAssign: (slot, member) => {
      if (busy || me?.ready) return;
      const next = [...selected];
      if (!member?.id) next.splice(slot, 1);
      else {
        const previous = next.indexOf(member.id);
        if (previous >= 0) next[previous] = next[slot];
        next[slot] = member.id;
      }
      select(next.filter((id): id is string => !!id));
    },
  }} />;

  return <ResponsiveCanvasFrame minHeight={520}><div role="dialog" aria-modal="true" aria-labelledby="pvp-title" className="paper-menu absolute inset-0 z-40 overflow-auto paper-menu paper-card bg-[#efdfb8] text-[#43311f]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header className="sticky top-0 z-10 border-b border-[#a38358] paper-card bg-[#efdfb8] p-5">
      <h2 id="pvp-title" className="flex items-center gap-2 pr-14 text-2xl font-semibold"><Swords size={24} /> PvP Arena</h2>
      <p className="mt-2 text-xs text-[#71583c]">Up to 6 vs 6 · Uneven teams allowed · Full HP/MP · Current equipment and upgrades</p>
      <button ref={closeRef} type="button" onClick={close} disabled={busy} aria-label={code ? "Leave PvP room" : "Close PvP"} className="absolute top-4 right-4 grid size-11 menu-action cursor-pointer place-items-center rounded-xl border border-[#a38358] outline-none focus-visible:ring-2 focus-visible:ring-[#805523]"><X size={20} /></button>
      {error && <p role="alert" className="mt-2 text-sm text-[#a13725]">{error}</p>}
    </header>
    <div className="mx-auto max-w-7xl space-y-5 p-5">
      {!code ? <>
        <p className="text-sm text-[#71583c]">Create a room and share its code, or join another player on this server.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className={button} onClick={() => action.mutate({ path: "/pvp" })}>Create room</button>
          <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); action.mutate({ path: `/pvp/${joinCode.trim().toUpperCase()}/join` }); }}>
            <input aria-label="Room code" placeholder="Room code" maxLength={10} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} className="menu-field min-h-11 min-w-0 w-40 px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#805523]" />
            <button type="submit" disabled={busy || !/^[A-F0-9]{10}$/.test(joinCode.trim())} className={button}>Join</button>
          </form>
        </div>
        <h3 className="font-semibold">Open rooms</h3>
        {lobby.isPending ? <p role="status">Loading rooms…</p> : lobby.data?.rooms.length ? <ul className="space-y-2">{lobby.data.rooms.map((entry) => <li key={entry.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#a38358] paper-card menu-info bg-[#e9d4a7] p-4">
          <div><p>{entry.hostName} <span className="text-xs text-[#71583c]">({entry.hostUsername})</span></p><p className="font-mono text-sm text-[#805523]">{entry.code}</p></div>
          <button type="button" disabled={busy || entry.isMine} className={button} onClick={() => action.mutate({ path: `/pvp/${entry.code}/join` })}>Join room</button>
        </li>)}</ul> : <p className="text-sm text-[#71583c]">No open rooms yet. Create one for the other player to join.</p>}
      </> : room.isPending ? <p role="status">Opening room…</p> : data && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p>Room: <strong className="font-mono text-[#805523]">{code}</strong></p><span role="status" className="text-sm text-[#315f8e]">{data.phase === "waiting" ? "Choose your team and ready up" : data.phase === "countdown" ? "Starting positions · Countdown" : data.phase === "battle" ? "Battle in progress" : data.phase === "complete" ? "Battle complete" : "This room has ended"}</span></div>
        <div className="grid grid-cols-2 gap-3">{data.players.map((player, side) => <div key={side} className="min-w-0 rounded-xl border border-[#a38358] paper-card menu-info bg-[#e9d4a7] p-3 text-center">
          <h3 className="truncate font-semibold">{player ? `${player.name}${player.id === userId ? " (You)" : ""}` : "Waiting for player…"}</h3>
          <p className="mt-1 text-xs text-[#805523]">{player ? `${player.selectedCount ?? player.fighters.length} / 6 characters · ${player.ready ? "Ready" : "Choosing team"}` : "Share the room code"}</p>
          {player?.fighters.length ? <p className="mt-2 text-xs text-[#71583c]">{player.fighters.map((fighter) => fighter.name).join(", ")}</p> : null}
        </div>)}</div>
        {!!fighters.length && <PvpBattleCanvas fighters={fighters} steps={data.result?.steps ?? []} elapsed={data.phase === "complete" ? data.result?.duration ?? elapsed : elapsed} playing={data.phase === "countdown" || data.phase === "battle"} hostId={data.players[0]!.id} />}
        {data.phase === "waiting" && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Your team ({selected.length}/6)</h3>
            <button type="button" className={button} disabled={busy || !!me?.ready || !roster.data?.characters.length} onClick={() => {
              const saved = roster.data?.teamSlots.filter((id): id is string => !!id && !!roster.data?.characters.some((member) => member.id === id)) ?? [];
              select(saved.length ? saved : roster.data!.characters.slice(0, 6).map((member) => member.id!));
            }}>Use room team</button>
          </div>
          <button type="button" className={button} disabled={busy || !!me?.ready || !roster.data?.characters.length} onClick={() => setEditingTeam(true)}>Edit team formation</button>
          <p className="text-xs text-[#71583c]">{selected.length ? selected.map(id => roster.data?.characters.find(member => member.id === id)?.name ?? "Character").join(" / ") : "Choose up to six characters using the team formation slots."}</p>
          <button type="button" disabled={busy || !selected.length} className={button} onClick={() => action.mutate({ path: `/pvp/${code}/ready`, body: { ready: !me?.ready } })}>{me?.ready ? "Unready" : "Ready"}</button>
          <p className="text-xs text-[#71583c]">Both players must be ready. Teams start at opposite ends after the five-second countdown. Ranged attacks reach farther; melee characters must close the gap. Opponent selections are hidden until both are ready.</p>
        </>}
        {data.phase === "complete" && <div role="status" className="rounded-xl border border-[#a38358] paper-card menu-info bg-[#e9d4a7] p-5 text-center"><p className="text-2xl font-semibold text-[#805523]">{data.result?.winnerId ? data.result.winnerId === userId ? "Victory!" : "Defeat" : "Draw"}</p><p className="mt-2 text-sm text-[#71583c]">PvE health, mana, gold, and progression are unchanged.</p><button type="button" disabled={busy} className={`${button} mt-4`} onClick={() => action.mutate({ path: `/pvp/${code}/return` })}>Return to PvP room</button></div>}
        {["canceled", "closed", "expired"].includes(data.phase) && <p className="rounded-xl border border-[#a38358] p-4 text-sm">The room was closed, canceled, or expired. Return to the room to start another match.</p>}
        {!!fighters.length && <BattleLog label="PvP battle log">{recent.length ? recent.map((step, index) => <li key={`${step.at}-${index}`} className={step.critical ? "text-[#79468f]" : step.kind === "skill" ? "text-[#315f8e]" : "text-[#71583c]"}>{step.at.toFixed(1)}s · {fighters[step.actor]?.name ?? data.players[step.side]?.name}: {step.label}{step.damage ? ` · −${step.damage} HP` : ""}{step.healing ? ` · +${step.healing} HP` : ""}</li>) : <li className="text-[#71583c]">Waiting for battle to begin…</li>}</BattleLog>}
        <PvpChat key={code} code={code} userId={userId!} ended={["canceled", "closed", "expired"].includes(data.phase)} />
      </>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
