"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, ScrollText, Swords } from "lucide-react";
import type { RoomState } from "./pvp-types";
import { pvpDamage } from "@/lib/pvp-damage";
import { DamageSpread } from "./damage-spread";
import { PvpBattleCanvas } from "./pvp-battle-canvas";
import { PvpChat } from "./pvp-chat";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { BattleLog } from "./battle-log";

const button = "menu-action inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 py-2 text-sm disabled:opacity-50";
export function PvpArena({ data, userId, elapsed, busy, error, onClose, onReturn }: {
  data: RoomState; userId: string; elapsed: number; busy: boolean; error?: string; onClose: () => void; onReturn: () => void;
}) {
  const [chat, setChat] = useState(false), [log, setLog] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  const fighters = data.result?.fighters ?? data.players.flatMap(player => player?.fighters ?? []);
  const time = data.phase === "complete" ? data.result?.duration ?? elapsed : elapsed;
  const steps = data.result?.steps ?? [];
  const rows = pvpDamage(fighters, steps, time).map((row, index) => ({ ...row, name: `${row.name} (${fighters[index].userId === userId ? "You" : data.players.find(player => player?.id === fighters[index].userId)?.name ?? "Opponent"})` }));
  const recent = steps.filter(step => step.at <= time && !["mana", "move"].includes(step.kind)).slice(-80).reverse();
  return <ResponsiveCanvasFrame fit minHeight={560} narrowMinHeight={600}><div role="dialog" aria-modal="true" aria-labelledby="pvp-title" className="paper-menu absolute inset-0 z-40 overflow-hidden text-[#43311f]" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (chat) setChat(false); else onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex='0']"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <div className="absolute inset-0"><PvpBattleCanvas arena fullScreen fighters={fighters} steps={steps} elapsed={time} playing={data.phase === "countdown" || data.phase === "battle"} hostId={data.players[0]!.id} backgroundSrc="/optimized/maps/battle-lab-arena-v1.4614031f6de5.webp" /></div>
    <header className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
      <div className="menu-info px-4 py-2"><h2 id="pvp-title" className="flex items-center gap-2 font-serif text-xl font-semibold"><Swords size={22} />PvP Arena</h2><p className="text-xs">{data.players.map(player => player?.name).filter(Boolean).join(" vs ")}</p><p role="status" className="mt-1 text-xs">{data.phase === "countdown" ? `Starting in ${Math.max(1, Math.ceil(-elapsed))}…` : data.phase === "complete" ? "Battle complete" : `Battle · ${Math.max(0, time).toFixed(1)}s`}</p></div>
      <div className="pointer-events-auto flex flex-wrap gap-2"><button className={button} aria-pressed={log} onClick={() => setLog(value => !value)}><ScrollText size={18} />Log</button><button className={button} aria-expanded={chat} onClick={() => setChat(value => !value)}><MessageCircle size={18} />Chat</button><button ref={closeRef} className={button} disabled={busy} onClick={onClose} aria-label="Leave PvP room"><ArrowLeft size={18} />Leave</button></div>
    </header>
    <DamageSpread rows={rows} compact top={162} pad={12} />
    <BattleLog label="PvP battle log" expanded={log} onExpandedChange={setLog} className="absolute bottom-3 left-3 z-10 w-[min(430px,calc(100%-24px))]">{recent.length ? recent.map((step, index) => <li key={`${step.at}-${index}`} className={step.critical ? "text-[#79468f]" : step.kind === "skill" ? "text-[#315f8e]" : "text-[#71583c]"}>{step.at.toFixed(1)}s · {fighters[step.actor]?.name}: {step.label}{step.damage ? ` · −${step.damage} HP` : ""}{step.healing ? ` · +${step.healing} HP` : ""}</li>) : <li>Waiting for battle to begin…</li>}</BattleLog>
    {error && <p role="alert" className="menu-info absolute inset-x-3 top-32 z-20 p-3 text-sm text-[#a13725]">{error}</p>}
    {data.phase === "complete" && <section role="status" className="menu-info absolute top-1/2 left-1/2 z-20 w-[min(360px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 space-y-3 p-5 text-center"><h3 className="font-serif text-3xl font-semibold">{data.result?.winnerId ? data.result.winnerId === userId ? "Victory!" : "Defeat" : "Draw"}</h3><p className="text-xs">Battle time: {(data.result?.duration ?? 0).toFixed(1)}s</p><button className={button} disabled={busy} onClick={onReturn}>Return to PvP room</button></section>}
    {chat && <aside aria-label="Arena chat" className="absolute top-32 right-3 bottom-3 z-30 w-80 max-w-[calc(100%-24px)] shadow-xl"><PvpChat code={data.code} userId={userId} ended={false} fill onClose={() => setChat(false)} /></aside>}
  </div></ResponsiveCanvasFrame>;
}
