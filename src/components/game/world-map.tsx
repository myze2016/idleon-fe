"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

import { useEffect, useRef, useState } from "react";
import { useGameState, useGameStoreApi } from "./game-store";

const locations = [
  { id: "meadow", name: "Meadow", x: 0.29, y: 0.65 },
  { id: "forest", name: "Forest", x: 0.71, y: 0.39 },
] as const;

export function WorldMap({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selected = useGameState((state) => state.selectedLocation);
  const store = useGameStoreApi();
  const [focus, setFocus] = useState("");

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#c5c695"; ctx.fillRect(0, 0, w, h);
      // Soft land contours and a river give the locations a shared world.
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? "#a3b17d" : "#b0bc84";
        ctx.beginPath(); ctx.ellipse(w * (0.12 + i * 0.18), h * (0.5 + Math.sin(i) * 0.2), w * 0.22, h * 0.35, i * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "#719e9c"; ctx.lineWidth = Math.max(18, w * 0.028); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.bezierCurveTo(w * 0.3, h * 0.3, w * 0.73, h * 0.55, w * 0.5, h); ctx.stroke();
      ctx.strokeStyle = "#e4d4a0"; ctx.lineWidth = 8; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(w * 0.29, h * 0.65); ctx.bezierCurveTo(w * 0.42, h * 0.75, w * 0.52, h * 0.3, w * 0.71, h * 0.39); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 32; i++) {
        const x = w * (0.55 + ((i * 37) % 41) / 100), y = h * (0.18 + ((i * 17) % 41) / 100);
        ctx.fillStyle = i % 2 ? "#365f43" : "#466d49";
        ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 12, y + 9); ctx.lineTo(x - 12, y + 9); ctx.closePath(); ctx.fill();
      }
      for (let i = 0; i < 24; i++) {
        const x = w * (0.08 + ((i * 13) % 37) / 100), y = h * (0.49 + ((i * 19) % 39) / 100);
        ctx.fillStyle = i % 2 ? "#f3e2a6" : "#e3c3af"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
      function box(x: number, y: number, width: number, height: number, fill: string, border: string) {
        ctx!.beginPath(); ctx!.roundRect(x, y, width, height, 12); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      ctx.fillStyle = "#183c30"; ctx.font = "600 28px system-ui"; ctx.fillText("World map", 24, 49);
      ctx.font = "13px system-ui"; ctx.fillText("Choose your destination", 24, 74);
      locations.forEach((location) => {
        const x = w * location.x, y = h * location.y, active = selected === location.id;
        box(x - 64, y - 44, 128, 88, active ? "#375940" : "#163a30ed", focus === location.id ? "#fff" : active ? "#fff0b8" : "#a8b68a");
        ctx.textAlign = "center"; ctx.fillStyle = "#f1ebce"; ctx.font = "600 18px system-ui"; ctx.fillText(location.name, x, y - 2);
        ctx.font = "11px system-ui"; ctx.fillStyle = "#d8dfb9"; ctx.fillText(active ? "Selected" : "Select location", x, y + 23); ctx.textAlign = "left";
      });
      box(w - 64, 16, 48, 48, "#163a30", focus === "close" ? "#fff" : "#a8b68a");
      ctx.strokeStyle = "#f1ebce"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w - 47, 33); ctx.lineTo(w - 33, 47); ctx.moveTo(w - 33, 33); ctx.lineTo(w - 47, 47); ctx.stroke();
      ctx.fillStyle = "#183c30"; ctx.font = "600 13px system-ui";
      ctx.fillText(selected ? `Destination: ${selected === "meadow" ? "Meadow" : "Forest"}` : "Select Meadow or Forest", 24, h - 24);
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [selected, focus]);

  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-label="World map" className="absolute inset-0 z-30 bg-[#c5c695]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label="Close map" onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close map</span></button>
    <div role="group" aria-label="Destinations">
      {locations.map((location) => <button key={location.id} type="button" aria-pressed={selected === location.id} onClick={() => store.getState().selectLocation(location.id)} onFocus={() => setFocus(location.id)} onBlur={() => setFocus("")} className="absolute h-[88px] w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none" style={{ left: `${location.x * 100}%`, top: `${location.y * 100}%` }}><span className="sr-only">{location.name}</span></button>)}
    </div>
    <p role="status" className="sr-only">{selected ? `Selected destination: ${selected}` : "Select Meadow or Forest."}</p>
  </div></ResponsiveCanvasFrame>;
}
