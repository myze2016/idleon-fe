"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCabinFireplace } from "./cabin-fireplace";
import { drawMenuInfo } from "./menu-button";
import { drawRpgButton } from "./rpg-button";
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
import { InventoryPanel } from "./inventory-panel";
import { WikiPanel } from "./wiki-panel";
import { PvpPanel } from "./pvp-panel";
import { DonationPanel } from "./donation-panel";
import { PatchNotesPanel } from "./patch-notes-panel";

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
  const charactersRef = useRef(characters);
  useEffect(() => { charactersRef.current = characters; }, [characters]);
  const goldRef = useRef(gold);
  const progressionRef = useRef(progression);
  useEffect(() => { progressionRef.current = progression; }, [progression]);
  useEffect(() => { goldRef.current = gold; }, [gold]);

  function toggleMenu() {
    input.current.clear(); destination.current = null;
    store.getState().togglePause();
    if (!store.getState().isPaused) canvasRef.current?.focus({ preventScroll: true });
  }

  function togglePanel(panel: "character" | "wish" | "team" | "shop" | "artifacts" | "inventory" | "wiki" | "pvp" | "donation" | "patch-notes") {
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

    const buttonIcons = new Image();
    buttonIcons.src = "/ui/adventure-button-icons-v2.png";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const roomArtwork = new Image();
    roomArtwork.src = "/room/cozy-cabin-v5.png";

    const player = { x: 0.5, y: 0.7, facing: 1 };
    let width = 0, height = 0, ratio = 1, last = 0, frame = 0;
    let idleClock = 0, idleBlend = 0;
    let trailKey = "";
    const trail: { x: number; y: number; facing: number }[] = [];
    function resize() {
      if (!canvas) return;
      width = canvas.clientWidth; height = canvas.clientHeight;
      trail.length = 0;
      setToolbar(roomToolbarLayout(width, height));
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
      const savedTeam = store.getState().teamSlots.filter((member): member is Character => !!member)
        .map((member) => charactersRef.current.find((owned) => member.id && owned.id === member.id) ?? member);
      const roomTeam = savedTeam.length ? savedTeam : [character];
      const leader = roomTeam[0];
      const partyScale = Math.max(0.5, Math.min(2, Math.min(width, height) / 420, (width - 40) / (roomTeam.length * 52)));
      const spacing = Math.min(62 * partyScale, (width - 64) / Math.max(1, roomTeam.length - 1));
      const pad = 24;
      const teamKey = roomTeam.map((member) => member.id ?? member.weapon).join(":");
      if (!trail.length || trailKey !== teamKey) {
        trailKey = teamKey; trail.length = 0;
        player.x = Math.min(1 - pad / width, Math.max(player.x, (pad + (roomTeam.length - 1) * spacing) / width));
        for (let index = 0; index < roomTeam.length + 1; index++) {
          trail.push({ x: Math.max(pad / width, player.x - index * spacing / width), y: player.y, facing: 1 });
        }
      }
      const minY = wall + 40;
      const maxY = Math.max(minY, height - 30);
      const speed = Math.min(width, height) * 0.4;
      let playerMoving = false;
      if (!store.getState().isPaused && !store.getState().isMapOpen && !store.getState().activePanel && !document.hidden) {
        let dx = Number(input.current.has("KeyD") || input.current.has("ArrowRight")) - Number(input.current.has("KeyA") || input.current.has("ArrowLeft"));
        let dy = Number(input.current.has("KeyS") || input.current.has("ArrowDown")) - Number(input.current.has("KeyW") || input.current.has("ArrowUp"));
        const target = destination.current;
        if (!dx && !dy && target) {
          dx = target.x * width - player.x * width; dy = target.y * height - player.y * height;
          if (Math.hypot(dx, dy) <= speed * dt) { player.x = target.x; player.y = target.y; destination.current = null; dx = 0; dy = 0; }
        }
        const length = Math.hypot(dx, dy);
        if (length) {
          playerMoving = true;
          player.x += dx / length * speed * dt / width; player.y += dy / length * speed * dt / height;
          if (dx) player.facing = Math.sign(dx);
        }
      }
      player.x = Math.max(pad / width, Math.min(1 - pad / width, player.x));
      player.y = Math.max(minY / height, Math.min(maxY / height, player.y));

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Render wall and floor separately so the horizon remains aligned with
      // the walkable area at every canvas aspect ratio, without cropping props.
      ctx.fillStyle = "#59432f"; ctx.fillRect(0, 0, width, wall);
      ctx.fillStyle = "#654a32"; ctx.fillRect(0, wall, width, height - wall);
      if (roomArtwork.complete && roomArtwork.naturalWidth > 0) {
        const horizon = Math.round(roomArtwork.naturalHeight * 0.51);
        ctx.drawImage(roomArtwork, 0, 0, roomArtwork.naturalWidth, horizon, 0, 0, width, wall);
        ctx.drawImage(roomArtwork, 0, horizon, roomArtwork.naturalWidth, roomArtwork.naturalHeight - horizon,
          0, wall, width, height - wall);
      }
      if (roomArtwork.complete && roomArtwork.naturalWidth > 0) {
        drawCabinFireplace(ctx, width, wall, reducedMotion.matches ? 0 : time);
      }
      const px = player.x * width, py = player.y * height;
      const avatarScale = partyScale;
      const stride = playerMoving ? Math.sin(time / 190) : 0;
      const idleEnabled = !reducedMotion.matches && !document.hidden && !store.getState().isPaused && !store.getState().isMapOpen && !store.getState().activePanel;
      if (idleEnabled) idleClock += dt;
      idleBlend += ((playerMoving || !idleEnabled ? 0 : 1) - idleBlend) * Math.min(1, dt * 8);
      const idle = reducedMotion.matches ? 0 : Math.sin(idleClock * 2.2) * idleBlend;
      // Each follower occupies an earlier point on the leader's path.
      if (Math.hypot((player.x - trail[0].x) * width, (player.y - trail[0].y) * height) > 0.5) {
        trail.unshift({ x: player.x, y: player.y, facing: player.facing });
      }
      let covered = 0;
      for (let index = 1; index < trail.length; index++) {
        covered += Math.hypot((trail[index - 1].x - trail[index].x) * width, (trail[index - 1].y - trail[index].y) * height);
        if (covered > roomTeam.length * spacing + 40) { trail.length = index + 1; break; }
      }
      const party = roomTeam.map((member, index) => {
        let remaining = index * spacing;
        for (let point = 1; point < trail.length; point++) {
          const newer = trail[point - 1], older = trail[point];
          const length = Math.hypot((newer.x - older.x) * width, (newer.y - older.y) * height);
          if (remaining <= length && length > 0) {
            const fraction = remaining / length;
            return { member, index, x: (newer.x + (older.x - newer.x) * fraction) * width,
              y: (newer.y + (older.y - newer.y) * fraction) * height, facing: newer.facing };
          }
          remaining -= length;
        }
        const end = trail[trail.length - 1];
        return { member, index, x: end.x * width, y: end.y * height, facing: end.facing };
      });
      party[0] = { member: leader, index: 0, x: px, y: py, facing: player.facing };
      for (const actor of party) {
        const memberIdle = actor.index ? (reducedMotion.matches ? 0 : Math.sin(idleClock * 2.2 + actor.index * 0.8) * idleBlend) : idle;
        const memberStride = playerMoving ? Math.sin(time / 190 + actor.index * 0.65) : stride;
        ctx.save(); ctx.translate(actor.x, actor.y); ctx.scale(avatarScale, avatarScale);
        drawCharacter(ctx, actor.member.weapon, { facing: actor.facing, stride: memberStride, idle: memberIdle });
        ctx.restore();
      }
      // HUD is rendered in screen coordinates, keeping both corners anchored on resize.
      const controls = roomToolbarLayout(width, height);
      const nameWidth = Math.max(70, Math.min(300, width >= 1060 ? controls[0].x - 32 : width - 32));
      drawMenuInfo(ctx, 16, 16, nameWidth, 62);
      text(leader.name, 38, 42, "600 17px system-ui", "#43311f", nameWidth - 44);
      text(weaponDetails(leader.weapon).label, 38, 62, "12px system-ui", "#66513b", nameWidth - 44);
      drawMenuInfo(ctx, 16, 86, nameWidth, 32);
      text("Id-leon City", 38, 107, "600 12px system-ui", "#43311f", nameWidth - 44);
      const progress = progressionRef.current;
      const progressWidth = Math.max(100, Math.min(200, width - 232));
      ctx.save();
      drawMenuInfo(ctx, 16, height - 126, progressWidth, 110);
      text(`Gold: ${goldRef.current}`, 38, height - 100, "600 15px system-ui", "#68491e", progressWidth - 44);
      text(`Account Lv. ${progress.level}`, 38, height - 76, "600 14px system-ui", "#43311f", progressWidth - 44);
      text(`EXP: ${progress.exp}/${progress.expToNextLevel}`, 38, height - 52, "12px system-ui", "#66513b", progressWidth - 44);
      box(38, height - 38, progressWidth - 44, 6, "#8d7455", undefined, 3);
      if (progress.exp > 0) box(38, height - 38, (progressWidth - 44) * progress.exp / progress.expToNextLevel, 6, "#8c6231", undefined, 3);
      ctx.restore();
      for (const control of controls) {
        const label = control.id === "menu" && store.getState().isPaused ? "Close" : control.label;
        drawRpgButton(ctx, buttonIcons, label === "Close" ? "close" : control.id, label,
          control.x, control.y, control.width, control.height,
          focus.current === control.id || (control.id === "menu" ? store.getState().isPaused : store.getState().activePanel === control.id));
      }
      drawRpgButton(ctx, buttonIcons, "map", "Map", width - 192, height - 104, 88, 88, focus.current === "map" || store.getState().isMapOpen);
      drawRpgButton(ctx, buttonIcons, "start", "Start", width - 104, height - 104, 88, 88, focus.current === "start");
      drawMenuInfo(ctx, width - 192, height - 142, 176, 34);
      ctx.textAlign = "center";
      text(({ meadow: "Meadow", forest: "Forest", harbor: "Harbor", tourney: "Zugwangs Battle Tourney", deepsea: "DeepSea Moot", "deepsea-2f": "DeepSea Moot 2F", "deepsea-palace": "DeepSea Moot Royal Palace" })[store.getState().selectedLocation], width - 104, height - 120, "600 12px system-ui", "#43311f", 132);
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

  return <ResponsiveCanvasFrame overlay={false} minHeight={560} narrowMinHeight={600}><div className="relative h-full w-full overflow-hidden bg-[#59432f]">
    <div inert={menuOpen || mapOpen || activePanel !== null} className="h-full w-full">
    <canvas ref={canvasRef} tabIndex={0} aria-label={`${character.name}'s room`} aria-describedby="room-controls" className="block h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d6aa4e]" onPointerDown={(event) => {
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
    <p role="status" className="sr-only">Selected location: {({ meadow: "Meadow", forest: "Forest", harbor: "Harbor", tourney: "Zugwangs Battle Tourney", deepsea: "DeepSea Moot", "deepsea-2f": "DeepSea Moot 2F", "deepsea-palace": "DeepSea Moot Royal Palace" })[selectedLocation]}</p>
    <button type="button" aria-label="Map" aria-expanded={mapOpen} onClick={() => roomAction("map")} title="World map" onPointerEnter={() => { focus.current = "map"; }} onPointerLeave={() => { focus.current = ""; }} onFocus={() => { focus.current = "map"; }} onBlur={() => { focus.current = ""; }} className="absolute right-[104px] bottom-4 h-[88px] w-[88px] cursor-pointer rounded-[10px] outline-none"><span className="sr-only">Map</span></button>
    <button type="button" onClick={() => store.getState().startExploring(characters.find((member) => member.isStarter) ?? character)} title="Start adventure" onPointerEnter={() => { focus.current = "start"; }} onPointerLeave={() => { focus.current = ""; }} onFocus={() => { focus.current = "start"; }} onBlur={() => { focus.current = ""; }} className="absolute right-4 bottom-4 h-[88px] w-[88px] cursor-pointer rounded-[10px] outline-none"><span className="sr-only">Start</span></button>
    {toolbar.map((control) => <button key={control.id} type="button" aria-label={control.id === "menu" && menuOpen ? "Close menu" : control.label} title={control.label} aria-expanded={control.id === "menu" ? menuOpen : activePanel === control.id} onClick={() => control.id === "menu" ? toggleMenu() : togglePanel(control.id)} onPointerEnter={() => { focus.current = control.id; }} onPointerLeave={() => { focus.current = ""; }} onFocus={() => { focus.current = control.id; }} onBlur={() => { focus.current = ""; }} className="absolute cursor-pointer rounded-[10px] outline-none" style={{ left: control.x, top: control.y, width: control.width, height: control.height }}><span className="sr-only">{control.label}</span></button>)}
    </div>
    {mapOpen && <WorldMap onClose={() => roomAction("start")} />}
    {activePanel === "patch-notes" && <PatchNotesPanel onClose={() => roomAction("start")} />}
    {activePanel === "donation" && <DonationPanel onClose={() => roomAction("start")} />}
    {menuOpen && <RoomMenu onClose={() => roomAction("start")} />}
    {activePanel === "character" && <CharacterRoster characters={characters} onClose={() => roomAction("start")} />}
    {activePanel === "team" && <TeamScreen characters={characters} onClose={() => roomAction("start")} />}
    {activePanel === "pvp" && <PvpPanel onClose={() => roomAction("start")} />}
    {activePanel === "wiki" && <WikiPanel onClose={() => roomAction("start")} />}
    {activePanel === "inventory" && <InventoryPanel onClose={() => roomAction("start")} />}
    {activePanel === "wish" && <WishScreen onClose={() => roomAction("start")} />}
    {(activePanel === "shop" || activePanel === "artifacts") && <CollectionPanel title={activePanel === "shop" ? "Shop" : "Artifacts"} onClose={() => roomAction("start")} />}
  </div></ResponsiveCanvasFrame>;
}
