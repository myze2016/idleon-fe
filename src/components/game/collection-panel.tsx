"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { useSession } from "@/lib/auth";
import { useArtifactAction, useCharacter } from "@/lib/character-api";
import { artifactCatalog, artifactDetails, artifactBonus } from "@/lib/artifact";

export function CollectionPanel({ title, onClose, characterId }: { title: "Shop" | "Artifacts"; onClose: () => void; characterId?: string }) {
  const closeRef = useRef<HTMLButtonElement>(null), busy = useRef(false);
  const session = useSession(), state = useCharacter(session.data?.user.id), action = useArtifactAction(session.data?.user.id);
  const [notice, setNotice] = useState("");
  const gold = state.data?.gold ?? 0;
  const character = state.data?.characters.find((member) => member.id === characterId);
  const items = title === "Shop"
    ? artifactCatalog.map((item) => ({ ...item, id: item.stat, characterId: null as string | null, enhancementLevel: 0 }))
    : (state.data?.artifacts ?? []).map((item) => ({ ...artifactDetails(item.stat), ...item }));

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  function perform(input: Parameters<typeof action.mutate>[0], success: string) {
    if (busy.current) return;
    busy.current = true; setNotice("");
    action.mutate(input, { onSuccess: () => setNotice(success), onSettled: () => { busy.current = false; } });
  }

  const buttonClass = "cursor-pointer rounded-lg border border-[#b8a76d] bg-[#e4d895] px-4 py-2 text-sm font-semibold text-[#17392e] outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8] disabled:cursor-not-allowed disabled:opacity-50";
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="collection-title" className="absolute inset-0 z-40 overflow-auto bg-gradient-to-b from-[#102e29] to-[#3d5e47] text-[#f1ebce]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    }
  }}>
    <header className="sticky top-0 z-10 border-b border-[#708360] bg-[#102e29] p-6">
      <h2 id="collection-title" className="pr-12 text-2xl font-semibold">{characterId ? `Equip: ${character?.name ?? "Character"}` : title}</h2>
      <p className="mt-2 text-sm text-[#c1cda9]">Gold: {gold.toLocaleString()} · {title === "Shop" ? "Artifacts cost 500 gold" : "Enhance for 1,000 gold · +2 main stat per level"}</p>
      {characterId && <p className="mt-1 text-xs text-[#c1cda9]">One equipped artifact per character.</p>}
      <p role={action.error ? "alert" : "status"} className={`mt-2 min-h-5 text-sm ${action.error ? "text-[#ffbca8]" : "text-[#e4d895]"}`}>{action.error?.message ?? (action.isPending ? "Saving…" : notice)}</p>
      <button ref={closeRef} type="button" aria-label={`Close ${title}`} onClick={onClose} className="absolute top-4 right-4 grid size-12 cursor-pointer place-items-center rounded-xl border border-[#c1cda9] bg-[#163a30] outline-none focus-visible:ring-2 focus-visible:ring-[#fff0b8]"><X size={20} /></button>
    </header>
    <div className="mx-auto max-w-[768px] space-y-3 p-6">
      {state.isPending && <p role="status">Loading artifacts…</p>}
      {state.isError && <div role="alert" className="text-[#ffbca8]"><p>{state.error.message}</p><button type="button" onClick={() => void state.refetch()} className={`${buttonClass} mt-2`}>Retry</button></div>}
      {characterId && <div className="rounded-xl border border-[#708360] bg-[#163a30] p-4">
        <h3 className="font-semibold">Empty artifact slot</h3><p className="my-2 text-sm text-[#c1cda9]">Remove your equipped artifact.</p>
        <button type="button" className={buttonClass} disabled={action.isPending || !character?.artifactId} onClick={() => perform({ characterId, artifactId: null }, "Artifact unequipped.")}>Unequip</button>
      </div>}
      {items.map((item) => {
        const owner = state.data?.characters.find((member) => member.id === item.characterId);
        const equipped = !!characterId && item.id === character?.artifactId;
        const owned = state.data?.artifacts.filter((artifact) => artifact.stat === item.stat).length ?? 0;
        const enhancing = action.isPending && action.variables && "enhanceId" in action.variables && action.variables.enhanceId === item.id;
        return <article key={item.id} className={`rounded-xl border bg-[#163a30] p-4 ${equipped ? "border-[#e4d895]" : "border-[#708360]"}`}>
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="size-8 shrink-0 rotate-45 rounded-sm" style={{ backgroundColor: item.color }} />
            <div className="min-w-0"><h3 className="font-semibold">{item.name}{item.enhancementLevel > 0 ? ` · Enhance +${item.enhancementLevel}` : ""}</h3>
              <p className="mt-1 text-sm" style={{ color: item.color }}>+{artifactBonus(item.enhancementLevel)} {item.label}</p>
              <p className="mt-1 text-xs text-[#c1cda9]">{title === "Shop" ? `Owned: ${owned}` : owner ? `Equipped: ${owner.name}${equipped ? " · Selected" : ""}` : "Not equipped"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {title === "Shop" ? <button type="button" className={buttonClass} disabled={action.isPending || gold < 500} onClick={() => perform({ stat: item.stat }, `${item.name} purchased.`)} aria-label={`Buy ${item.name} for 500 gold`}>Buy · 500 gold</button> : <>
              {characterId && <button type="button" className={buttonClass} disabled={action.isPending || equipped || (!!item.characterId && item.characterId !== characterId)} onClick={() => perform({ characterId, artifactId: item.id }, "Artifact equipment saved.")} aria-label={`Equip ${item.name}`}>{equipped ? "Equipped" : "Equip"}</button>}
              <button type="button" className={buttonClass} disabled={action.isPending || gold < 1000} onClick={() => perform({ enhanceId: item.id }, `${item.name} enhanced! +${artifactBonus(item.enhancementLevel + 1)} ${item.label}.`)} aria-label={`Enhance ${item.name} for 1,000 gold`}>{enhancing ? "Enhancing…" : "Enhance · 1,000 gold"}</button>
              <span className="text-xs text-[#c1cda9]">Next: +{artifactBonus(item.enhancementLevel + 1)} {item.label}</span>
            </>}
          </div>
          {gold < (title === "Shop" ? 500 : 1000) && <p className="mt-2 text-xs text-[#e4d895]">Need {((title === "Shop" ? 500 : 1000) - gold).toLocaleString()} more gold to {title === "Shop" ? "buy" : "enhance"}.</p>}
        </article>;
      })}
      {!state.isPending && !state.isError && !items.length && <p className="text-[#c1cda9]">No artifacts yet. Visit the Shop to buy one.</p>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
