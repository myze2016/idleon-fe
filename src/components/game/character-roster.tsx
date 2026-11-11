"use client";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { drawCharacter } from "./character-design";

import { useEffect, useRef, useState } from "react";
import { weaponDetails, type Character } from "@/lib/character";
import { CharacterStatsScreen } from "./character-stats-screen";

export function CharacterRoster({ characters, onClose, onSelect, selectionLabel }: {
  characters: Character[]; onClose: () => void;
  onSelect?: (character: Character) => void; selectionLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [focus, setFocus] = useState("");
  const [inspected, setInspected] = useState<Character | null>(null);
  const [page, setPage] = useState(0);
  const [capacity, setCapacity] = useState(1);
  const [cards, setCards] = useState<{ x: number; y: number; width: number; height: number; index: number }[]>([]);
  const selectionMode = !!onSelect;
  const pages = Math.max(1, Math.ceil(characters.length / capacity));
  const currentPage = Math.min(page, pages - 1);

  useEffect(() => { if (!inspected) closeRef.current?.focus({ preventScroll: true }); }, [inspected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.scale(ratio, ratio);
      const columns = Math.max(1, Math.floor((width - 36) / 238));
      const rows = Math.max(1, Math.floor((height - 160) / 280));
      const perPage = columns * rows;
      setCapacity(perPage);
      const safePage = Math.min(page, Math.max(0, Math.ceil(characters.length / perPage) - 1));
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#102e29"); gradient.addColorStop(1, "#3d5e47");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = "#dbe4ad15"; ctx.beginPath(); ctx.arc((i * 157 + 40) % width, (i * 89 + 130) % height, 2, 0, Math.PI * 2); ctx.fill();
      }
      function box(x: number, y: number, w: number, h: number, fill: string, border: string, radius = 12) {
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, radius); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = border; ctx!.lineWidth = 2; ctx!.stroke();
      }
      function text(value: string, x: number, y: number, font: string, color = "#f1ebce", maxWidth?: number) {
        ctx!.font = font; ctx!.fillStyle = color; ctx!.fillText(value, x, y, maxWidth);
      }
      text(selectionMode ? "Choose character" : "Characters", 24, 48, "600 28px system-ui", "#f1ebce", width - 110);
      text(selectionLabel ?? `${characters.length} owned character${characters.length === 1 ? "" : "s"}`, 24, 75, "13px system-ui", "#c1cda9", width - 48);
      const gap = 16, cardWidth = Math.min(260, (width - 48 - (columns - 1) * gap) / columns);
      const cardHeight = Math.min(264, Math.max(140, height - 188));
      const start = safePage * perPage;
      setCards(characters.slice(start, start + perPage).map((_, i) => ({
        x: 24 + i % columns * (cardWidth + gap), y: 108 + Math.floor(i / columns) * 280,
        width: cardWidth, height: cardHeight, index: start + i,
      })));
      characters.slice(start, start + perPage).forEach((character, i) => {
        const x = 24 + i % columns * (cardWidth + gap), y = 108 + Math.floor(i / columns) * 280;
        const starter = character.isStarter ?? start + i === 0;
        box(x, y, cardWidth, cardHeight, "#163a30", focus === `character-${start + i}` ? "#ffffff" : starter ? "#d2c58b" : "#708360");
        text(starter ? "FREE STARTER" : "OWNED", x + 14, y + 25, "600 10px system-ui", "#e4d895");
        const avatarScale = Math.min(2.5, (cardHeight - 110) / 72);
        ctx.save(); ctx.translate(x + cardWidth / 2, y + cardHeight - 70); ctx.scale(avatarScale, avatarScale);
        drawCharacter(ctx, character.weapon); ctx.restore();
        text(character.name, x + 14, y + cardHeight - 35, "600 18px system-ui", "#f1ebce", cardWidth - 28);
        text(weaponDetails(character.weapon).label, x + 14, y + cardHeight - 14, "12px system-ui", "#c1cda9", cardWidth - 28);
      });
      box(width - 64, 16, 48, 48, "#163a30", focus === "close" ? "#fff" : "#708360");
      ctx.strokeStyle = "#f1ebce"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(width - 47, 33); ctx.lineTo(width - 33, 47); ctx.moveTo(width - 33, 33); ctx.lineTo(width - 47, 47); ctx.stroke();
      text(characters.length > perPage ? `Page ${safePage + 1}/${Math.ceil(characters.length / perPage)}` : selectionMode ? "Choose a character to place in this slot." : "Select a character to view stats.", 24, height - 24, "12px system-ui", "#c1cda9", characters.length > perPage ? Math.max(40, width - 244) : width - 48);
      if (characters.length > perPage) {
        box(width - 196, height - 62, 80, 44, "#163a30", focus === "previous" ? "#fff" : "#708360");
        box(width - 104, height - 62, 80, 44, "#163a30", focus === "next" ? "#fff" : "#708360");
        text("Previous", width - 188, height - 35, "12px system-ui"); text("Next", width - 82, height - 35, "12px system-ui");
      }
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [characters, focus, page, selectionMode, selectionLabel, inspected]);

  if (inspected) return <CharacterStatsScreen character={inspected} onClose={() => setInspected(null)} />;

  return <ResponsiveCanvasFrame minHeight={400}><div role="dialog" aria-modal="true" aria-label={selectionMode ? "Choose a team character" : "Your characters"} className="absolute inset-0 z-30 bg-[#102e29]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    <button ref={closeRef} type="button" aria-label="Close characters" onClick={onClose} onFocus={() => setFocus("close")} onBlur={() => setFocus("")} className="absolute top-4 right-4 size-12 cursor-pointer rounded-xl outline-none"><span className="sr-only">Close characters</span></button>
    {cards.map((card) => <button key={card.index} type="button" aria-label={`${onSelect ? "Assign" : "View stats for"} ${characters[card.index].name}, ${weaponDetails(characters[card.index].weapon).label}`} onClick={() => onSelect ? onSelect(characters[card.index]) : setInspected(characters[card.index])} onFocus={() => setFocus(`character-${card.index}`)} onBlur={() => setFocus("")} className="absolute cursor-pointer rounded-xl outline-none" style={{ left: card.x, top: card.y, width: card.width, height: card.height }}><span className="sr-only">{characters[card.index].name}</span></button>)}
    <ul className="sr-only">{characters.map((character, i) => <li key={character.id ?? i}>{character.name}, {weaponDetails(character.weapon).label}{(character.isStarter ?? i === 0) ? ", free starter character" : ""}</li>)}</ul>
    {pages > 1 && <>
      <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} onFocus={() => setFocus("previous")} onBlur={() => setFocus("")} className="absolute right-[116px] bottom-[18px] h-11 w-20 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Previous page</span></button>
      <button type="button" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)} onFocus={() => setFocus("next")} onBlur={() => setFocus("")} className="absolute right-6 bottom-[18px] h-11 w-20 cursor-pointer rounded-xl outline-none disabled:cursor-default"><span className="sr-only">Next page</span></button>
    </>}
  </div></ResponsiveCanvasFrame>;
}
