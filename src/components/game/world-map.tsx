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
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const dragged = useRef(false);
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
  function panMap(dx: number, dy: number) {
    viewportRef.current?.scrollBy({ left: dx, top: dy, behavior: "smooth" });
  }
  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;
    const stopWheel = (event: WheelEvent) => event.preventDefault();
    view.addEventListener("wheel", stopWheel, { passive: false });
    return () => view.removeEventListener("wheel", stopWheel);
  }, [garnalandOpen, deepSeaOpen]);

  function closePlaceholder() {
    const target = deepSeaOpen ? deepSeaRef : garnalandRef;
    setGarnalandOpen(false); setDeepSeaOpen(false);
    requestAnimationFrame(() => target.current?.focus());
  }

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    if (viewportRef.current) viewportRef.current.scrollLeft = 2400;
  }, [garnalandOpen, deepSeaOpen]);

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
      ctx.clearRect(0, 0, w, h);
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

  return <ResponsiveCanvasFrame minWidth={0} minHeight={0}><div role="dialog" aria-modal="true" aria-label="World map" className="absolute inset-0 z-30 bg-[#c9b68d]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (!garnalandOpen && !deepSeaOpen) {
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] };
      if (arrows[event.key]) { event.preventDefault(); event.stopPropagation(); panMap(...arrows[event.key]); }
      if ([" ", "PageUp", "PageDown", "Home", "End"].includes(event.key) && !(event.target instanceof HTMLButtonElement)) event.preventDefault();
    }
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
    <div ref={viewportRef} tabIndex={0} aria-label="World map. Drag or use arrow keys and arrow buttons to move." className="absolute inset-0 overflow-hidden overscroll-none cursor-grab select-none active:cursor-grabbing" style={{ touchAction: "none" }} onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const view = event.currentTarget;
      dragged.current = false;
      drag.current = { x: event.clientX, y: event.clientY, left: view.scrollLeft, top: view.scrollTop };
      if (!(event.target as HTMLElement).closest("button")) view.focus({ preventScroll: true });
    }} onPointerMove={(event) => {
      const start = drag.current;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 6) return;
      dragged.current = true;
      const view = event.currentTarget;
      if (!view.hasPointerCapture(event.pointerId)) view.setPointerCapture(event.pointerId);
      const bounds = view.getBoundingClientRect();
      view.scrollLeft = start.left - dx * view.clientWidth / bounds.width;
      view.scrollTop = start.top - dy * view.clientHeight / bounds.height;
    }} onPointerUp={(event) => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onClickCapture={(event) => {
      if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; }
    }}>
    <div className="relative" style={{ width: 2400, height: 1600, backgroundColor: "#83aaa1", backgroundImage: "url('/maps/world-map-medium-v1.png')", backgroundSize: "100% 100%" }}>
    <svg aria-hidden="true" className="hidden" viewBox="0 0 2400 1600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="map-waves" width="90" height="60" patternUnits="userSpaceOnUse"><path d="M12 30q12-8 24 0t24 0" fill="none" stroke="#648c8d" strokeWidth="2" opacity=".3" /></pattern>
        <pattern id="map-trees" width="58" height="64" patternUnits="userSpaceOnUse"><path d="M29 8 13 36h10l-14 16h40L35 36h10Z" fill="#657b52" stroke="#4c6344" strokeWidth="2"/><path d="M29 52v8" stroke="#695238" strokeWidth="3"/></pattern>
      </defs>
      <rect width="2400" height="1600" fill="#94b2ad"/>
      <rect width="2400" height="1600" fill="url(#map-waves)"/>
      <path d="M0 0H1640l-70 170-115 80 25 130-130 90-45 180-170 70-40 150-190 35-60 180-170 40-80 195-200 30-130 170H0Z" fill="#d1c197" stroke="#857b58" strokeWidth="8"/>
      <path d="m0 1250 200-80 170 60 95 140 170 35 90 195H0Z" fill="#c6b889" stroke="#857b58" strokeWidth="6"/>
      <path d="m1600 1120 110-95 150 25 80 120-65 130-170 25-105-90Z M2070 800l85-70 100 45 35 100-110 65-100-40Z" fill="#d1c197" stroke="#857b58" strokeWidth="6"/>
      <path d="M120 130q220 90 320 280t310 160q180-50 340 100" fill="none" stroke="#a9b9a0" strokeWidth="16"/>
      <path d="M120 130q220 90 320 280t310 160q180-50 340 100" fill="none" stroke="#739c9a" strokeWidth="9"/>
      <path d="m90 170 270-70 180 130-80 130-210 30-160-90Z M700 80l300 40 170 140-170 110-270-80Z M180 650l260-100 150 160-100 190-260-20Z" fill="url(#map-trees)" opacity=".8"/>
      <g fill="#a69b78" stroke="#756b50" strokeWidth="4" strokeLinejoin="round">
        <path d="m590 470 65-125 70 125-36-20-34 16-30-20Z"/><path d="m680 490 80-175 90 175-47-33-40 27-39-23Z"/><path d="m800 510 60-120 70 120-35-18-33 11-30-20Z"/>
        <path d="m140 1100 70-140 80 140-40-25-40 20-35-20Z"/><path d="m230 1130 80-180 90 180-45-30-43 22-40-24Z"/>
      </g>
      <g fill="none" stroke="#a3936b" strokeWidth="3" opacity=".45"><path d="M60 50q500 150 1050 0M70 930q240 70 480-20M1610 1410q250 70 410-30"/></g>
      <g transform="translate(2140 1390)" stroke="#6d654f" fill="#e1d0a5"><circle r="68" fill="none" strokeWidth="2"/><path d="M0-90 18-18 70 0 18 18 0 90-18 18-70 0-18-18Z" strokeWidth="3"/><path d="M0-90V90M-70 0H70"/><text y="-105" textAnchor="middle" fill="#6d654f" stroke="none" fontFamily="serif" fontSize="25">N</text></g>
    </svg>
    <div className="absolute right-0 top-0" style={{ width: 960, height: 640 }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <div role="group" aria-label="Destinations">
      {locations.map((location) => <button key={location.id} type="button" aria-pressed={selected === location.id} onClick={() => { store.getState().selectLocation(location.id); onClose(); }} onPointerEnter={() => setFocus(location.id)} onPointerLeave={() => setFocus("")} onFocus={() => setFocus(location.id)} onBlur={() => setFocus("")} className="absolute h-[88px] w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none" style={{ left: `${location.x * 100}%`, top: `${location.y * 100}%` }}><span className="sr-only">{location.name}</span></button>)}
      <button ref={garnalandRef} type="button" disabled={!garnalandUnlocked} onClick={() => setGarnalandOpen(true)} onFocus={() => setFocus("garnaland")} onBlur={() => setFocus("")} aria-label={garnalandUnlocked ? "Garnaland, unlocked, coming soon" : "Garnaland locked. Defeat Demon Prince to unlock"} className="absolute left-1/4 top-[87%] h-[72px] w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Garnaland</span></button>
      <button ref={deepSeaRef} type="button" disabled={!deepSeaUnlocked} onClick={() => setDeepSeaOpen(true)} onFocus={() => setFocus("deep-sea-moth")} onBlur={() => setFocus("")} aria-label={deepSeaUnlocked ? "DeepSea Moot, choose floor" : "DeepSea Moot locked. Obtain Deepsea Moth Map from Fishpeople Guide"} className="absolute left-[80%] top-[90%] h-16 w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">DeepSea Moot</span></button>
    </div>
    </div>
    <p className="absolute left-[560px] top-[850px] font-serif text-3xl italic tracking-widest text-[#71583c]">Uncharted lands</p>
    </div>
    </div>
    <button ref={closeRef} type="button" aria-label="Close map" onClick={onClose} className="absolute top-4 right-4 z-20 size-12 cursor-pointer rounded-xl border border-[#71583c] bg-[#efdfb8] text-2xl text-[#43311f] focus-visible:ring-2 focus-visible:ring-[#805523]">×</button>
    <p className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-176px)] rounded border border-[#a38358] bg-[#efdfb8] px-3 py-2 text-xs text-[#43311f]">Drag to explore - use arrow keys or buttons</p>
    <div role="group" aria-label="Pan world map" className="absolute right-3 bottom-3 z-20 grid grid-cols-3 gap-1">
      {([{ label: "Move map up", icon: String.fromCharCode(8593), dx: 0, dy: -160, col: 2 }, { label: "Move map left", icon: String.fromCharCode(8592), dx: -160, dy: 0, col: 1 }, { label: "Move map down", icon: String.fromCharCode(8595), dx: 0, dy: 160, col: 2 }, { label: "Move map right", icon: String.fromCharCode(8594), dx: 160, dy: 0, col: 3 }]).map((arrow, index) => <button key={arrow.label} type="button" aria-label={arrow.label} onClick={() => panMap(arrow.dx, arrow.dy)} className="size-11 cursor-pointer rounded border border-[#be9962] bg-[#654326] text-xl text-[#fff0cc] shadow hover:bg-[#805a32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe2a1]" style={{ gridColumn: arrow.col, gridRow: index === 0 ? 1 : 2 }}>{arrow.icon}</button>)}
    </div>
    <p role="status" className="sr-only">{selected ? `Selected destination: ${selected}` : "Select Meadow, Forest, Harbor, or Zugwangs Battle Tourney."}</p>
    </>}
  </div></ResponsiveCanvasFrame>;
}