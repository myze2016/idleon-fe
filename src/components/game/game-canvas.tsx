"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 446;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 42;
const platforms = [
  { x: 220, y: 350, width: 156 },
  { x: 440, y: 280, width: 144 },
  { x: 680, y: 350, width: 160 },
];
const movementKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space"]);

function newPlayer() {
  return { x: 100, y: GROUND - PLAYER_HEIGHT, velocityY: 0, grounded: true, facing: 1 };
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const player = useRef(newPlayer());
  const paused = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canvasError, setCanvasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    let lastTime = 0;
    let jumpHeld = false;

    function resize() {
      if (!canvas) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    function clearInput() { keys.current.clear(); }
    function keyDown(event: KeyboardEvent) {
      if (document.activeElement !== canvas || !movementKeys.has(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
    }
    function keyUp(event: KeyboardEvent) { keys.current.delete(event.code); }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", clearInput);
    canvas.addEventListener("blur", clearInput);

    function update(dt: number) {
      const p = player.current;
      const left = keys.current.has("ArrowLeft") || keys.current.has("KeyA");
      const right = keys.current.has("ArrowRight") || keys.current.has("KeyD");
      const jump = keys.current.has("Space") || keys.current.has("ArrowUp") || keys.current.has("KeyW");
      const direction = Number(right) - Number(left);
      p.x = Math.max(10, Math.min(WIDTH - PLAYER_WIDTH - 10, p.x + direction * 240 * dt));
      if (direction) p.facing = direction;
      if (jump && !jumpHeld && p.grounded) { p.velocityY = -560; p.grounded = false; }
      jumpHeld = jump;
      const previousBottom = p.y + PLAYER_HEIGHT;
      p.velocityY += 1500 * dt;
      p.y += p.velocityY * dt;
      p.grounded = false;
      const surfaces = [...platforms, { x: 0, y: GROUND, width: WIDTH }];
      for (const surface of surfaces) {
        if (p.velocityY >= 0 && previousBottom <= surface.y + 0.5 &&
            p.y + PLAYER_HEIGHT >= surface.y && p.x + PLAYER_WIDTH > surface.x && p.x < surface.x + surface.width) {
          p.y = surface.y - PLAYER_HEIGHT;
          p.velocityY = 0;
          p.grounded = true;
          break;
        }
      }
    }

    function draw(time: number) {
      if (!context || !canvas) return;
      const ctx = context;
      ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#cce6df"); sky.addColorStop(1, "#eff2cf");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#fff5ce"; ctx.beginPath(); ctx.arc(765, 96, 43, 0, Math.PI * 2); ctx.fill();

      // Layered hills and trees use the same logical coordinates at every screen size.
      for (const [offset, color] of [[0, "#a9c8ad"], [105, "#83ab92"]] as const) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, GROUND);
        ctx.bezierCurveTo(120, 155 + offset, 240, 185 + offset, 400, 330 + offset / 2);
        ctx.bezierCurveTo(580, 200 + offset, 740, 175 + offset, WIDTH, 300 + offset);
        ctx.lineTo(WIDTH, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();
      }
      for (const tree of [{ x: 65, y: 330, s: 1.1 }, { x: 190, y: 352, s: 0.7 }, { x: 850, y: 314, s: 1.3 }, { x: 925, y: 354, s: 0.7 }]) {
        ctx.fillStyle = "#557660"; ctx.fillRect(tree.x - 6, tree.y, 12, GROUND - tree.y);
        ctx.fillStyle = "#456f58";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(tree.x, tree.y - (100 - i * 30) * tree.s);
          ctx.lineTo(tree.x + (48 - i * 6) * tree.s, tree.y + i * 19);
          ctx.lineTo(tree.x - (48 - i * 6) * tree.s, tree.y + i * 19); ctx.fill();
        }
      }
      ctx.fillStyle = "#665c43"; ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      ctx.fillStyle = "#8aaa65"; ctx.fillRect(0, GROUND, WIDTH, 12);
      ctx.fillStyle = "#b0c781"; ctx.fillRect(0, GROUND, WIDTH, 4);
      for (const platform of platforms) {
        ctx.fillStyle = "#7b7052"; ctx.fillRect(platform.x, platform.y, platform.width, 19);
        ctx.fillStyle = "#91ad6b"; ctx.fillRect(platform.x - 3, platform.y, platform.width + 6, 7);
        ctx.fillStyle = "#b8cf8a"; ctx.fillRect(platform.x - 3, platform.y, platform.width + 6, 3);
      }
      for (let i = 0; i < 20; i++) {
        const x = (i * 137 + 35) % WIDTH;
        const y = GROUND + 30 + (i * 17) % 55;
        ctx.fillStyle = "#776c4e"; ctx.fillRect(x, y, 10, 3);
      }
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = "#f6efb8";
        ctx.globalAlpha = 0.35 + Math.sin(time / 900 + i) * 0.25;
        ctx.beginPath(); ctx.arc((i * 89 + 45) % WIDTH, 220 + Math.sin(time / 2200 + i) * 35 + i * 12, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const p = player.current;
      ctx.fillStyle = "#1c372c33"; ctx.beginPath(); ctx.ellipse(p.x + 14, p.y + PLAYER_HEIGHT + 3, 19, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#253e38"; ctx.fillRect(p.x + 3, p.y + 31, 9, 11); ctx.fillRect(p.x + 17, p.y + 31, 9, 11);
      ctx.fillStyle = "#d4a35e"; ctx.fillRect(p.x + 2, p.y + 17, 25, 18);
      ctx.fillStyle = "#f2d3a7"; ctx.fillRect(p.x + 5, p.y + 3, 20, 17);
      ctx.fillStyle = "#315b48"; ctx.fillRect(p.x + 2, p.y, 26, 7); ctx.fillRect(p.x - 1, p.y + 6, 32, 4);
      ctx.fillStyle = "#253e38"; ctx.fillRect(p.x + (p.facing > 0 ? 20 : 8), p.y + 12, 3, 3);
      ctx.textAlign = "center"; ctx.font = "11px system-ui"; ctx.fillStyle = "#254637";
      ctx.fillText("You", p.x + 14, p.y - 12);
      if (paused.current) {
        ctx.fillStyle = "#12372988"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "#fff8e8"; ctx.font = "600 30px system-ui"; ctx.fillText("Taking a breather", WIDTH / 2, HEIGHT / 2);
        ctx.font = "15px system-ui"; ctx.fillText("Press Resume when you’re ready", WIDTH / 2, HEIGHT / 2 + 30);
      }
    }

    function loop(time: number) {
      const dt = Math.min((time - (lastTime || time)) / 1000, 1 / 30);
      lastTime = time;
      if (!paused.current && !document.hidden) update(dt);
      draw(time);
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", clearInput);
      canvas.removeEventListener("blur", clearInput);
      clearInput();
    };
  }, []);

  function togglePause() {
    paused.current = !paused.current;
    keys.current.clear();
    setIsPaused(paused.current);
    canvasRef.current?.focus({ preventScroll: true });
  }

  return <div className="overflow-hidden rounded-2xl border border-[#d5dfd1] bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e6dc] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-sm font-medium"><span className={`size-2 rounded-full ${isPaused ? "bg-amber-500" : "bg-emerald-600"}`} />Greenwood meadow<span className="hidden text-xs font-normal text-muted-foreground sm:inline"> / Sandbox</span></div>
      <div className="flex gap-2"><Button variant="outline" onClick={togglePause}>{isPaused ? <Play /> : <Pause />}{isPaused ? "Resume" : "Pause"}</Button><Button variant="ghost" onClick={() => { player.current = newPlayer(); keys.current.clear(); canvasRef.current?.focus({ preventScroll: true }); }}><RotateCcw />Reset</Button></div>
    </div>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="2D game playground. Use A and D or left and right arrows to move. Press Space, W, or up arrow to jump." aria-describedby="game-controls" onPointerDown={() => canvasRef.current?.focus({ preventScroll: true })} onFocus={() => { if (!canvasRef.current?.getContext("2d")) setCanvasError(true); }} className="block aspect-video w-full outline-none focus-visible:ring-4 focus-visible:ring-emerald-600 focus-visible:ring-inset">
      Your browser needs HTML canvas support to display this game.
    </canvas>
    {canvasError && <p role="alert" className="p-4 text-sm text-red-700">Your browser could not start the 2D canvas. Try a browser with canvas support.</p>}
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
      <p id="game-controls" className="max-w-md text-xs leading-5 text-muted-foreground">Click the scene to play. <strong className="font-medium text-foreground">A / D or ← / →</strong> to move · <strong className="font-medium text-foreground">Space / W / ↑</strong> to jump. You can also use the buttons.</p>
      <div className="flex gap-2" role="group" aria-label="Game movement controls">
        {[{ key: "ArrowLeft", label: "Move left", icon: ArrowLeft }, { key: "ArrowRight", label: "Move right", icon: ArrowRight }, { key: "Space", label: "Jump", icon: ArrowUp }].map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-label={label} disabled={isPaused} className="flex size-11 touch-none items-center justify-center rounded-lg border border-[#d5dfd1] bg-[#f0f3eb] text-[#315b48] outline-offset-2 hover:bg-[#e4ecd9] focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-40" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); keys.current.add(key); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)} onLostPointerCapture={() => keys.current.delete(key)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); keys.current.add(key); } }} onKeyUp={() => keys.current.delete(key)} onBlur={() => keys.current.delete(key)}><Icon className="size-5" /></button>)}
      </div>
    </div>
  </div>;
}
