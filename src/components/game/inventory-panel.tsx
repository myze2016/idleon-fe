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
    className="paper-menu absolute inset-0 z-40 overflow-auto paper-card bg-[#efdfb8] paper-menu p-6 text-[#43311f]"
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
      className="absolute top-4 right-4 grid size-12 menu-action cursor-pointer place-items-center rounded-xl border border-[#71583c] paper-card bg-[#e9d4a7] outline-none focus-visible:ring-2 focus-visible:ring-[#805523]"><X size={20} /></button>
    <section aria-labelledby="quest-items-title" className="mx-auto mt-8 max-w-[720px]">
      <h3 id="quest-items-title" className="text-lg font-semibold text-[#805523]">Quest Items</h3>
      <p className="mt-1 text-sm text-[#71583c]">Unique discoveries. Each quest item can be obtained once.</p>
      {state.isPending ? <p role="status" className="mt-6">Loading inventory…</p> : state.isError ? <div role="alert" className="mt-6 text-[#a13725]">
        <p>{state.error.message}</p><button type="button" onClick={() => void state.refetch()} className="mt-3 menu-action cursor-pointer rounded border px-4 py-2">Retry</button>
      </div> : items.length ? <ul className="mt-5 grid auto-rows-fr gap-3">
        {items.map((item) => <li key={item.id} className="menu-info grid min-h-36 w-full grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
          <span className="menu-info grid size-14 shrink-0 place-items-center text-[#805523]">
            {item.id === "zugwangs-evidence" ? <FileText size={30} aria-hidden="true" /> : <Map size={30} aria-hidden="true" />}
          </span>
          <div className="min-w-0 break-words"><h4 className="font-semibold">{item.name}</h4><p className="mt-1 text-sm text-[#71583c]">{item.description}</p><p className="mt-2 text-xs text-[#805523]">Quest item · Quantity 1 / 1</p></div>
          {item.id === "zugwangs-evidence" && <button ref={evidenceRef} type="button" onClick={() => setPaperOpen(true)} aria-label={`Inspect ${item.name}`} className="menu-action col-start-2 justify-self-end whitespace-nowrap px-4 py-2 text-sm font-semibold sm:col-start-3 sm:row-start-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#805523]">Click to inspect</button>}
        </li>)}
      </ul> : <p className="menu-info mt-6 p-5 text-[#71583c]">No quest items yet. Explore and defeat bosses to find them.</p>}
    </section>
    </>}
  </div></ResponsiveCanvasFrame>;
}

function EvidencePaper({ onClose }: { onClose: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-2">
    <button ref={backRef} type="button" onClick={onClose} className="self-start menu-action cursor-pointer rounded-lg border border-[#a38358] paper-card bg-[#e9d4a7] px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#805523]">← Back to Quest Items</button>
    <article className="relative w-full rotate-[-1deg] rounded-sm border border-[#ac8c53] paper-card bg-[#e9d6a1] px-6 py-8 text-[#594529] shadow-xl" >
      <h2 id="inventory-title" className="text-center font-serif text-2xl font-semibold">Zugwangs Evidence</h2>
      <p className="mt-2 text-center font-serif text-sm italic text-[#806641]">A drawing found among Zugwang’s belongings</p>
      <img src="/optimized/sprites/yellow-spectator-front-v2.c134c981238b.webp" alt="The yellow spectator: golden hair, yellow skin and yellow clothing" className="mx-auto mt-4 h-[350px] w-full max-w-[300px] object-contain" />
      <p className="text-center font-serif text-sm italic">A person drawn entirely in yellow. What could it mean?</p>
    </article>
  </div>;
}
