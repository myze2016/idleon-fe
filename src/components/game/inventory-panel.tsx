"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Map, X } from "lucide-react";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

export function InventoryPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const evidenceRef = useRef<HTMLButtonElement>(null);
  const [paperOpen, setPaperOpen] = useState(false);
  const session = useSession();
  const state = useCharacter(session.data?.user.id);
  const items = state.data?.questItems ?? [];
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="inventory-title"
    className="absolute inset-0 z-40 overflow-auto bg-gradient-to-b from-[#102e29] to-[#3d5e47] p-6 text-[#f1ebce]"
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (paperOpen) { setPaperOpen(false); requestAnimationFrame(() => evidenceRef.current?.focus()); } else onClose(); }
      if (event.key === "Tab") {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
      }
    }}>
    {paperOpen ? <EvidencePaper onClose={() => { setPaperOpen(false); requestAnimationFrame(() => evidenceRef.current?.focus()); }} /> : <>
    <h2 id="inventory-title" className="pr-16 text-2xl font-semibold">Inventory</h2>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close inventory"
      className="absolute top-4 right-4 grid size-12 cursor-pointer place-items-center rounded-xl border border-[#c1cda9] bg-[#163a30] outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]"><X size={20} /></button>
    <section aria-labelledby="quest-items-title" className="mx-auto mt-8 max-w-[720px]">
      <h3 id="quest-items-title" className="text-lg font-semibold text-[#e4d895]">Quest Items</h3>
      <p className="mt-1 text-sm text-[#c1cda9]">Unique discoveries. Each quest item can be obtained once.</p>
      {state.isPending ? <p role="status" className="mt-6">Loading inventory…</p> : state.isError ? <div role="alert" className="mt-6 text-[#ffbca8]">
        <p>{state.error.message}</p><button type="button" onClick={() => void state.refetch()} className="mt-3 cursor-pointer rounded border px-4 py-2">Retry</button>
      </div> : items.length ? <ul className="mt-5 space-y-3">
        {items.map((item) => <li key={item.id} className="flex items-center gap-4 rounded-xl border border-[#708360] bg-[#163a30] p-4">
          {item.id === "zugwangs-evidence" ? <button ref={evidenceRef} type="button" onClick={() => setPaperOpen(true)} aria-label="Open Zugwangs Evidence" className="flex w-full cursor-pointer items-center gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]">
            <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-[#b8a76d] bg-[#294a40] text-[#e4d895]"><FileText size={30} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><h4 className="font-semibold">{item.name}</h4><p className="mt-1 text-sm text-[#c1cda9]">{item.description}</p><p className="mt-2 text-xs text-[#e4d895]">Quest item · Quantity 1 / 1 · Click to inspect</p></div>
          </button> : <>
            <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-[#b8a76d] bg-[#294a40] text-[#e4d895]"><Map size={30} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><h4 className="font-semibold">{item.name}</h4><p className="mt-1 text-sm text-[#c1cda9]">{item.description}</p><p className="mt-2 text-xs text-[#e4d895]">Quest item · Quantity 1 / 1</p></div>
          </>}
        </li>)}
      </ul> : <p className="mt-6 rounded-xl border border-[#708360] bg-[#163a30] p-5 text-[#c1cda9]">No quest items yet. Explore and defeat bosses to find them.</p>}
    </section>
    </>}
  </div></ResponsiveCanvasFrame>;
}

function EvidencePaper({ onClose }: { onClose: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-2">
    <button ref={backRef} type="button" onClick={onClose} className="self-start cursor-pointer rounded-lg border border-[#708360] bg-[#163a30] px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]">← Back to Quest Items</button>
    <article className="relative w-full rotate-[-1deg] rounded-sm border border-[#ac8c53] bg-[#e9d6a1] px-6 py-8 text-[#594529] shadow-xl" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 27px, #8c6f3e12 28px)" }}>
      <h2 id="inventory-title" className="text-center font-serif text-2xl font-semibold">Zugwangs Evidence</h2>
      <p className="mt-2 text-center font-serif text-sm italic text-[#806641]">A drawing found among Zugwang’s belongings</p>
      <svg viewBox="0 0 300 350" role="img" aria-label="A hand-drawn yellow person on aged paper" className="mx-auto mt-4 max-h-[350px] w-full max-w-[300px]">
        <g stroke="#70562e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="150" cy="318" rx="74" ry="9" fill="#8b7041" opacity="0.14" stroke="none" />
          <path d="M123 233 L116 306 Q126 316 140 308 L150 249 L161 308 Q175 316 186 306 L177 233" fill="#edc63f" />
          <path d="M121 131 Q102 137 92 167 L67 213 Q65 226 78 228 L111 184 L116 237 Q148 248 183 237 L186 183 L218 226 Q230 229 234 215 L208 166 Q196 135 178 131 Z" fill="#f0ce42" />
          <path d="M139 110 L137 132 Q150 143 163 132 L162 110" fill="#edc63f" />
          <path d="M113 72 Q109 37 149 32 Q190 35 189 72 L186 94 Q176 120 150 121 Q122 119 113 94 Z" fill="#f6d74d" />
          <path d="M134 73 L136 76 M164 73 L166 76" strokeWidth="6" />
          <path d="M150 79 L146 91 L154 92 M136 101 Q149 109 164 100" fill="none" />
          <path d="M119 146 L127 218 M182 148 L175 222 M126 242 L136 247 M162 245 L173 241" stroke="#b89532" strokeWidth="2" fill="none" />
          <path d="M61 56 Q66 43 80 42 M224 259 L239 271 M224 271 L238 258" fill="none" opacity="0.55" strokeWidth="2" />
        </g>
      </svg>
      <p className="text-center font-serif text-sm italic">A person drawn entirely in yellow. What could it mean?</p>
    </article>
  </div>;
}
