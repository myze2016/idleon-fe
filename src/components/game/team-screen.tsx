"use client";
import { drawMenuButton } from "./menu-button";
import { drawPaperPanel } from "./paper-panel";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCharacter, useCharacterSprites } from "./character-design";

import { useEffect, useRef, useState } from "react";
import { CharacterRoster } from "./character-roster";
import { CharacterStatsScreen } from "./character-stats-screen";
import { useGameState, useGameStoreApi } from "./game-store";
import { type Character } from "@/lib/character";
import { useAssignTeamSlot } from "@/lib/character-api";
import { useSession } from "@/lib/auth";

export function TeamScreen({ characters, onClose }: { characters: Character[]; onClose: () => void }) {
  const spriteVersion = useCharacterSprites();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [closeFocused, setCloseFocused] = useState(false);
  const [inspected, setInspected] = useState<Character | null>(null);
  const slots = useGameState((state) => state.teamSlots);
  const store = useGameStoreApi();
  const session = useSession();
  const save = useAssignTeamSlot(session.data?.user.id);
  const saving = useRef(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [focusedSlot, setFocusedSlot] = useState<number | null>(null);
  const [rects, setRects] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const returnSlot = useRef<number | null>(null);

  useEffect(() => {
    if (selectedSlot !== null || inspected) return;
    if (returnSlot.current !== null) slotRefs.current[returnSlot.current]?.focus({ preventScroll: true });
    else closeRef.current?.focus({ preventScroll: true });
  }, [selectedSlot, inspected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.scale(ratio, ratio);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#efdfb8"); gradient.addColorStop(1, "#d7bc8c");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); drawPaperPanel(ctx, 0, 0, width, height);
      function text(value: string, x: number, y: number, font: string, color = "#43311f") {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y);
      }
      function box(x: number, y: number, w: number, h: number, fill: string, border: string) {
        if (h <= 60) { drawMenuButton(ctx!, x, y, w, h, border === "#fff" || border === "#fff0b8"); return; }
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, Math.min(12, w / 4)); ctx!.fillStyle = fill; ctx!.fill(); drawPaperPanel(ctx!, x, y, w, h);
        ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      text("Team", 24, 48, "600 28px system-ui");
      text("3 front slots / 3 back slots", 24, 75, "13px system-ui", "#71583c");
      const area = Math.min(1100, width - 32), left = (width - area) / 2;
      const gap = width < 600 ? 6 : 14, groupGap = width < 600 ? 18 : 36;
      const slotWidth = (area - gap * 4 - groupGap) / 6;
      const cardHeight = Math.min(260, Math.max(100, height - 230));
      const top = Math.max(124, (height - cardHeight) / 2);
      const groupWidth = slotWidth * 3 + gap * 2;
      setRects(Array.from({ length: 6 }, (_, i) => ({
        x: left + (i >= 3 ? groupWidth + groupGap : 0) + i % 3 * (slotWidth + gap),
        y: top, width: slotWidth, height: cardHeight,
      })));
      ctx.textAlign = "center";
      text("FRONT", left + groupWidth / 2, top - 22, "600 15px system-ui", "#805523");
      text("BACK", left + groupWidth + groupGap + groupWidth / 2, top - 22, "600 15px system-ui", "#71583c");
      for (let i = 0; i < 6; i++) {
        const back = i >= 3, index = i % 3;
        const x = left + (back ? groupWidth + groupGap : 0) + index * (slotWidth + gap);
        const member = slots[i];
        box(x, top, slotWidth, cardHeight, member ? "#2c4d39" : "#15382eed", focusedSlot === i ? "#fff0b8" : back ? "#73927e" : "#b6a675");
        const font = slotWidth < 70 ? 10 : 13;
        text(`${back ? "Back" : "Front"} ${index + 1}`, x + slotWidth / 2, top + 24, `600 ${font}px system-ui`, back ? "#71583c" : "#805523");
        const centerY = top + cardHeight * 0.53;
        if (member) {
          ctx.save(); ctx.translate(x + slotWidth / 2, centerY + 14);
          const avatarScale = Math.max(0.4, Math.min(2, slotWidth / 72, cardHeight / 160)); ctx.scale(avatarScale, avatarScale);
          drawCharacter(ctx, member.weapon); ctx.restore();
          ctx.font = `600 ${font}px system-ui`; ctx.fillStyle = "#43311f"; ctx.fillText(member.name, x + slotWidth / 2, top + cardHeight - 20, slotWidth - 8);
          continue;
        }
        ctx.strokeStyle = "#9a7d51"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + slotWidth / 2 - 7, centerY); ctx.lineTo(x + slotWidth / 2 + 7, centerY);
        ctx.moveTo(x + slotWidth / 2, centerY - 7); ctx.lineTo(x + slotWidth / 2, centerY + 7); ctx.stroke();
        text("Empty", x + slotWidth / 2, top + cardHeight - 20, `${font}px system-ui`, "#806b4e");
      }
      ctx.textAlign = "left";
      box(width - 64, 16, 48, 48, "#e9d4a7", closeFocused ? "#fff" : "#a38358");
      ctx.strokeStyle = "#fff0cc"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(width - 47, 33); ctx.lineTo(width - 33, 47); ctx.moveTo(width - 33, 33); ctx.lineTo(width - 47, 47); ctx.stroke();
    }
    window.addEventListener("paper-art-ready", draw);
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => { observer.disconnect(); window.removeEventListener("paper-art-ready", draw); };
  }, [closeFocused, slots, focusedSlot, selectedSlot, inspected, spriteVersion]);

  if (inspected) return <CharacterStatsScreen character={inspected} onClose={() => setInspected(null)} />;

  if (selectedSlot !== null) return <div className="paper-menu absolute inset-0 z-30">
    <CharacterRoster characters={characters} selectionLabel={`Assign to ${selectedSlot < 3 ? "Front" : "Back"} ${selectedSlot % 3 + 1}`} onClose={() => { if (!saving.current) setSelectedSlot(null); }} onSelect={(character) => {
      if (saving.current || !character.id) return;
      saving.current = true;
      save.mutate({ slot: selectedSlot, characterId: character.id }, {
        onSuccess: () => { store.getState().assignCharacter(selectedSlot, character); setSelectedSlot(null); },
        onSettled: () => { saving.current = false; },
      });
    }} />
    {(save.isPending || save.error) && <p role="status" className="absolute bottom-14 left-6 z-50 rounded paper-card bg-[#efdfb8] p-3 text-sm text-[#43311f]">{save.isPending ? "Saving team..." : save.error?.message}</p>}
  </div>;

  return <ResponsiveCanvasFrame minWidth={600}><div role="dialog" aria-modal="true" aria-label="Team formation" className="paper-menu absolute inset-0 z-30 paper-card bg-[#efdfb8]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label="Close team" onClick={onClose} onFocus={() => setCloseFocused(true)} onBlur={() => setCloseFocused(false)} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close team</span></button>
    {rects.map((rect, i) => <button key={i} ref={(element) => { slotRefs.current[i] = element; }} type="button" aria-label={`${i < 3 ? "Front" : "Back"} ${i % 3 + 1}: ${slots[i]?.name ?? "empty"}. Choose character`} onClick={() => { returnSlot.current = i; setSelectedSlot(i); }} onFocus={() => setFocusedSlot(i)} onBlur={() => setFocusedSlot(null)} className="absolute cursor-pointer rounded-xl outline-none" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}><span className="sr-only">Choose character</span></button>)}
    {rects.map((rect, i) => slots[i] && <button key={`upgrade-${i}`} type="button" aria-label={`Open ${slots[i]?.name} skills and upgrades`} className="absolute cursor-pointer rounded border border-[#a38358] paper-card bg-[#e9d4a7] px-1 py-2 text-xs text-[#43311f] focus-visible:outline-2 focus-visible:outline-[#805523]" style={{ left: rect.x, top: rect.y + rect.height + 8, width: rect.width }} onClick={() => {
      const member = slots[i];
      if (!member) return;
      returnSlot.current = i;
      setInspected(characters.find((character) => character.id === member.id) ?? member);
    }}>Upgrade</button>)}
    {rects.map((rect, i) => slots[i] && <button key={`remove-${i}`} type="button" disabled={save.isPending} aria-label={`Remove ${slots[i]?.name} from team`} className="menu-action absolute rounded border border-[#bd8275] paper-card bg-[#d8ae95] px-2 py-2 text-xs text-[#7c3124] disabled:opacity-50" style={{ left: rect.x, top: rect.y + rect.height + 48, width: rect.width }} onClick={() => {
      if (saving.current) return;
      saving.current = true;
      save.mutate({ slot: i, characterId: null }, {
        onSuccess: () => store.getState().assignCharacter(i, null),
        onSettled: () => { saving.current = false; },
      });
    }}>Remove</button>)}
    {save.error && <p role="alert" className="absolute bottom-2 left-6 text-sm text-red-200">{save.error.message}</p>}
    <p role="status" className="sr-only">{slots.filter(Boolean).length} of 6 slots filled.</p>
  </div></ResponsiveCanvasFrame>;
}
