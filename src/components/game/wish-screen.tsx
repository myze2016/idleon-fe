"use client";
import { drawMenuButton } from "./menu-button";
import { drawPaperPanel } from "./paper-panel";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCharacter, useCharacterSprites } from "./character-design";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { useCharacter, useWish } from "@/lib/character-api";
import { weaponDetails, weapons, specialWeapons } from "@/lib/character";
import { drawWishEffect } from "./wish-effects";

export function WishScreen({ onClose }: { onClose: () => void }) {
  const spriteVersion = useCharacterSprites();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [focus, setFocus] = useState("");
  const [pool, setPool] = useState<"normal" | "special">("normal");
  const [stage, setStage] = useState<"idle" | "charging" | "reveal">("idle");
  const sequence = useRef({ started: 0, revealed: 0, busy: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const catalog = pool === "special" ? specialWeapons : weapons;
  const cost = pool === "special" ? 200 : 100;
  const session = useSession();
  const userId = session.data?.user.id;
  const state = useCharacter(userId);
  const wish = useWish(userId, pool);
  const balance = state.data?.wishCurrency ?? 0;
  const ownedCount = new Set(state.data?.characters.filter((character) => catalog.some((entry) => entry.id === character.weapon)).map((character) => character.weapon) ?? []).size;
  const complete = ownedCount >= catalog.length;
  const reward = stage === "charging" ? undefined : wish.data?.reward;
  const error = wish.error?.message ?? state.error?.message;
  const enabled = balance >= cost && !!userId && !wish.isPending && stage === "idle" && !complete;

  function pull() {
    if (!enabled || sequence.current.busy) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sequence.current = { started: performance.now(), revealed: 0, busy: true };
    setStage("charging"); wish.reset();
    wish.mutate(undefined, { onSuccess: () => {
      timers.current.push(setTimeout(() => {
        sequence.current.revealed = performance.now(); setStage("reveal");
        timers.current.push(setTimeout(() => { sequence.current.busy = false; setStage("idle"); }, reduced ? 100 : 1400));
      }, reduced ? 0 : Math.max(0, 1000 - (performance.now() - sequence.current.started))));
    }, onError: () => { sequence.current.busy = false; setStage("idle"); } });
  }

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const banner = new Image();
    const seal = new Image(); seal.src = "/ui/summon-seal-v1.png";
    seal.onload = () => draw();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    banner.onload = () => draw();
    banner.src = pool === "special" ? "/ui/wish-special-banner-v1.png" : "/ui/wish-regular-banner-v1.png";
    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.scale(ratio, ratio);
      const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#eddbb1"); sky.addColorStop(1, "#304b49");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height); drawPaperPanel(ctx, 0, 0, width, height);
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = i % 3 ? "#e4d89566" : "#e4d895bb"; ctx.beginPath(); ctx.arc((i * 137 + 37) % width, (i * 73 + 23) % height, i % 3 ? 1 : 2, 0, Math.PI * 2); ctx.fill();
      }
      function text(value: string, x: number, y: number, font: string, color = "#43311f", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
        if (h <= 60) { drawMenuButton(ctx!, x, y, w, h, border === "#fff" || border === "#fff0b8"); return; }
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 12); ctx!.fillStyle = fill; ctx!.fill(); drawPaperPanel(ctx!, x, y, w, h); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      text(pool === "special" ? "Special Wish" : "Wish", 24, 48, "600 28px system-ui");
      text(`Wish currency: ${balance}`, 24, 77, "600 14px system-ui", "#805523");
      text(`Collection: ${ownedCount}/${catalog.length}`, 24, 100, "13px system-ui", "#71583c");
      const compact = height < 600;
      const bannerX = 24, bannerY = 168, bannerWidth = width - 48;
      const bannerHeight = Math.max(120, height - bannerY - 188);
      const centerY = bannerY + bannerHeight / 2;
      const elapsed = (performance.now() - sequence.current.started) / 1000;
      const revealTime = stage === "reveal" ? (performance.now() - sequence.current.revealed) / 1000 : null;
      const bannerReady = banner.complete && banner.naturalWidth > 0;
      if (bannerReady) {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8); ctx.clip();
        ctx.fillStyle = pool === "special" ? "#252039" : "#233a39";
        ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);
        const scale = Math.min(bannerWidth / banner.naturalWidth, bannerHeight / banner.naturalHeight);
        const drawWidth = banner.naturalWidth * scale, drawHeight = banner.naturalHeight * scale;
        ctx.drawImage(banner, bannerX + (bannerWidth - drawWidth) / 2, bannerY + (bannerHeight - drawHeight) / 2, drawWidth, drawHeight);
        if (reward || stage !== "idle") { ctx.fillStyle = "#172027cc"; ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight); }
        ctx.restore();
        ctx.beginPath(); ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
        ctx.strokeStyle = pool === "special" ? "#c6a466" : "#805b35"; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.fillStyle = "#e4d89515"; ctx.beginPath(); ctx.arc(width / 2, centerY, compact ? 38 : 62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e4d895"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (stage !== "idle" || reward) {
        ctx.save(); ctx.beginPath(); ctx.rect(bannerX, bannerY, bannerWidth, bannerHeight); ctx.clip();
        drawWishEffect(ctx, seal, width / 2, centerY, Math.min(bannerWidth * .38, bannerHeight * .48), stage === "idle" ? 1.5 : elapsed, pool === "special", revealTime, motion.matches);
        ctx.restore();
      }
      if (reward) {
        const progress = revealTime === null || motion.matches ? 1 : Math.min(1, revealTime / .55);
        const ease = 1 - Math.pow(1 - progress, 3);
        const scale = (compact ? 1 : 1.6) * (.65 + ease * .35);
        ctx.save(); ctx.globalAlpha = ease; ctx.translate(width / 2, centerY + (compact ? 28 : 49) + (1 - ease) * 24); ctx.scale(scale, scale); drawCharacter(ctx, reward.weapon); ctx.restore();
      } else if (!bannerReady) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? 18 : 43;
          const x = width / 2 + Math.cos(angle) * radius, y = centerY + Math.sin(angle) * radius;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.textAlign = "center";
      text(stage === "charging" ? "Gathering wish energy…" : reward ? `Received: ${pool === "special" ? reward.name : weaponDetails(reward.weapon).label}` : pool === "special" ? "Kent · Juan · Jeffrey" : "Meet your next character", width / 2, bannerY + bannerHeight + 28, "600 20px system-ui", "#43311f", width - 40);
      if (reward && !compact) text("Added to your character list", width / 2, bannerY + bannerHeight + 48, "13px system-ui", "#71583c", width - 40);
      const buttonWidth = Math.min(280, width - 48);
      box((width - buttonWidth) / 2, height - 116, buttonWidth, 52, enabled ? "#e4d895" : "#6b796b", focus === "wish" ? "#fff" : "#a38358");
      text(stage !== "idle" ? stage === "charging" ? "Summoning…" : "Character received!" : complete ? "Collection complete" : `Wish · ${cost} currency`, width / 2, height - 83, "600 17px system-ui", "#fff0cc");
      text(complete ? `All ${catalog.length} ${pool === "special" ? "special characters" : "types"} owned.` : error ?? (balance < cost ? `You need ${cost} wish currency to pull.` : "Equal chances among unowned types. No duplicates."), width / 2, height - 32, "12px system-ui", error && !complete ? "#a13725" : "#71583c", width - 40);
      ctx.textAlign = "left";
      box(width - 64, 16, 48, 48, "#e9d4a7", focus === "close" ? "#fff" : "#a38358");
      ctx.strokeStyle = "#fff0cc"; ctx.beginPath(); ctx.moveTo(width - 47, 33); ctx.lineTo(width - 33, 47); ctx.moveTo(width - 33, 33); ctx.lineTo(width - 47, 47); ctx.stroke();
    }
    function animate() { draw(); if (!motion.matches && stage !== "idle") frame = requestAnimationFrame(animate); }
    window.addEventListener("paper-art-ready", draw);
    motion.addEventListener("change", draw);
    if (!motion.matches && stage !== "idle") frame = requestAnimationFrame(animate);
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener("change", draw); window.removeEventListener("paper-art-ready", draw); banner.onload = null; seal.onload = null; };
  }, [balance, reward, error, enabled, focus, wish.isPending, ownedCount, complete, pool, cost, catalog.length, spriteVersion, stage]);


  return <ResponsiveCanvasFrame minHeight={520}><div role="dialog" aria-modal="true" aria-label="Wish for a character" className="paper-menu absolute inset-0 z-30 bg-[#eddbb1]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!wish.isPending) onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <div role="group" aria-label="Wish pool" className="absolute top-28 left-6 flex gap-2">{(["normal", "special"] as const).map((value) => <button key={value} type="button" aria-pressed={pool === value} disabled={wish.isPending || stage !== "idle"} onClick={() => { wish.reset(); setPool(value); }} className={`menu-action cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-wait ${pool === value ? "border-[#e4d895] paper-card bg-[#e4d895] text-[#43311f]" : "border-[#a38358] paper-card bg-[#e9d4a7] text-[#43311f]"}`}>{value === "special" ? "Special · 200" : "Normal · 100"}</button>)}</div>
    <button ref={closeRef} type="button" aria-label="Close wish screen" disabled={wish.isPending} onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close wish screen</span></button>
    <button type="button" disabled={!enabled} onClick={pull} onFocus={() => setFocus("wish")} onBlur={() => setFocus("")} className="absolute bottom-16 left-1/2 h-[52px] w-[min(280px,calc(100%-48px))] -translate-x-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Wish for a random character. Costs {cost} wish currency.</span></button>
    <p role="status" className="sr-only">Wish currency: {balance}. Collection: {ownedCount} of {catalog.length}. {complete ? "Collection complete. Wishing is disabled." : wish.isPending ? "Wishing." : reward ? `Received ${weaponDetails(reward.weapon).label}. Added to your roster.` : "Wish for a character type you do not own."}</p>
    {error && <p role="alert" className="sr-only">{error}</p>}
  </div></ResponsiveCanvasFrame>;
}
