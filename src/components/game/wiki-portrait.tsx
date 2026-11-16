"use client";

import { useEffect, useRef } from "react";
import type { WeaponType } from "@/lib/character";
import { drawCharacter, useCharacterSprites } from "./character-design";
import { drawMonster, useMonsterSprites } from "./meadow-monsters";

function deepSeaPortrait(ctx: CanvasRenderingContext2D, type: string) {
  const rect = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  if (type === "baracudon" || type === "fishpeople-rider") {
    ctx.fillStyle = "#6599a0"; ctx.beginPath(); ctx.ellipse(0, -21, 37, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-30, -21); ctx.lineTo(-48, -36); ctx.lineTo(-48, -6); ctx.fill();
    rect(23, -26, 4, 4, "#e5df8c");
    if (type === "fishpeople-rider") { rect(-7, -54, 14, 25, "#6eb8b1"); ctx.fillStyle = "#9bd0bd"; ctx.beginPath(); ctx.arc(0, -60, 8, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  rect(-11, -12, 7, 13, "#285c67"); rect(4, -12, 7, 13, "#285c67");
  rect(-15, -42, 30, 30, ["fishpeople-guardian", "fishpeople-researcher", "fishpeople-lord"].includes(type) ? "#806f9b" : "#559d9c");
  ctx.fillStyle = "#8bc3b0"; ctx.beginPath(); ctx.ellipse(0, -49, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4b8993"; ctx.beginPath(); ctx.moveTo(-13, -54); ctx.lineTo(-26, -70); ctx.lineTo(-18, -35); ctx.fill();
  rect(5, -52, 5, 4, "#f3e2a7");
  ctx.save(); ctx.translate(18, -30); rect(-2, -25, 4, 46, "#c1ae7a");
  if (["fishpeople-guard", "fishpeople-guardian", "fishpeople-knight"].includes(type)) { ctx.fillStyle = "#8baab0"; ctx.beginPath(); ctx.ellipse(-30, 0, 11, 19, 0, 0, Math.PI * 2); ctx.fill(); }
  if (["fishpeople-cleric", "fishpeople-researcher"].includes(type)) { ctx.fillStyle = "#a8ecdf"; ctx.beginPath(); ctx.arc(0, -25, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (type === "fishpeople-lord") { rect(-17, -65, 34, 6, "#d9c17c"); for (let i = 0; i < 3; i++) rect(-13 + i * 11, -74, 6, 10, "#d9c17c"); }
}

export function WikiPortrait({ subject, name }: { subject: { character: WeaponType } | { enemy: string }; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const characters = useCharacterSprites(), monsters = useMonsterSprites();
  const character = "character" in subject ? subject.character : null;
  const enemy = "enemy" in subject ? subject.enemy : null;
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 176 * ratio; canvas.height = 144 * ratio; ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, 176, 144); ctx.translate(88, 130); ctx.scale(1.6, 1.6);
    if (character) drawCharacter(ctx, character);
    else if (enemy === "assassin") drawCharacter(ctx, "dual-knife");
    else if (enemy && !drawMonster(ctx, enemy, 0, false, 0)) {
      if (enemy === "baracudon" || /^fishpeople-(guard|archer|rider|guardian|cleric|researcher|knight|rifler|baron|lord)$/.test(enemy)) deepSeaPortrait(ctx, enemy);
      else { ctx.fillStyle = "#71583c"; ctx.font = "8px system-ui"; ctx.textAlign = "center"; ctx.fillText("Loading artwork…", 0, -35); }
    }
  }, [character, enemy, characters, monsters]);
  return <canvas ref={canvasRef} role="img" aria-label={`${name} appearance`} className="mx-auto block aspect-[11/9] w-32 shrink-0 rounded-xl border border-[#ac8a59] bg-[#ddc292] sm:mx-0 sm:w-40" />;
}
