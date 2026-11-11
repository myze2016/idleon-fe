"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { useArtifactAction, useCharacter } from "@/lib/character-api";
import { artifactCatalog, artifactDetails } from "@/lib/artifact";

export function CollectionPanel({ title, onClose, characterId }: { title: "Shop" | "Artifacts"; onClose: () => void; characterId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null), closeRef = useRef<HTMLButtonElement>(null);
  const session = useSession(), state = useCharacter(session.data?.user.id), action = useArtifactAction(session.data?.user.id);
  const [rects, setRects] = useState<{ x: number; y: number; width: number }[]>([]);
  const [focused, setFocused] = useState(-1), [notice, setNotice] = useState("");
  const busy = useRef(false);
  const gold = state.data?.gold ?? 0;
  const character = state.data?.characters.find((member) => member.id === characterId);
  const rows = useMemo(() => {
    const items = title === "Shop" ? artifactCatalog.map((item) => ({ ...item, id: item.stat, characterId: null as string | null }))
      : (state.data?.artifacts ?? []).map((item) => ({ ...artifactDetails(item.stat), ...item }));
    return characterId ? [{ id: "unequip", name: "Empty artifact slot", label: "Unequip", color: "#9fb49b", stat: "", characterId: null }, ...items] : items;
  }, [title, state.data?.artifacts, characterId]);
  const contentHeight = Math.max(330, 150 + rows.length * 96);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight, ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * ratio; canvas.height = h * ratio; ctx.scale(ratio, ratio);
      const background = ctx.createLinearGradient(0, 0, 0, h); background.addColorStop(0, "#102e29"); background.addColorStop(1, "#3d5e47");
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
      function text(value: string, x: number, y: number, size = 14, color = "#f1ebce", max = w - 48) {
        ctx!.fillStyle = color; ctx!.font = `600 ${size}px system-ui`; ctx!.fillText(value, x, y, max);
      }
      text(characterId ? `Equip: ${character?.name ?? "Character"}` : title, 24, 48, 24, "#f1ebce", w - 112);
      text(title === "Shop" ? `Gold: ${gold.toLocaleString()} · Artifacts cost 1,000 gold` : characterId ? "One artifact slot · +5 to its stat" : "Equip artifacts from a character's stats screen.", 24, 78, 12, "#c1cda9");
      text(action.error?.message ?? (action.isPending ? "Saving..." : notice), 24, 102, 12, action.error ? "#ffbca8" : "#e4d895");
      const left = Math.max(24, (w - 720) / 2), cardWidth = Math.min(720, w - 48);
      setRects(rows.map((_, i) => ({ x: left, y: 124 + i * 96, width: cardWidth })));
      rows.forEach((item, i) => {
        const y = 124 + i * 96;
        const owner = state.data?.characters.find((member) => member.id === item.characterId);
        const equipped = !!characterId && item.id === character?.artifactId;
        const owned = state.data?.artifacts.filter((artifact) => artifact.stat === item.stat).length ?? 0;
        ctx.beginPath(); ctx.roundRect(left, y, cardWidth, 84, 10); ctx.fillStyle = "#163a30"; ctx.fill();
        ctx.strokeStyle = focused === i ? "#fff0b8" : equipped ? "#e4d895" : "#708360"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = item.color; ctx.beginPath(); ctx.moveTo(left + 28, y + 18); ctx.lineTo(left + 42, y + 39); ctx.lineTo(left + 28, y + 60); ctx.lineTo(left + 14, y + 39); ctx.closePath(); ctx.fill();
        text(item.name, left + 56, y + 25, 16, "#f1ebce", cardWidth - 68);
        text(item.id === "unequip" ? "Remove your equipped artifact" : `+5 ${item.label}`, left + 56, y + 46, 13, item.color, cardWidth - 68);
        const detail = title === "Shop" ? `Buy · 1,000 gold · Owned: ${owned}` : item.id === "unequip" ? (character?.artifactId ? "Select to unequip" : "Already empty") : owner ? `Equipped: ${owner.name}${equipped ? " · Selected" : ""}` : characterId ? "Select to equip" : "Available";
        text(detail, left + 56, y + 67, 11, "#c1cda9", cardWidth - 68);
      });
      if (!rows.length) text("No artifacts yet. Visit the Shop to buy one.", 24, 160, 14, "#c1cda9");
      ctx.beginPath(); ctx.roundRect(w - 64, 16, 48, 48, 10); ctx.fillStyle = "#163a30"; ctx.fill(); ctx.strokeStyle = "#c1cda9"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 47, 33); ctx.lineTo(w - 33, 47); ctx.moveTo(w - 33, 33); ctx.lineTo(w - 47, 47); ctx.stroke();
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw(); return () => observer.disconnect();
  }, [title, characterId, character, gold, rows, focused, state.data, action.error, action.isPending, notice]);
  function choose(index: number) {
    if (busy.current) return;
    const item = rows[index]; if (!item) return;
    busy.current = true; setNotice("");
    const input = title === "Shop" ? { stat: item.stat } : { characterId: characterId!, artifactId: item.id === "unequip" ? null : item.id };
    action.mutate(input, { onSuccess: () => setNotice(title === "Shop" ? `${item.name} purchased.` : "Artifact equipment saved."), onSettled: () => { busy.current = false; } });
  }
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-label={title} className="absolute inset-0 z-40 overflow-auto bg-[#102e29]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    }
  }}><div className="relative w-full" style={{ minHeight: "100%", height: contentHeight }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label={`Close ${title}`} onClick={onClose} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]" />
    {rows.map((item, i) => <button key={item.id} type="button" disabled={action.isPending || (title === "Shop" ? gold < 1000 : !characterId || (!!item.characterId && item.characterId !== characterId))} onClick={() => choose(i)} onFocus={() => setFocused(i)} onBlur={() => setFocused(-1)} aria-label={title === "Shop" ? `Buy ${item.name}, +5 ${item.label}, 1,000 gold` : item.id === "unequip" ? "Unequip artifact" : `Equip ${item.name}, +5 ${item.label}`} className="absolute h-[84px] cursor-pointer rounded-xl outline-none disabled:cursor-default" style={{ left: rects[i]?.x, top: rects[i]?.y, width: rects[i]?.width }}><span className="sr-only">{item.name}</span></button>)}
    <p role="status" className="sr-only">Gold: {gold}. {action.error?.message ?? notice}</p>
  </div></div></ResponsiveCanvasFrame>;
}
