"use client";
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
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, 10); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      function text(value: string, x: number, y: number, font: string, color = "#f1ebce", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      box(left, top, panelWidth, 300, "#102e29", "#708360");
      text("Menu", left + 24, top + 41, "600 22px system-ui");
      box(left + panelWidth - 56, top + 14, 40, 40, "#365642", focus === "close" ? "#fff0b8" : "#708360");
      ctx.strokeStyle = "#f1ebce"; ctx.beginPath(); ctx.moveTo(left + panelWidth - 42, top + 28); ctx.lineTo(left + panelWidth - 30, top + 40); ctx.moveTo(left + panelWidth - 30, top + 28); ctx.lineTo(left + panelWidth - 42, top + 40); ctx.stroke();
      box(left + 20, top + 78, panelWidth - 40, 50, "#365642", focus === "dashboard" ? "#fff0b8" : "#708360");
      box(left + 20, top + 142, panelWidth - 40, 50, "#643e36", focus === "delete" ? "#fff0b8" : "#b47b63");
      ctx.textAlign = "center";
      text("Dashboard", width / 2, top + 109, "600 15px system-ui");
      text(remove.isPending ? "Deleting..." : "Delete account", width / 2, top + 173, "600 15px system-ui", "#ffe4d7");
      text("Removes your character.", width / 2, top + 221, "12px system-ui", "#c1cda9");
      text("Choose a new character afterward.", width / 2, top + 241, "12px system-ui", "#c1cda9");
      ctx.textAlign = "left";
      if (error) text(error, left + 20, top + 278, "12px system-ui", "#ffcebb", panelWidth - 40);
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [focus, error, remove.isPending]);

  return <ResponsiveCanvasFrame><div id="room-menu" role="dialog" aria-modal="true" aria-label="Room menu" className="absolute inset-0 z-30" onKeyDown={(event) => {
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
      <Link href="/dashboard" onFocus={() => setFocus("dashboard")} onBlur={() => setFocus("")} className="absolute top-[78px] right-5 left-5 h-[50px] rounded-xl outline-none"><span className="sr-only">Dashboard</span></Link>
      <button type="button" disabled={remove.isPending || !session.data} onClick={() => remove.mutate()} onFocus={() => setFocus("delete")} onBlur={() => setFocus("")} className="absolute top-[142px] right-5 left-5 h-[50px] cursor-pointer rounded-xl outline-none disabled:cursor-wait"><span className="sr-only">{remove.isPending ? "Deleting character" : "Delete account"}</span></button>
      <p className="sr-only">Removes your character and returns to character creation. Your sign-in is kept.</p>
      {error && <p role="alert" className="sr-only">{error}</p>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
