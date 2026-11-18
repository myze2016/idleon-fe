"use client";
import { useEffect, useRef } from "react";
import { drawCurrencyBadge, useCurrencyArt } from "./currency-art";

export function CurrencyBadge({ kind, amount, className = "" }: { kind: "gold" | "wish"; amount: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const art = useCurrencyArt();
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio); canvas.height = Math.round(canvas.clientHeight * ratio);
      ctx.scale(ratio, ratio);
      drawCurrencyBadge(ctx, kind, amount, 0, 0, canvas.clientWidth, canvas.clientHeight);
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [kind, amount, art]);
  return <canvas ref={canvasRef} role="img" aria-label={`${kind === "gold" ? "Gold" : "Wish currency"}: ${amount.toLocaleString()}`} className={`block h-[60px] max-w-full ${className}`} />;
}
