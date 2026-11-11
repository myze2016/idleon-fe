"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCharacter } from "./character-design";

import { useEffect, useRef, useState } from "react";
import { roomToolbarLayout } from "./room-toolbar-layout";
import { useGameState, useGameStoreApi } from "./game-store";
import { weaponDetails, type Character, type AccountProgress } from "@/lib/character";
import { WorldMap } from "./world-map";
import { CharacterRoster } from "./character-roster";
import { TeamScreen } from "./team-screen";
import { RoomMenu } from "./room-menu";
import { WishScreen } from "./wish-screen";
import { CollectionPanel } from "./collection-panel";

const movementKeys = new Set(["KeyA", "KeyD", "KeyW", "KeyS", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export function RoomCanvas({ character, characters, gold, progression }: { character: Character; characters: Character[]; gold: number; progression: AccountProgress }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toolbar, setToolbar] = useState(() => roomToolbarLayout(960));
  const store = useGameStoreApi();
  const menuOpen = useGameState((state) => state.isPaused);
  const mapOpen = useGameState((state) => state.isMapOpen);
  const activePanel = useGameState((state) => state.activePanel);
  const selectedLocation = useGameState((state) => state.selectedLocation);
  const input = useRef(new Set<string>());
  const focus = useRef("");
  const destination = useRef<{ x: number; y: number } | null>(null);
  const goldRef = useRef(gold);
  const progressionRef = useRef(progression);
  useEffect(() => { progressionRef.current = progression; }, [progression]);
  useEffect(() => { goldRef.current = gold; }, [gold]);

  function toggleMenu() {
    input.current.clear(); destination.current = null;
    store.getState().togglePause();
    if (!store.getState().isPaused) canvasRef.current?.focus({ preventScroll: true });
  }

  function togglePanel(panel: "character" | "wish" | "team" | "shop" | "artifacts") {
    input.current.clear(); destination.current = null;
    store.getState().togglePanel(panel);
    if (!store.getState().activePanel) canvasRef.current?.focus({ preventScroll: true });
  }

  function roomAction(action: "map" | "start") {
    input.current.clear(); destination.current = null;
    if (action === "map") store.getState().toggleMap();
    else store.getState().startRoom();
    if (action === "start") canvasRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const player = { x: 0.5, y: 0.7, facing: 1 };
    let width = 0, height = 0, ratio = 1, last = 0, frame = 0;
    function resize() {
      if (!canvas) return;
      width = canvas.clientWidth; height = canvas.clientHeight;
      setToolbar(roomToolbarLayout(width));
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    function clear() { input.current.clear(); destination.current = null; }
    function keyDown(event: KeyboardEvent) {
      if (event.code === "Escape") {
        clear();
        store.getState().startRoom(); canvas?.focus({ preventScroll: true });
        return;
      }
      if (document.activeElement !== canvas || !movementKeys.has(event.code)) return;
      event.preventDefault();
      if (!store.getState().isPaused && !store.getState().isMapOpen && !store.getState().activePanel) { input.current.add(event.code); destination.current = null; }
    }
    function keyUp(event: KeyboardEvent) { input.current.delete(event.code); }
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clear); document.addEventListener("visibilitychange", clear);
    canvas.addEventListener("blur", clear);
    canvas.focus({ preventScroll: true });

    function box(x: number, y: number, w: number, h: number, fill: string, border?: string, radius = 0) {
      ctx!.beginPath(); ctx!.roundRect(x, y, w, h, radius); ctx!.fillStyle = fill; ctx!.fill();
      if (border) { ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke(); }
    }
    function text(value: string, x: number, y: number, font: string, color: string, maxWidth?: number) {
      ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
    }

    function draw(time: number) {
      if (!ctx || !canvas || !width || !height) { frame = requestAnimationFrame(draw); return; }
      const dt = Math.min((time - (last || time)) / 1000, 0.04); last = time;
      const wall = height * 0.38;
      const pad = Math.min(40, width * 0.08);
      const minY = wall + 40, maxY = Math.max(minY, height - 30);
      const speed = Math.min(width, height) * 0.4;
      if (!store.getState().isPaused && !store.getState().isMapOpen && !store.getState().activePanel && !document.hidden) {
        let dx = Number(input.current.has("KeyD") || input.current.has("ArrowRight")) - Number(input.current.has("KeyA") || input.current.has("ArrowLeft"));
        let dy = Number(input.current.has("KeyS") || input.current.has("ArrowDown")) - Number(input.current.has("KeyW") || input.current.has("ArrowUp"));
        const target = destination.current;
        if (!dx && !dy && target) {
          dx = target.x * width - player.x * width; dy = target.y * height - player.y * height;
          if (Math.hypot(dx, dy) <= speed * dt) { player.x = target.x; player.y = target.y; destination.current = null; dx = 0; dy = 0; }
        }
        const length = Math.hypot(dx, dy);
        if (length) { player.x += dx / length * speed * dt / width; player.y += dy / length * speed * dt / height; if (dx) player.facing = Math.sign(dx); }
      }
      player.x = Math.max(pad / width, Math.min(1 - pad / width, player.x));
      player.y = Math.max(minY / height, Math.min(maxY / height, player.y));

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const light = ctx.createLinearGradient(0, 0, 0, wall);
      light.addColorStop(0, "#193d35"); light.addColorStop(1, "#31574a");
      ctx.fillStyle = light; ctx.fillRect(0, 0, width, wall);
      for (let x = 24; x < width; x += 90) box(x, 0, 3, wall, "#15392f");
      box(0, wall, width, height - wall, "#8a6e4d");
      for (let y = wall; y < height; y += 48) {
        box(0, y, width, 2, "#68533d");
        for (let x = ((Math.floor((y - wall) / 48) % 2) * 90); x < width; x += 180) box(x, y, 2, Math.min(48, height - y), "#715a40");
      }
      box(0, wall - 14, width, 18, "#1b332a", "#506748");
      // Furnishings remain against the wall, leaving a clear floor to explore.
      const scale = Math.min(width / 800, height / 500, 1.3);
      ctx.save(); ctx.translate(width * 0.2, wall - 14); ctx.scale(scale, scale);
      box(-60, -136, 120, 110, "#8d7752", "#bba273", 4);
      box(-48, -124, 96, 86, "#86afa3");
      ctx.fillStyle = "#e5d9a3"; ctx.beginPath(); ctx.arc(22, -99, 16, 0, Math.PI * 2); ctx.fill();
      box(-4, -124, 8, 86, "#8d7752"); box(-48, -85, 96, 7, "#8d7752");
      ctx.restore();
      ctx.save(); ctx.translate(width * 0.76, wall - 10); ctx.scale(scale, scale);
      box(-50, -126, 100, 126, "#142a25", "#877456", 8);
      box(-39, -113, 78, 113, "#654e36", "#92774f", 4);
      box(23, -51, 6, 6, "#e7c67e", undefined, 3); ctx.restore();
      ctx.save(); ctx.translate(width * 0.48, wall - 8); ctx.scale(scale, scale);
      box(-52, -66, 104, 22, "#9b7d52", "#4d4031", 3);
      box(-46, -44, 9, 44, "#4d4031"); box(37, -44, 9, 44, "#4d4031");
      box(-31, -77, 35, 10, "#b9bd93", "#455741", 2);
      box(17, -88, 15, 22, "#bf9566", undefined, 3); ctx.restore();
      box(width * 0.27, wall + (height - wall) * 0.3, width * 0.46, (height - wall) * 0.46, "#536c56", "#c3ae78", 10);
      box(width * 0.29, wall + (height - wall) * 0.3 + 10, width * 0.42, Math.max(4, (height - wall) * 0.46 - 20), "#61765a", "#94a17a", 6);

      const px = player.x * width, py = player.y * height;
      const avatarScale = Math.max(1, Math.min(2, Math.min(width, height) / 320));
      ctx.save(); ctx.translate(px, py); ctx.scale(avatarScale, avatarScale);
      drawCharacter(ctx, character.weapon, { facing: player.facing }); ctx.restore();
      // HUD is rendered in screen coordinates, keeping both corners anchored on resize.
      const controls = roomToolbarLayout(width);
      const nameWidth = Math.max(70, Math.min(300, width >= 950 ? controls[0].x - 32 : width - 32));
      box(16, 16, nameWidth, 62, "#102c26e8", "#708360", 10);
      text(character.name, 30, 42, "600 17px system-ui", "#f1ebce", nameWidth - 28);
      text(weaponDetails(character.weapon).label, 30, 62, "12px system-ui", "#c1cda9", nameWidth - 28);
      box(16, 86, nameWidth, 32, "#e4d895", "#b8a76d", 8);
      text("Id-leon City", 30, 107, "600 12px system-ui", "#19392d", nameWidth - 28);
      const progress = progressionRef.current;
      const progressWidth = Math.max(100, Math.min(200, width - 176));
      box(16, height - 126, progressWidth, 110, "#102c26ed", "#b8a76d", 10);
      text(`Gold: ${goldRef.current}`, 30, height - 100, "600 15px system-ui", "#e4d895", progressWidth - 28);
      text(`Account Lv. ${progress.level}`, 30, height - 76, "600 14px system-ui", "#f1ebce", progressWidth - 28);
      text(`EXP: ${progress.exp}/${progress.expToNextLevel}`, 30, height - 52, "12px system-ui", "#c1cda9", progressWidth - 28);
      box(30, height - 38, progressWidth - 28, 6, "#365642", undefined, 3);
      if (progress.exp > 0) box(30, height - 38, (progressWidth - 28) * progress.exp / progress.expToNextLevel, 6, "#d7c981", undefined, 3);
      for (const control of controls) {
        const label = control.id === "menu" && store.getState().isPaused ? "Close" : control.label;
        box(control.x, control.y, control.width, control.height, "#102c26e8", focus.current === control.id || store.getState().activePanel === control.id ? "#fff0b8" : "#708360", 10);
        ctx.textAlign = "center"; text(label, control.x + control.width / 2, control.y + 29, `600 ${control.width < 90 ? 12 : 14}px system-ui`, "#f1ebce"); ctx.textAlign = "left";
      }
      box(width - 144, height - 160, 128, 48, "#102c26ed", focus.current === "map" || store.getState().isMapOpen ? "#fff0b8" : "#708360", 10);
      box(width - 144, height - 108, 128, 28, "#102c26ed", undefined, 6);
      box(width - 144, height - 68, 128, 52, "#e4d895", focus.current === "start" ? "#ffffff" : "#b8a76d", 10);
      ctx.textAlign = "center";
      text("Map", width - 80, height - 130, "600 15px system-ui", "#f1ebce");
      text(store.getState().selectedLocation === "meadow" ? "Meadow" : "Forest", width - 80, height - 89, "600 12px system-ui", "#dbe4ad");
      text("Start", width - 80, height - 35, "700 17px system-ui", "#19392d");
      ctx.textAlign = "left";
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); clear();
      window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", clear);
      canvas.removeEventListener("blur", clear);
    };
  }, [character, store]);

  return <ResponsiveCanvasFrame overlay={false} minHeight={420} narrowMinHeight={520}><div className="relative h-full w-full overflow-hidden bg-[#193d35]">
    <div inert={menuOpen || mapOpen || activePanel !== null} className="h-full w-full">
    <canvas ref={canvasRef} tabIndex={0} aria-label={`${character.name}'s room`} aria-describedby="room-controls" className="block h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#dbe4ad]" onPointerDown={(event) => {
      if (store.getState().isPaused || store.getState().isMapOpen || store.getState().activePanel) return;
      event.currentTarget.focus({ preventScroll: true });
      const bounds = event.currentTarget.getBoundingClientRect();
      const y = (event.clientY - bounds.top) / bounds.height;
      if (y > 0.38) {
        const pad = Math.min(40, bounds.width * 0.08) / bounds.width;
        destination.current = {
          x: Math.max(pad, Math.min(1 - pad, (event.clientX - bounds.left) / bounds.width)),
          y: Math.max(0.38 + 40 / bounds.height, Math.min(1 - 30 / bounds.height, y)),
        };
      }
    }}>Your browser needs canvas support to display your room.</canvas>
    <p id="room-controls" className="sr-only">Move with WASD or arrow keys, or click or tap the floor to walk. Open Menu to pause. Press Escape to close the menu.</p>
    <p className="sr-only">{character.name}, {weaponDetails(character.weapon).label}. Room location: Id-leon City.</p>
    <p role="status" className="sr-only">Account level {progression.level}. EXP {progression.exp} of {progression.expToNextLevel}. Total EXP {progression.totalExp}. Gold {gold}.</p>
    <p role="status" className="sr-only">Selected location: {selectedLocation === "meadow" ? "Meadow" : "Forest"}</p>
    <button type="button" aria-label="Map" aria-expanded={mapOpen} onClick={() => roomAction("map")} onFocus={() => { focus.current = "map"; }} onBlur={() => { focus.current = ""; }} className="absolute right-4 bottom-[112px] h-12 w-32 cursor-pointer rounded-[10px] outline-none"><span className="sr-only">Map</span></button>
    <button type="button" onClick={() => store.getState().startExploring(characters.find((member) => member.isStarter) ?? character)} onFocus={() => { focus.current = "start"; }} onBlur={() => { focus.current = ""; }} className="absolute right-4 bottom-4 h-[52px] w-32 cursor-pointer rounded-[10px] outline-none"><span className="sr-only">Start</span></button>
    {toolbar.map((control) => <button key={control.id} type="button" aria-label={control.label} aria-expanded={control.id === "menu" ? menuOpen : activePanel === control.id} onClick={() => control.id === "menu" ? toggleMenu() : togglePanel(control.id)} onFocus={() => { focus.current = control.id; }} onBlur={() => { focus.current = ""; }} className="absolute cursor-pointer rounded-[10px] outline-none" style={{ left: control.x, top: control.y, width: control.width, height: control.height }}><span className="sr-only">{control.label}</span></button>)}
    </div>
    {mapOpen && <WorldMap onClose={() => roomAction("start")} />}
    {menuOpen && <RoomMenu onClose={() => roomAction("start")} />}
    {activePanel === "character" && <CharacterRoster characters={characters} onClose={() => roomAction("start")} />}
    {activePanel === "team" && <TeamScreen characters={characters} onClose={() => roomAction("start")} />}
    {activePanel === "wish" && <WishScreen onClose={() => roomAction("start")} />}
    {(activePanel === "shop" || activePanel === "artifacts") && <CollectionPanel title={activePanel === "shop" ? "Shop" : "Artifacts"} onClose={() => roomAction("start")} />}
  </div></ResponsiveCanvasFrame>;
}
