"use client";
import { ArtifactIcon } from "./artifact-icon";
import { ArtifactOwnerIcon } from "./artifact-owner-icon";
import { sortArtifactInventory } from "@/lib/artifact-inventory";
import { CurrencyBadge } from "./currency-badge";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { useSession } from "@/lib/auth";
import { useArtifactAction, useCharacter } from "@/lib/character-api";
import { upgradeStep } from "@/lib/economy";
import { artifactCatalog, artifactDetails, artifactBonus, artifactStatText } from "@/lib/artifact";
import type { Artifact } from "@/lib/artifact";

function enhancementColor(level: number) {
  if (level >= 20) return "#a13725";
  if (level >= 15) return "#956000";
  if (level >= 10) return "#7535a0";
  if (level >= 5) return "#245fa0";
  return "#287044";
}

export function CollectionPanel({ title, onClose, characterId }: { title: "Shop" | "Artifacts"; onClose: () => void; characterId?: string }) {
  const closeRef = useRef<HTMLButtonElement>(null), busy = useRef(false);
  const session = useSession(), state = useCharacter(session.data?.user.id), action = useArtifactAction(session.data?.user.id);
  const [notice, setNotice] = useState("");
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null), detailCloseRef = useRef<HTMLButtonElement>(null), inspectionTrigger = useRef<HTMLButtonElement | null>(null);
  const [burst, setBurst] = useState<{ id: string; level: number; key: number } | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gold = state.data?.gold ?? 0;
  const economy = state.data?.economy;
  const character = state.data?.characters.find((member) => member.id === characterId);
  const items: (Artifact & { name: string; label: string; color: string })[] = title === "Shop"
    ? artifactCatalog.map((item) => ({ ...item, id: item.stat, characterId: null as string | null, enhancementLevel: 0 }))
    : (state.data?.artifacts ?? []).map((item) => ({ ...artifactDetails(item.stat), ...item }));

  const orderedItems = title === "Artifacts" ? sortArtifactInventory(items, state.data?.teamSlots ?? []) : items;
  const inspectedItem = title === "Artifacts" ? items.find(item => item.id === inspectedId) : undefined;
  useEffect(() => { if (inspectedId) detailCloseRef.current?.focus({ preventScroll: true }); }, [inspectedId]);
  function closeInspection() {
    setInspectedId(null);
    requestAnimationFrame(() => inspectionTrigger.current?.focus({ preventScroll: true }));
  }

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const seal = new Image(); seal.src = "/optimized/ui/summon-seal-v1.e9dffcda0c77.webp";
  }, []);
  useEffect(() => () => { if (burstTimer.current) clearTimeout(burstTimer.current); }, []);

  function perform(input: Parameters<typeof action.mutate>[0], success: string) {
    if (busy.current) return;
    busy.current = true; setNotice("");
    action.mutate(input, { onSuccess: (updated) => {
      setNotice(success);
      if ("enhanceId" in input) {
        const artifact = updated.artifacts.find(item => item.id === input.enhanceId);
        if (artifact) {
          if (burstTimer.current) clearTimeout(burstTimer.current);
          setBurst({ id: artifact.id, level: artifact.enhancementLevel, key: performance.now() });
          burstTimer.current = setTimeout(() => setBurst(null), 1900);
        }
      }
    }, onSettled: () => { busy.current = false; } });
  }

  const buttonClass = "menu-action cursor-pointer rounded-lg border border-[#a38358] paper-card bg-[#e4d895] px-4 py-2 text-sm font-semibold text-[#43311f] outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-not-allowed disabled:opacity-50";
  const cards = (title === "Shop" ? items : inspectedItem ? [inspectedItem] : []).map((item) => {
        const itemCost = title === "Shop" ? economy?.shopPrices[item.stat] ?? 500 : (economy ? upgradeStep(economy.artifactEnhancements, item.enhancementLevel).cost : 1000);
        const owner = state.data?.characters.find((member) => member.id === item.characterId);
        const equipped = !!characterId && item.id === character?.artifactId;
        const owned = state.data?.artifacts.filter((artifact) => artifact.stat === item.stat).length ?? 0;
        const enhancing = action.isPending && action.variables && "enhanceId" in action.variables && action.variables.enhanceId === item.id;
        return <article key={item.id} data-equipped={equipped} className={`paper-card menu-info artifact-enhance-card bg-[#e9d4a7] p-4 ${equipped ? "border-[#805523]" : "border-[#a38358]"}`}>
          {burst?.id === item.id && <div key={`glow-${burst.key}`} className="artifact-enhance-enhanced" aria-hidden="true" />}
          <div className="flex items-center gap-4">
            <div className="artifact-enhance-icon shrink-0 border-2 border-solid border-[#a38358] bg-[#efdfb8] p-2">
              <div key={burst?.id === item.id ? `icon-${burst.key}` : "icon-idle"} className={burst?.id === item.id ? "artifact-enhance-pop" : ""}><ArtifactIcon stat={item.stat} /></div>
              {burst?.id === item.id && <div key={`effects-${burst.key}`} className="artifact-enhance-burst" aria-hidden="true"><span className="artifact-enhance-seal" />{Array.from({ length: 12 }, (_, index) => <i key={index} className="artifact-enhance-spark" style={{ "--spark-x": `${Math.cos(index * Math.PI / 6) * 65}px`, "--spark-y": `${Math.sin(index * Math.PI / 6) * 65}px`, animationDelay: `${index % 3 * 40}ms` } as CSSProperties} />)}<span className="artifact-enhance-level">Enhance +{burst.level}</span></div>}
            </div>
            <div className="min-w-0"><h3 className="font-semibold">{item.name}{item.enhancementLevel > 0 && <span style={{ color: enhancementColor(item.enhancementLevel) }}> · Enhance +{item.enhancementLevel}</span>}</h3>
              <p className="mt-1 text-sm" style={{ color: "#70502e" }}>{artifactStatText(item.stat, item.enhancementLevel, economy?.artifactEnhancements)}</p>
              <p className="mt-1 text-xs text-[#71583c]">{title === "Shop" ? `Owned: ${owned}` : owner ? `Equipped: ${owner.name}${equipped ? " · Selected" : ""}` : "Not equipped"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {title === "Shop" ? <button type="button" className={buttonClass} disabled={action.isPending || gold < itemCost} onClick={() => perform({ stat: item.stat }, `${item.name} purchased.`)} aria-label={`Buy ${item.name} for ${itemCost.toLocaleString()} gold`}>Buy · {itemCost.toLocaleString()} gold</button> : <>
              {characterId && <button type="button" className={buttonClass} disabled={action.isPending || equipped || (!!item.characterId && item.characterId !== characterId)} onClick={() => perform({ characterId, artifactId: item.id }, "Artifact equipment saved.")} aria-label={`Equip ${item.name}`}>{equipped ? "Equipped" : "Equip"}</button>}
              <button type="button" className={buttonClass} disabled={action.isPending || gold < itemCost} onClick={() => perform({ enhanceId: item.id }, `${item.name} enhanced! +${artifactBonus(item.enhancementLevel + 1, economy?.artifactEnhancements)} ${item.label}.`)} aria-label={`Enhance ${item.name} for ${itemCost.toLocaleString()} gold`}>{enhancing ? "Enhancing…" : `Enhance · ${itemCost.toLocaleString()} gold`}</button>
              <span className="text-xs text-[#71583c]">Next: {artifactStatText(item.stat, item.enhancementLevel + 1, economy?.artifactEnhancements)}</span>
            </>}
          </div>
          {gold < itemCost && <p className="mt-2 text-xs text-[#805523]">Need {(itemCost - gold).toLocaleString()} more gold to {title === "Shop" ? "buy" : "enhance"}.</p>}
        </article>;
      });
  return <ResponsiveCanvasFrame fit minHeight={360}><div role="dialog" aria-modal="true" aria-labelledby="collection-title" className="paper-menu absolute inset-0 z-40 flex flex-col overflow-hidden paper-card bg-[#efdfb8] text-[#43311f]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (inspectedItem) closeInspection(); else onClose(); }
    if (event.key === "Tab") {
      const scope = inspectedItem ? detailRef.current : event.currentTarget;
      const buttons = Array.from(scope?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []).filter(button => button.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    }
  }}>
    <header inert={!!inspectedItem} className="relative z-10 shrink-0 border-b border-[#a38358] paper-card bg-[#efdfb8] p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="collection-title" className="min-w-[100px] flex-1 text-2xl font-semibold [overflow-wrap:anywhere]">{characterId ? `Equip: ${character?.name ?? "Character"}` : title}</h2>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <CurrencyBadge kind="gold" amount={gold} className="w-[clamp(144px,26vw,216px)]" />
          <button ref={closeRef} type="button" aria-label={`Close ${title}`} onClick={onClose} className="grid size-12 shrink-0 menu-action cursor-pointer place-items-center rounded-xl border border-[#4e301b] bg-[#51331e] text-[#fff0cc] outline-none focus-visible:ring-2 focus-visible:ring-[#805523]"><X size={20} /></button>
        </div>
      </div>
      <p className="mt-2 text-sm text-[#71583c]">{title === "Shop" ? "Artifact prices are listed below" : `${items.length} artifacts · Team equipment first · Select an icon for details`}</p>
      {characterId && <p className="mt-1 text-xs text-[#71583c]">One equipped artifact per character.</p>}
      {(action.error || action.isPending || notice) && <p role={action.error ? "alert" : "status"} className={`mt-2 text-sm ${action.error ? "text-[#a13725]" : "text-[#805523]"}`}>{action.error?.message ?? (action.isPending ? "Saving…" : notice)}</p>}
    </header>
    <div inert={!!inspectedItem} className="min-h-0 flex-1 overflow-auto overscroll-contain"><div className="mx-auto max-w-[960px] space-y-3 p-3 sm:p-4">
      {state.isPending && <p role="status">Loading artifacts…</p>}
      {state.isError && <div role="alert" className="text-[#a13725]"><p>{state.error.message}</p><button type="button" onClick={() => void state.refetch()} className={`${buttonClass} mt-2`}>Retry</button></div>}
      {characterId && <div className="menu-info flex items-center justify-between gap-3 p-3">
        <div><h3 className="text-sm font-semibold">Current artifact slot</h3><p className="text-xs text-[#71583c]">One artifact per character.</p></div>
        <button type="button" className={buttonClass} disabled={action.isPending || !character?.artifactId} onClick={() => perform({ characterId, artifactId: null }, "Artifact unequipped.")}>Unequip</button>
      </div>}
      {title === "Shop" ? cards : <div className="artifact-inventory-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }} aria-label="Artifact inventory, current team equipment first">
        {orderedItems.map(item => {
          const owner = state.data?.characters.find(member => member.id === item.characterId);
          const slot = item.characterId ? state.data?.teamSlots.indexOf(item.characterId) ?? -1 : -1;
          const selected = !!characterId && item.id === character?.artifactId;
          return <button key={item.id} type="button" data-artifact-id={item.id} data-team-slot={slot >= 0 ? slot + 1 : undefined} data-equipped={selected} style={{ display: "flex", minHeight: 96, alignItems: "center", justifyContent: "center", padding: "10px 8px 24px", boxShadow: slot >= 0 ? "inset 0 0 0 2px #c89b4d" : undefined }} className="menu-info artifact-inventory-item relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#805523]" aria-label={'Inspect '+item.name+', enhance +'+item.enhancementLevel+(owner ? ', equipped by '+owner.name+(slot >= 0 ? ', team slot '+(slot+1) : '') : ', not equipped')} onClick={event => { inspectionTrigger.current = event.currentTarget; if (!action.isPending) action.reset(); setNotice(""); setInspectedId(item.id); }}>
            <ArtifactIcon stat={item.stat} />
            <span className="absolute top-1 right-1 rounded border border-[#a38358] bg-[#fff0cf] px-1 text-[11px] font-bold tabular-nums" style={{ color: enhancementColor(item.enhancementLevel) }}>+{item.enhancementLevel}</span>
            {slot >= 0 && <span className="absolute bottom-1 left-1 rounded bg-[#805523] px-1 text-[10px] font-semibold text-[#fff0cc]">T{slot + 1}</span>}
            {owner && <span className="absolute right-1 bottom-1 rounded-full border border-[#a38358] bg-[#efdfb8]" title={owner.name}><ArtifactOwnerIcon character={owner} /></span>}
            {selected && <span className="sr-only">Currently equipped to the selected character</span>}
          </button>;
        })}
      </div>}
      {!state.isPending && !state.isError && !items.length && <p className="text-[#71583c]">No artifacts yet. Visit the Shop to buy one.</p>}
    </div></div>
    {inspectedItem && <div ref={detailRef} role="dialog" aria-modal="true" aria-labelledby="artifact-details-title" className="absolute inset-0 z-30 flex items-center justify-center bg-[#20150dcc] p-3">
      <div className="menu-info max-h-full w-full max-w-lg overflow-auto shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#a3835866] p-3"><h3 id="artifact-details-title" className="font-serif text-xl font-semibold">Artifact details</h3><button ref={detailCloseRef} type="button" aria-label="Close artifact details" className={buttonClass} onClick={closeInspection}><X size={18} /></button></div>
        {(action.error || action.isPending || notice) && <p role={action.error ? "alert" : "status"} className="px-4 pt-3 text-sm text-[#805523]">{action.error?.message ?? (action.isPending ? "Saving…" : notice)}</p>}
        {cards}
      </div>
    </div>}
  </div></ResponsiveCanvasFrame>;
}
