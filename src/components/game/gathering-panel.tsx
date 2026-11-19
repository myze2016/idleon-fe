"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, ChevronRight, MessageCircle, Send, Swords, Users, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { GatheringScene } from "./gathering-scene";
import { PvpPanel } from "./pvp-panel";
import type { GatheringMembership, GatheringState } from "./gathering-types";

const button = "menu-action inline-flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm disabled:cursor-default disabled:opacity-50";
export function GatheringPanel({ onClose }: { onClose: () => void }) {
  const userId = useSession().data?.user.id;
  const client = useQueryClient();
  const [membership, setMembership] = useState<GatheringMembership | null>(null);
  const membershipRef = useRef<GatheringMembership | null>(null);
  const initialJoinRequested = useRef(false);
  const [choosingRoom, setChoosingRoom] = useState(false);
  const position = useRef({ x: .5, y: .7 });
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"chat" | "players">("chat");
  const [chatOpen, setChatOpen] = useState(false);
  const chatToggle = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [pvpCode, setPvpCode] = useState("");
  const consumedDuel = useRef("");
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lobby = useQuery({ queryKey: ["gathering-lobby", userId], enabled: !!userId && (!membership || choosingRoom), refetchInterval: 5000,
    queryFn: () => api<{ capacity: number; rooms: { id: number; capacity: number; players: number }[] }>("/gathering") });
  const join = useMutation({ mutationFn: (body: { roomId?: number; create?: boolean; firstAvailable?: boolean }) => api<GatheringMembership>("/gathering/join", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: data => { membershipRef.current = data; position.current = { x: data.x, y: data.y }; setMembership(data); setChoosingRoom(false); setSelected(""); setNotice(""); setDraft(""); action.reset(); } });
  const enter = join.mutate;
  useEffect(() => {
    if (!userId || initialJoinRequested.current) return;
    initialJoinRequested.current = true;
    enter({ firstAvailable: true });
  }, [userId, enter]);
  const room = useQuery({ queryKey: ["gathering-room", userId, membership?.token], enabled: !!membership && !!userId,
    retry: false, refetchInterval: query => query.state.error instanceof ApiError && [401, 409].includes(query.state.error.status) ? false : 1000, refetchOnWindowFocus: true,
    queryFn: async () => {
      const current = membershipRef.current;
      if (!current) throw new Error("Join a gathering room first");
      const data = await api<GatheringState>(`/gathering/${current.roomId}/presence`, { method: "POST", body: JSON.stringify({ token: current.token, ...position.current }) });
      if (data.pvpCode && consumedDuel.current !== data.pvpCode) { consumedDuel.current = data.pvpCode; setPvpCode(data.pvpCode); }
      return data;
    } });
  const action = useMutation({ mutationFn: (input: { path: string; body: object }) => {
    const current = membershipRef.current;
    if (!current) throw new Error("Join a gathering room first");
    return api<{ code?: string | null }>(`/gathering/${current.roomId}/${input.path}`, { method: "POST", body: JSON.stringify({ token: current.token, ...input.body }) });
  }, onSuccess: async (data, input) => {
    if (input.path === "chat") setDraft("");
    if (input.path === "challenge") setNotice("PvP invitation sent. It expires in 60 seconds.");
    if (data.code) { consumedDuel.current = data.code; setPvpCode(data.code); }
    await client.invalidateQueries({ queryKey: ["gathering-room", userId] });
  } });
  async function leave(close = false) {
    const current = membershipRef.current;
    if (current) {
      try { await api(`/gathering/${current.roomId}/leave`, { method: "POST", body: JSON.stringify({ token: current.token }) }); }
      catch { /* Offline presence expires automatically. */ }
    }
    membershipRef.current = null; setMembership(null); setSelected(""); action.reset();
    await client.invalidateQueries({ queryKey: ["gathering-lobby", userId] });
    if (close) onClose();
  }
  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
    return () => {
      // Defer cleanup so React's development effect replay does not evict the player.
      cleanupTimer.current = setTimeout(() => {
        const current = membershipRef.current;
        if (current) void api(`/gathering/${current.roomId}/leave`, { method: "POST", keepalive: true, body: JSON.stringify({ token: current.token }) }).catch(() => {});
      }, 0);
    };
  }, []);
  const data = room.data;
  const lastMessage = data?.messages.at(-1)?.id;
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "nearest" }); }, [lastMessage, tab, chatOpen]);
  const opponent = data?.players.find(player => player.id === selected && player.id !== userId);
  const pending = data?.challenges.filter(challenge => challenge.status === "pending") ?? [];
  const error = action.error?.message ?? room.error?.message ?? ((choosingRoom || !membership) ? join.error?.message ?? lobby.error?.message : undefined);
  return <ResponsiveCanvasFrame fit minHeight={560} narrowMinHeight={640}><div role="dialog" aria-modal="true" aria-labelledby="gathering-title" className="paper-menu absolute inset-0 flex flex-col overflow-hidden bg-[#efdfb8] text-[#43311f]" onKeyDown={event => {
    if (event.key === "Escape" && !pvpCode) {
      event.stopPropagation();
      if (chatOpen) { setChatOpen(false); chatToggle.current?.focus({ preventScroll: true }); }
      else void leave(true);
    }
    if (event.key === "Tab" && !pvpCode) {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <div inert={!!pvpCode} className="relative isolate flex min-h-0 flex-1 flex-col">
      <header className="menu-info flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#a38358] px-4 py-3">
        <div><h2 id="gathering-title" className="flex items-center gap-2 font-serif text-xl font-semibold"><Users size={22} />Gathering{membership ? ` #${membership.roomId}` : " rooms"}</h2><p className="mt-0.5 text-xs text-[#71583c]">{data && membership ? `${data.players.length}/${data.capacity} adventurers · Live room chat` : `Meet adventurers · ${lobby.data?.capacity ?? 12} players per room`}</p></div>
        <div className="ml-auto flex gap-2">{membership && <><button ref={chatToggle} type="button" className={button} aria-label={chatOpen ? "Hide room chat" : "Show room chat"} aria-expanded={chatOpen} aria-controls="gathering-sidebar" onClick={() => setChatOpen(value => !value)}><MessageCircle size={18} /><span className="hidden sm:inline">Chat</span></button><button type="button" className={button} aria-label="Change gathering room" aria-expanded={choosingRoom} onClick={() => setChoosingRoom(value => !value)}><ArrowLeftRight size={16} /><span className="hidden sm:inline">Rooms</span></button></>}<button ref={closeButton} type="button" className={button} aria-label="Return to my room" onClick={() => void leave(true)}><X size={20} /></button></div>
      </header>
      {error && <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#a38358] bg-[#f9e4c4] px-4 py-2 text-xs text-[#963f2d]">{error}{membership && <><button className={button} onClick={() => void room.refetch()}>Retry</button><button className={button} onClick={() => join.mutate({ roomId: membership.roomId })}>Rejoin</button></>}</div>}
      {(!membership || choosingRoom) ? !membership && !join.isError ? <p role="status" className="p-5">Joining the first available gathering room...</p> : <div className="flex-1 space-y-5 overflow-auto p-5">
        <p className="text-sm">Relax by the hearth, chat, and invite another player to a friendly duel. Your starter character represents you here.</p>
        <div className="flex flex-wrap gap-3"><button className={button} disabled={join.isPending} onClick={() => join.mutate({ firstAvailable: true })}>{join.isPending ? "Joining…" : "Join available room"}</button><button className={button} disabled={join.isPending} onClick={() => join.mutate({ create: true })}>New gathering room</button></div>
        {membership && <button type="button" className={button} onClick={() => setChoosingRoom(false)}>Back to Gathering #{membership.roomId}</button>}
        <h3 className="font-semibold">Change gathering room</h3>
        {lobby.isPending ? <p role="status">Loading rooms…</p> : lobby.data?.rooms.length ? <ul className="grid gap-3 sm:grid-cols-2">{lobby.data.rooms.map(entry => <li key={entry.id} className="menu-info flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">Gathering #{entry.id}</p><p className="text-xs">{entry.players}/{entry.capacity} players</p></div><button className={button} disabled={join.isPending || entry.id === membership?.roomId || entry.players >= entry.capacity} onClick={() => join.mutate({ roomId: entry.id })}>{entry.id === membership?.roomId ? "Current room" : entry.players >= entry.capacity ? "Full" : "Join"}</button></li>)}</ul> : <p className="text-sm">No rooms yet. Join to open the first gathering.</p>}
      </div> : !data ? <p role="status" className="p-5">Entering gathering room…</p> : <>
        {pending.map(challenge => <div key={challenge.id} className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#a38358] bg-[#f5e3b9] px-4 py-2 text-sm">
          {challenge.toId === userId ? <><span><Swords className="mr-1 inline" size={16} />{data.players.find(player => player.id === challenge.fromId)?.username ?? "An adventurer"} invites you to PvP.</span><div className="flex gap-2"><button className={button} disabled={action.isPending} onClick={() => action.mutate({ path: `challenge/${challenge.id}/answer`, body: { accept: true } })}>Accept</button><button className={button} disabled={action.isPending} onClick={() => action.mutate({ path: `challenge/${challenge.id}/answer`, body: { accept: false } })}>Decline</button></div></> : <span>Waiting for {data.players.find(player => player.id === challenge.toId)?.username ?? "the other player"} to answer your PvP invitation…</span>}
        </div>)}
        <div className="relative flex min-h-0 flex-1">
          <GatheringScene data={data} userId={userId!} position={position} selected={selected} onSelect={id => { setSelected(id); if (id && id !== userId) { setTab("players"); setChatOpen(true); } }} />
          {chatOpen && <aside id="gathering-sidebar" className="absolute inset-y-0 right-0 z-[150] flex w-80 max-w-[calc(100%_-_3rem)] min-h-0 shrink-0 flex-col border-l-2 border-[#a38358] bg-[#efdfb8] shadow-[-8px_0_24px_#24180e33] md:static md:max-w-none" aria-label="Gathering chat and players">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#a3835866] p-2"><button className={button} aria-pressed={tab === "chat"} onClick={() => setTab("chat")}><MessageCircle size={16} />Chat</button><button className={button} aria-pressed={tab === "players"} onClick={() => setTab("players")}><Users size={16} />Players ({data.players.length})</button><button type="button" className={button + " ml-auto"} aria-label="Collapse chat panel" onClick={() => { setChatOpen(false); chatToggle.current?.focus({ preventScroll: true }); }}><ChevronRight size={18} /></button></div>
            {tab === "chat" ? <>
              <div role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 text-sm">{data.messages.length ? data.messages.map(message => <p key={message.id} className="break-words"><span className="font-semibold text-[#805523]">{message.username}: </span>{message.body}</p>) : <p className="text-xs text-[#71583c]">Say hello! Messages are visible to everyone in this gathering room.</p>}<div ref={chatEnd} /></div>
              <form className="flex shrink-0 gap-2 border-t border-[#a3835866] p-2" onSubmit={event => { event.preventDefault(); if (draft.trim() && !action.isPending) action.mutate({ path: "chat", body: { body: draft.trim() } }); }}><input aria-label="Room message" className="menu-field min-h-11 min-w-0 flex-1 px-3 text-base" placeholder="Say hello…" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} /><button type="submit" className={button} aria-label="Send message" disabled={!draft.trim() || action.isPending || !!room.error}><Send size={18} /></button></form>
            </> : <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
              {opponent && <div className="menu-info space-y-2 p-3"><p className="font-semibold">{opponent.username}</p><p className="text-xs">{opponent.name} · Friendly PvP, no gold or EXP at stake</p><button className={button} disabled={action.isPending || !!pending.length || !!room.error} onClick={() => action.mutate({ path: "challenge", body: { targetId: opponent.id } })}><Swords size={16} />Challenge to PvP</button></div>}
              {notice && <p role="status" className="text-xs">{notice}</p>}
              {data.players.map(player => <button key={player.id} type="button" className={`${button} w-full justify-between`} aria-pressed={selected === player.id} onClick={() => setSelected(player.id)}><span className="truncate">{player.username}{player.id === userId ? " (You)" : ""}</span>{player.id !== userId && <Swords size={15} />}</button>)}
            </div>}
          </aside>}
        </div>
      </>}
    </div>
    {pvpCode && <PvpPanel key={pvpCode} initialCode={pvpCode} onClose={() => { setPvpCode(""); void room.refetch(); }} />}
  </div></ResponsiveCanvasFrame>;
}
