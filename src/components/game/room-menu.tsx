"use client";
import { drawMenuButton } from "./menu-button";
import { drawPaperPanel } from "./paper-panel";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useDeleteCharacter } from "@/lib/character-api";

export function RoomMenu({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const session = useSession();
  const remove = useDeleteCharacter(session.data?.user.id);
  const [focus, setFocus] = useState("");
  const error = remove.error?.message;

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth, height = canvas.clientHeight, panelWidth = Math.min(360, width - 32);
      const left = (width - panelWidth) / 2, top = (height - 300) / 2;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.scale(ratio, ratio);
      ctx.fillStyle = "#071c18bb"; ctx.fillRect(0, 0, width, height);
      function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
        if (h <= 60) { drawMenuButton(ctx!, x, y, w, h, border === "#fff" || border === "#fff0b8"); return; }
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 10); ctx!.fillStyle = fill; ctx!.fill(); drawPaperPanel(ctx!, x, y, w, h); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      function text(value: string, x: number, y: number, font: string, color = "#43311f", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      box(left, top, panelWidth, 300, "#efdfb8", "#a38358");
      text("Menu", left + 24, top + 41, "600 22px system-ui");
      box(left + panelWidth - 56, top + 14, 40, 40, "#ddc292", focus === "close" ? "#fff0b8" : "#a38358");
      ctx.strokeStyle = "#fff0cc"; ctx.beginPath(); ctx.moveTo(left + panelWidth - 42, top + 28); ctx.lineTo(left + panelWidth - 30, top + 40); ctx.moveTo(left + panelWidth - 30, top + 28); ctx.lineTo(left + panelWidth - 42, top + 40); ctx.stroke();
      box(left + 20, top + 78, panelWidth - 40, 50, "#ddc292", focus === "dashboard" ? "#fff0b8" : "#a38358");
      const danger = ctx.createLinearGradient(0, top + 142, 0, top + 192);
      danger.addColorStop(0, "#b94436"); danger.addColorStop(1, "#76251f");
      ctx.beginPath(); ctx.roundRect(left + 20, top + 142, panelWidth - 40, 50, 6);
      ctx.fillStyle = danger; ctx.fill();
      ctx.strokeStyle = focus === "delete" ? "#ffe2a1" : "#641d18"; ctx.lineWidth = focus === "delete" ? 3 : 2; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(left + 24, top + 146, panelWidth - 48, 42, 3);
      ctx.strokeStyle = "#f1a18b88"; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = "center";
      text("Dashboard", width / 2, top + 109, "600 15px system-ui", "#fff0cc");
      text(remove.isPending ? "Deleting..." : "Delete account", width / 2, top + 173, "600 15px system-ui", "#fff0cc");
      text("Warning: permanently resets your progress.", width / 2, top + 221, "600 12px system-ui", "#a13725", panelWidth - 40);
      text("Your sign-in account is kept. Cannot be undone.", width / 2, top + 241, "12px system-ui", "#a13725", panelWidth - 40);
      ctx.textAlign = "left";
      if (error) text(error, left + 20, top + 278, "12px system-ui", "#a13725", panelWidth - 40);
    }
    window.addEventListener("paper-art-ready", draw);
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => { observer.disconnect(); window.removeEventListener("paper-art-ready", draw); };
  }, [focus, error, remove.isPending]);

  return <ResponsiveCanvasFrame><div id="room-menu" role="dialog" aria-modal="true" aria-label="Room menu" className="paper-menu absolute inset-0 z-30" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!remove.isPending) onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    <div className="absolute top-1/2 left-1/2 h-[300px] w-[min(360px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2">
      <button ref={closeRef} type="button" aria-label="Close menu" disabled={remove.isPending} onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-[14px] right-4 size-10 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close menu</span></button>
      <Link href="/dashboard" onNavigate={onClose} onFocus={() => setFocus("dashboard")} onBlur={() => setFocus("")} className="absolute top-[78px] right-5 left-5 h-[50px] rounded-xl outline-none"><span className="sr-only">Dashboard</span></Link>
      <button type="button" aria-describedby="delete-account-warning" disabled={remove.isPending || !session.data} onClick={() => {
        if (window.confirm("Warning: this permanently deletes your characters and resets your progress, artifacts, gold, and wishes. Your sign-in account is kept. This cannot be undone.\n\nDelete your progress?")) remove.mutate();
      }} onFocus={() => setFocus("delete")} onBlur={() => setFocus("")} className="absolute top-[142px] right-5 left-5 h-[50px] cursor-pointer rounded-xl outline-none disabled:cursor-wait"><span className="sr-only">{remove.isPending ? "Deleting character" : "Delete account"}</span></button>
      <p id="delete-account-warning" className="sr-only">Warning: permanently resets your characters and progress. Your sign-in account is kept. This cannot be undone.</p>
      {error && <p role="alert" className="sr-only">{error}</p>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
