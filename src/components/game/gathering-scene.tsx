"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import { drawCharacter } from "./character-design";
import type { GatheringState } from "./gathering-types";

interface Position { x: number; y: number }
export function GatheringScene({ data, userId, position, selected, onSelect, paused = false }: {
  data: GatheringState; userId: string; position: MutableRefObject<Position>;
  selected: string; onSelect: (id: string) => void; paused?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const actors = useRef(new Map<string, Position & { facing: number }>());
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const bubbles = useRef(new Map<string, { element: HTMLSpanElement; until: number }>());
  const bubbleDeadlines = useRef(new Map<string, number>());
  const scene = useRef({ data, selected });
  const remote = useRef(new Map<string, { from: Position; to: Position; at: number; duration: number }>());
  const packetAt = useRef(0);
  const destination = useRef<Position | null>(null);
  useEffect(() => { scene.current.selected = selected; }, [selected]);
  useEffect(() => {
    scene.current.data = data;
    const at = performance.now(), duration = Math.max(80, Math.min(1500, packetAt.current ? at - packetAt.current : 1000));
    packetAt.current = at;
    const active = new Set(data.players.map(player => player.id));
    const messages = new Set(data.messages.map(message => message.id));
    for (const id of bubbleDeadlines.current.keys()) if (!messages.has(id)) bubbleDeadlines.current.delete(id);
    for (const id of remote.current.keys()) if (!active.has(id)) remote.current.delete(id);
    for (const player of data.players) {
      if (player.id === userId) continue;
      const existing = remote.current.get(player.id);
      if (existing?.to.x === player.x && existing.to.y === player.y) continue;
      const actor = actors.current.get(player.id);
      remote.current.set(player.id, { from: { x: actor?.x ?? player.x, y: actor?.y ?? player.y }, to: { x: player.x, y: player.y }, at, duration });
    }
  }, [data, userId]);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d");
    if (!element || !ctx || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = 0, width = 1, height = 1;
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = width * dpr; element.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    function draw(time: number) {
      if (!ctx) return;
      const dt = Math.min(.05, (time - (previous || time)) / 1000); previous = time;
      // The static hall is a CSS layer; only actors need a canvas repaint.
      ctx.clearRect(0, 0, width, height);
      if (destination.current) {
        const dx = destination.current.x - position.current.x, dy = destination.current.y - position.current.y;
        const distance = Math.hypot(dx * width, dy * height), amount = Math.min(1, dt * 140 / Math.max(1, distance));
        position.current = { x: position.current.x + dx * amount, y: position.current.y + dy * amount };
        if (distance < 1) destination.current = null;
      }
      const active = new Set(scene.current.data.players.map(player => player.id));
      for (const id of actors.current.keys()) if (!active.has(id)) actors.current.delete(id);
      const ordered = scene.current.data.players.map(player => {
        const target = player.id === userId ? position.current : player;
        let actor = actors.current.get(player.id);
        if (!actor) { actor = { x: target.x, y: target.y, facing: 1 }; actors.current.set(player.id, actor); }
        const dx = target.x - actor.x, dy = target.y - actor.y;
        const moving = Math.hypot(dx * width, dy * height) > .5;
        if (Math.abs(dx) > .0001) actor.facing = dx > 0 ? 1 : -1;
        const sample = remote.current.get(player.id);
        if (player.id !== userId && sample) {
          const blend = Math.max(0, Math.min(1, (time - sample.at) / sample.duration));
          actor.x = sample.from.x + (sample.to.x - sample.from.x) * blend;
          actor.y = sample.from.y + (sample.to.y - sample.from.y) * blend;
        } else { actor.x = target.x; actor.y = target.y; }
        return { player, actor, moving };
      }).sort((a, b) => a.actor.y - b.actor.y);
      for (const { player, actor, moving } of ordered) {
        const x = actor.x * width, y = actor.y * height;
        if (scene.current.selected === player.id || player.id === userId) {
          ctx.beginPath(); ctx.ellipse(x, y + 1, 23, 7, 0, 0, Math.PI * 2);
          ctx.strokeStyle = player.id === userId ? "#f8d88a" : "#e8e9ee"; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.save(); ctx.translate(x, y);
        drawCharacter(ctx, player.weapon, { facing: actor.facing, stride: reduced.matches || !moving ? 0 : Math.sin(time / 160), idle: reduced.matches || moving ? 0 : Math.sin(time / 800) });
        ctx.restore();
        const label = labels.current.get(player.id);
        if (label) { label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`; label.style.zIndex = String(Math.round(actor.y * 100)); }
        const bubble = bubbles.current.get(player.id);
        if (bubble) bubble.element.hidden = time >= bubble.until;
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [position, userId, paused]);
  return <div role="group" aria-label="Gathering floor. Use arrow keys or WASD to walk." tabIndex={0} className="relative min-h-56 min-w-0 flex-1 overflow-hidden bg-[#59432f] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f8d88a]" style={{ backgroundImage: "url('/optimized/room/gathering-hall-v1.c5d8180560ff.webp')", backgroundSize: "cover", backgroundPosition: "center" }} onKeyDown={event => {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const origin = destination.current ?? position.current;
    destination.current = { x: Math.max(.05, Math.min(.95, origin.x + direction[0] * .04)), y: Math.max(.48, Math.min(.9, origin.y + direction[1] * .04)) };
  }} onPointerDown={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const y = (event.clientY - bounds.top) / bounds.height;
    if (y < .44) return;
    destination.current = { x: Math.max(.05, Math.min(.95, (event.clientX - bounds.left) / bounds.width)), y: Math.max(.48, Math.min(.9, y)) };
    onSelect("");
  }}>
    <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-none" aria-label="Gathering room. Tap the floor to walk; select another player to challenge them." />
    <p className="pointer-events-none absolute top-3 left-3 rounded bg-[#2b1a10b8] px-3 py-1.5 text-xs text-[#fff0cc]">Tap the floor to walk · Select a player for PvP</p>
    {data.players.map(player => {
      const message = [...data.messages].reverse().find(entry => entry.userId === player.id && Date.parse(data.serverNow) - Date.parse(entry.createdAt) < 7000);
      return <button key={player.id} ref={element => { if (element) labels.current.set(player.id, element); else labels.current.delete(player.id); }} type="button" aria-label={`${player.name}, ${player.username}${player.id === userId ? ", you" : ", select to challenge"}`} aria-pressed={selected === player.id} className="absolute top-0 left-0 h-20 w-14 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#f8d88a]" onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(player.id)}>
        {message && <span ref={element => {
          if (!element) { bubbles.current.delete(player.id); return; }
          if (!bubbleDeadlines.current.has(message.id)) bubbleDeadlines.current.set(message.id, performance.now() + Math.max(0, 7000 - (Date.parse(data.serverNow) - Date.parse(message.createdAt))));
          bubbles.current.set(player.id, { element, until: bubbleDeadlines.current.get(message.id)! });
        }} className="pointer-events-none absolute bottom-[92px] left-1/2 w-40 -translate-x-1/2 rounded-xl border border-[#9e7a46] bg-[#fff3d5] px-3 py-2 text-xs text-[#43311f] shadow-md"><span className="line-clamp-3 break-words">{message.body}</span><span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b border-[#9e7a46] bg-[#fff3d5]" /></span>}
        <span className={`pointer-events-none absolute top-full left-1/2 max-w-32 -translate-x-1/2 truncate rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow ${player.id === userId ? "bg-[#f4d895] text-[#43311f]" : "bg-[#2b1a10cc] text-[#fff0cc]"}`}>{player.username}{player.id === userId ? " (You)" : ""}</span>
      </button>;
    })}
  </div>;
}
