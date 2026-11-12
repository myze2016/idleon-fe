"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCharacter } from "./character-design";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { useCharacter, useWish } from "@/lib/character-api";
import { weaponDetails, weapons, specialWeapons } from "@/lib/character";

export function WishScreen({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [focus, setFocus] = useState("");
  const [pool, setPool] = useState<"normal" | "special">("normal");
  const catalog = pool === "special" ? specialWeapons : weapons;
  const cost = pool === "special" ? 200 : 100;
  const session = useSession();
  const userId = session.data?.user.id;
  const state = useCharacter(userId);
  const wish = useWish(userId, pool);
  const balance = state.data?.wishCurrency ?? 0;
  const ownedCount = new Set(state.data?.characters.filter((character) => catalog.some((entry) => entry.id === character.weapon)).map((character) => character.weapon) ?? []).size;
  const complete = ownedCount >= catalog.length;
  const reward = wish.data?.reward;
  const error = wish.error?.message ?? state.error?.message;
  const enabled = balance >= cost && !!userId && !wish.isPending && !complete;

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.scale(ratio, ratio);
      const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#162a36"); sky.addColorStop(1, "#304b49");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = i % 3 ? "#e4d89566" : "#e4d895bb"; ctx.beginPath(); ctx.arc((i * 137 + 37) % width, (i * 73 + 23) % height, i % 3 ? 1 : 2, 0, Math.PI * 2); ctx.fill();
      }
      function text(value: string, x: number, y: number, font: string, color = "#f1ebce", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 12); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      text(pool === "special" ? "Special Wish" : "Wish", 24, 48, "600 28px system-ui");
      text(`Wish currency: ${balance}`, 24, 77, "600 14px system-ui", "#e4d895");
      text(`Collection: ${ownedCount}/${catalog.length}`, 24, 100, "13px system-ui", "#c1cda9");
      const compact = height < 440;
      const centerY = Math.max(200, Math.min(height * 0.48, height - 200));
      ctx.fillStyle = "#e4d89515"; ctx.beginPath(); ctx.arc(width / 2, centerY, compact ? 38 : 62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e4d895"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (reward) {
        ctx.save(); ctx.translate(width / 2, centerY + (compact ? 28 : 49)); ctx.scale(compact ? 1 : 1.6, compact ? 1 : 1.6); drawCharacter(ctx, reward.weapon); ctx.restore();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? 18 : 43;
          const x = width / 2 + Math.cos(angle) * radius, y = centerY + Math.sin(angle) * radius;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.textAlign = "center";
      text(wish.isPending ? "Wishing..." : reward ? `Received: ${pool === "special" ? reward.name : weaponDetails(reward.weapon).label}` : pool === "special" ? "Kent · Juan · Jeffrey" : "Meet your next character", width / 2, centerY + (compact ? 58 : 89), "600 20px system-ui", "#f1ebce", width - 40);
      if (reward && !compact) text("Added to your character list", width / 2, centerY + 113, "13px system-ui", "#c1cda9", width - 40);
      const buttonWidth = Math.min(280, width - 48);
      box((width - buttonWidth) / 2, height - 116, buttonWidth, 52, enabled ? "#e4d895" : "#6b796b", focus === "wish" ? "#fff" : "#b8a76d");
      text(complete ? "Collection complete" : wish.isPending ? "Wishing..." : `Wish · ${cost} currency`, width / 2, height - 83, "600 17px system-ui", "#17392e");
      text(complete ? `All ${catalog.length} ${pool === "special" ? "special characters" : "types"} owned.` : error ?? (balance < cost ? `You need ${cost} wish currency to pull.` : "Equal chances among unowned types. No duplicates."), width / 2, height - 32, "12px system-ui", error && !complete ? "#ffcebb" : "#c1cda9", width - 40);
      ctx.textAlign = "left";
      box(width - 64, 16, 48, 48, "#163a30", focus === "close" ? "#fff" : "#708360");
      ctx.strokeStyle = "#f1ebce"; ctx.beginPath(); ctx.moveTo(width - 47, 33); ctx.lineTo(width - 33, 47); ctx.moveTo(width - 33, 33); ctx.lineTo(width - 47, 47); ctx.stroke();
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [balance, reward, error, enabled, focus, wish.isPending, ownedCount, complete, pool, cost, catalog.length]);

  return <ResponsiveCanvasFrame minHeight={520}><div role="dialog" aria-modal="true" aria-label="Wish for a character" className="absolute inset-0 z-30 bg-[#162a36]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!wish.isPending) onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <div role="group" aria-label="Wish pool" className="absolute top-28 left-6 flex gap-2">{(["normal", "special"] as const).map((value) => <button key={value} type="button" aria-pressed={pool === value} disabled={wish.isPending} onClick={() => { wish.reset(); setPool(value); }} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8] disabled:cursor-wait ${pool === value ? "border-[#e4d895] bg-[#e4d895] text-[#17392e]" : "border-[#708360] bg-[#163a30] text-[#f1ebce]"}`}>{value === "special" ? "Special · 200" : "Normal · 100"}</button>)}</div>
    <button ref={closeRef} type="button" aria-label="Close wish screen" onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close wish screen</span></button>
    <button type="button" disabled={!enabled} onClick={() => wish.mutate()} onFocus={() => setFocus("wish")} onBlur={() => setFocus("")} className="absolute bottom-16 left-1/2 h-[52px] w-[min(280px,calc(100%-48px))] -translate-x-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Wish for a random character. Costs {cost} wish currency.</span></button>
    <p role="status" className="sr-only">Wish currency: {balance}. Collection: {ownedCount} of {catalog.length}. {complete ? "Collection complete. Wishing is disabled." : wish.isPending ? "Wishing." : reward ? `Received ${weaponDetails(reward.weapon).label}. Added to your roster.` : "Wish for a character type you do not own."}</p>
    {error && <p role="alert" className="sr-only">{error}</p>}
  </div></ResponsiveCanvasFrame>;
}
