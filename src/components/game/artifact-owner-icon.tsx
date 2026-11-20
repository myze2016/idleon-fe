"use client";
import { useEffect, useRef } from "react";
import type { Character } from "@/lib/character";
import { drawCharacterInfoPortrait, useCharacterPortraits } from "./character-info-icons";

export function ArtifactOwnerIcon({ character }: { character: Character }) {
  const canvas = useRef<HTMLCanvasElement>(null), version = useCharacterPortraits();
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = 28 * ratio; element.height = 28 * ratio; ctx.scale(ratio, ratio);
    drawCharacterInfoPortrait(ctx, character.weapon, 0, 0, 28);
  }, [character.weapon, version]);
  return <canvas ref={canvas} width={28} height={28} aria-hidden="true" className="size-7 rounded-full" />;
}
