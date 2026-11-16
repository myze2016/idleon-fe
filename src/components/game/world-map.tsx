"use client";
import { drawPaperPanel } from "./paper-panel";
import { drawRpgButton } from "./rpg-button";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

import { useEffect, useRef, useState } from "react";
import { useGameState, useGameStoreApi } from "./game-store";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";

const locations = [
  { id: "meadow", name: "Meadow", x: 0.29, y: 0.65 },
  { id: "tourney", name: "Zugwangs Battle Tourney", x: 0.27, y: 0.30 },
  { id: "harbor", name: "Harbor", x: 0.72, y: 0.76 },
  { id: "forest", name: "Forest", x: 0.71, y: 0.39 },
] as const;

export function WorldMap({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selected = useGameState((state) => state.selectedLocation);
  const store = useGameStoreApi();
  const [focus, setFocus] = useState("");
  const [garnalandOpen, setGarnalandOpen] = useState(false);
  const [deepSeaOpen, setDeepSeaOpen] = useState(false);
  const session = useSession();
  const character = useCharacter(session.data?.user.id);
  const garnalandUnlocked = character.data?.garnalandUnlocked === true;
  const deepSeaUnlocked = character.data?.deepSeaMothUnlocked === true;
  const deepSeaRef = useRef<HTMLButtonElement>(null);
  const garnalandRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (garnalandOpen || deepSeaOpen) backRef.current?.focus(); }, [garnalandOpen, deepSeaOpen]);
  function closePlaceholder() {
    const target = deepSeaOpen ? deepSeaRef : garnalandRef;
    setGarnalandOpen(false); setDeepSeaOpen(false);
    requestAnimationFrame(() => target.current?.focus());
  }

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const mapArtwork = new Image();
    const buttonIcons = new Image();
    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#c9b68d"; ctx.fillRect(0, 0, w, h);
      if (mapArtwork.complete && mapArtwork.naturalWidth > 0) ctx.drawImage(mapArtwork, 0, 0, w, h);
      function box(x: number, y: number, width: number, height: number, fill: string, border: string) {
        ctx!.save();
        ctx!.globalAlpha = fill === "#626853" || fill === "#52696c" ? 0.82 : 1;
        drawPaperPanel(ctx!, x, y, width, height);
        if (border === "#fff" || border === "#fff0b8") {
          ctx!.beginPath(); ctx!.roundRect(x - 2, y - 2, width + 4, height + 4, 8);
          ctx!.strokeStyle = "#ffe4a0"; ctx!.lineWidth = 3; ctx!.stroke();
        }
        ctx!.restore();
      }
      ctx.fillStyle = "#49351f"; ctx.font = "600 28px system-ui"; ctx.fillText("World map", 24, 49);
      ctx.font = "13px system-ui"; ctx.fillText("Choose your destination", 24, 74);
      function dottedRoute(start: [number, number], control: [number, number], end: [number, number], color: string) {
        ctx!.fillStyle = color;
        for (let dot = 0; dot <= 22; dot++) {
          const t = dot / 22, u = 1 - t;
          const x = (u * u * start[0] + 2 * u * t * control[0] + t * t * end[0]) * w;
          const y = (u * u * start[1] + 2 * u * t * control[1] + t * t * end[1]) * h;
          ctx!.beginPath(); ctx!.arc(x, y, 2.5, 0, Math.PI * 2); ctx!.fill();
        }
      }
      dottedRoute([0.29, 0.65], [0.13, 0.77], [0.25, 0.87], garnalandUnlocked ? "#f3dfaa" : "#7e8465");
      dottedRoute([0.72, 0.76], [0.98, 0.77], [0.80, 0.90], deepSeaUnlocked ? "#d9f3ed" : "#a5c8c5");
      locations.forEach((location) => {
        const x = w * location.x, y = h * location.y, active = selected === location.id;
        box(x - 64, y - 44, 128, 88, active ? "#375940" : "#163a30ed", focus === location.id ? "#fff" : active ? "#fff0b8" : "#a8b68a");
        ctx.textAlign = "center"; ctx.fillStyle = "#43311f"; ctx.font = "600 18px system-ui";
        if (location.id === "tourney") {
          ctx.font = "600 14px system-ui"; ctx.fillText("Zugwangs", x, y - 16); ctx.fillText("Battle Tourney", x, y + 2);
        } else ctx.fillText(location.name, x, y - 2, 116);
        ctx.font = "11px system-ui"; ctx.fillStyle = "#6b533a"; ctx.fillText(active ? "Selected" : "Select location", x, y + 23); ctx.textAlign = "left";
      });
      box(w * 0.25 - 64, h * 0.87 - 36, 128, 72, garnalandUnlocked ? "#435b46" : "#626853", focus === "garnaland" ? "#fff" : garnalandUnlocked ? "#e4d895" : "#92967a");
      ctx.textAlign = "center"; ctx.fillStyle = "#43311f"; ctx.font = "600 16px system-ui"; ctx.fillText("Garnaland", w * 0.25, h * 0.87 - 4);
      ctx.font = "11px system-ui"; ctx.fillText(garnalandUnlocked ? "Unlocked · Coming soon" : "Defeat Demon Prince", w * 0.25, h * 0.87 + 18, 116); ctx.textAlign = "left";
      box(w * 0.80 - 64, h * 0.90 - 32, 128, 64, deepSeaUnlocked ? "#214a59" : "#52696c", focus === "deep-sea-moth" ? "#fff" : deepSeaUnlocked ? "#a9e5ed" : "#929f99");
      ctx.textAlign = "center"; ctx.fillStyle = "#43311f"; ctx.font = "600 15px system-ui"; ctx.fillText("DeepSea Moot", w * 0.80, h * 0.90 - 3, 116);
      ctx.font = "10px system-ui"; ctx.fillText(deepSeaUnlocked ? "Choose floor" : "Find Deepsea Moth Map", w * 0.80, h * 0.90 + 16, 116); ctx.textAlign = "left";
      drawRpgButton(ctx, buttonIcons, "close", "Close", w - 64, 16, 48, 48, focus === "close");
      ctx.fillStyle = "#49351f"; ctx.font = "600 13px system-ui";
      ctx.fillText(selected ? `Destination: ${selected.startsWith("deepsea") ? "DeepSea Moot" : selected === "tourney" ? "Zugwangs Battle Tourney" : selected === "harbor" ? "Harbor" : selected === "meadow" ? "Meadow" : "Forest"}` : "Select Meadow, Forest, Harbor, or Zugwangs Battle Tourney", 24, h - 24);
    }
    mapArtwork.onload = draw; mapArtwork.src = "/maps/world-map-painted-v1.png";
    buttonIcons.onload = draw; buttonIcons.src = "/ui/adventure-button-icons-v2.png";
    window.addEventListener("paper-art-ready", draw);
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => { observer.disconnect(); window.removeEventListener("paper-art-ready", draw); mapArtwork.onload = null; buttonIcons.onload = null; };
  }, [selected, focus, garnalandUnlocked, garnalandOpen, deepSeaUnlocked, deepSeaOpen]);

  return <ResponsiveCanvasFrame minHeight={560}><div role="dialog" aria-modal="true" aria-label="World map" className="absolute inset-0 z-30 bg-[#c9b68d]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    {garnalandOpen || deepSeaOpen ? <div role="dialog" aria-modal="true" aria-labelledby="placeholder-title" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-[#3e3024] p-8 text-center text-[#f1ebce]" onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePlaceholder(); }
    }}>
      <span aria-hidden="true" className="text-5xl text-[#e4d895]">✦</span>
      <h2 id="placeholder-title" className="font-serif text-3xl">{deepSeaOpen ? "DeepSea Moot" : "Garnaland"}</h2>
      <p className="max-w-sm text-[#c1cda9]">{deepSeaOpen ? "Follow the Deepsea Moth Map into the underwater stronghold. Choose your floor, then press Start in the room." : "The Demon Prince has fallen. The way to Garnaland is open."}</p>
      {deepSeaOpen ? <div role="group" aria-label="DeepSea Moot floors" className="flex w-full max-w-sm flex-col gap-3">
        {([
          { id: "deepsea", floor: 1, name: "DeepSea Moot", requirement: "Deepsea Moth Map" },
          { id: "deepsea-2f", floor: 2, name: "DeepSea Moot 2F", requirement: "Defeat Fishpeople Guardian" },
          { id: "deepsea-palace", floor: 3, name: "Royal Palace", requirement: "Defeat Fishpeople Researcher" },
        ] as const).map((floor) => <button key={floor.id} type="button" disabled={!deepSeaUnlocked || (character.data?.deepSeaFloor ?? 1) < floor.floor} onClick={() => { store.getState().selectLocation(floor.id); onClose(); }} className="cursor-pointer rounded-xl border border-[#89b9bc] bg-[#214a59] px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8] disabled:cursor-default disabled:opacity-50">
          <span className="block font-semibold">{floor.name}</span><span className="text-xs text-[#c1cda9]">{(character.data?.deepSeaFloor ?? 1) >= floor.floor ? "Select floor" : floor.requirement}</span>
        </button>)}
      </div> : <p className="text-sm text-[#e4d895]">Coming soon — this location is a placeholder.</p>}
      <button ref={backRef} type="button" onClick={closePlaceholder} className="cursor-pointer rounded-xl border border-[#b8a76d] bg-[#654e35] px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]">Back to world map</button>
    </div> : <>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label="Close map" onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close map</span></button>
    <div role="group" aria-label="Destinations">
      {locations.map((location) => <button key={location.id} type="button" aria-pressed={selected === location.id} onClick={() => store.getState().selectLocation(location.id)} onPointerEnter={() => setFocus(location.id)} onPointerLeave={() => setFocus("")} onFocus={() => setFocus(location.id)} onBlur={() => setFocus("")} className="absolute h-[88px] w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none" style={{ left: `${location.x * 100}%`, top: `${location.y * 100}%` }}><span className="sr-only">{location.name}</span></button>)}
      <button ref={garnalandRef} type="button" disabled={!garnalandUnlocked} onClick={() => setGarnalandOpen(true)} onFocus={() => setFocus("garnaland")} onBlur={() => setFocus("")} aria-label={garnalandUnlocked ? "Garnaland, unlocked, coming soon" : "Garnaland locked. Defeat Demon Prince to unlock"} className="absolute left-1/4 top-[87%] h-[72px] w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Garnaland</span></button>
      <button ref={deepSeaRef} type="button" disabled={!deepSeaUnlocked} onClick={() => setDeepSeaOpen(true)} onFocus={() => setFocus("deep-sea-moth")} onBlur={() => setFocus("")} aria-label={deepSeaUnlocked ? "DeepSea Moot, choose floor" : "DeepSea Moot locked. Obtain Deepsea Moth Map from Fishpeople Guide"} className="absolute left-[80%] top-[90%] h-16 w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">DeepSea Moot</span></button>
    </div>
    <p role="status" className="sr-only">{selected ? `Selected destination: ${selected}` : "Select Meadow, Forest, Harbor, or Zugwangs Battle Tourney."}</p>
    </>}
  </div></ResponsiveCanvasFrame>;
}
