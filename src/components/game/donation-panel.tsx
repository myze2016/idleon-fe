"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { useSession } from "@/lib/auth";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";
import { donationTiers, infoBoxSkin, infoBoxStyle } from "./info-box-skins";
import { SupportContributionForm } from "./support-identity-form";

const action = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-not-allowed disabled:opacity-50";

export function DonationPanel({ onClose }: { onClose: () => void }) {
  const session = useSession(), closeRef = useRef<HTMLButtonElement>(null);
  const tier = session.data?.user.donationTier ?? 0;
  const [showContribution, setShowContribution] = useState(false);
  const [preview, setPreview] = useState(tier || 1), [compact, setCompact] = useState(true);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = panel.current; if (!element) return;
    const observer = new ResizeObserver(() => setCompact(element.clientWidth < 740));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  return <ResponsiveCanvasFrame fit minHeight={showContribution ? 740 : 560} narrowMinHeight={showContribution ? 740 : 620}><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="donation-title" className="paper-menu absolute inset-0 z-40 overflow-hidden bg-[#efdfb8] text-[#43311f]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close support" className={`${action} absolute right-4 top-4 z-10 grid size-12 place-items-center p-0`}><X size={20} /></button>
    <div className="absolute inset-3 flex flex-col gap-3 [overflow-wrap:anywhere] sm:inset-4" style={{ paddingTop: 56 }}>
    <header className="menu-info mx-auto w-full max-w-5xl shrink-0 p-3"><h2 id="donation-title" className="flex items-center gap-2 text-xl font-semibold"><Heart size={22} className="shrink-0" aria-hidden="true" /> Support the game</h2>
      {!showContribution && <><p className="mt-2 text-xs text-[#71583c]">Donate any amount to help the game grow. Skins are a thank-you; everyone earns wishes through gameplay.</p>
      <p className="mt-1 text-xs text-[#71583c]">Occasional supporter gifts are surprises, not guaranteed rewards.</p></>}
      <p className="mt-2 text-sm">Your tier: <strong>{donationTiers.find((entry) => entry.tier === tier)?.name ?? "Community"}</strong> · {infoBoxSkin(tier).name} skin</p>
    </header>
    {showContribution ? <SupportContributionForm onBack={() => setShowContribution(false)} /> : <>
    <div className="mx-auto w-full max-w-5xl shrink-0"><button type="button" className={action} onClick={() => setShowContribution(true)}>Donate any amount</button></div>
    {compact && <nav aria-label="Supporter skin previews" className="mx-auto flex w-full max-w-5xl gap-2">{donationTiers.map(entry => <button key={entry.tier} type="button" aria-pressed={preview === entry.tier} onClick={() => setPreview(entry.tier)} className={`${action} min-h-11 min-w-0 flex-1 px-2 text-xs`}>{entry.name}</button>)}</nav>}
    <div className="mx-auto grid w-full max-w-5xl min-h-0 gap-3" style={{ gridTemplateColumns: compact ? "1fr" : "repeat(3,minmax(0,1fr))" }}>{donationTiers.filter(entry => !compact || entry.tier === preview).map((entry) => <article key={entry.tier} className="menu-info flex min-w-0 flex-col gap-2 p-3">
      <div><h3 className="text-lg font-semibold">{entry.name}</h3><p className="mt-1 text-xs text-[#71583c]">For donations of ₱{entry.minimumAmount} or more</p></div>
      <div className="skin-preview space-y-1 p-3" style={infoBoxStyle(entry.tier)} aria-label={`${entry.skin} info-box skin preview`}><p className="text-xs uppercase tracking-widest">{entry.skin}</p><p className="font-semibold">Your adventure</p><p className="text-xs">Account level · Gold · EXP</p></div>
      <p className="text-xs text-[#71583c]">{entry.skin} info boxes in your room, battles, and menus.</p>
      {tier === entry.tier && <p className="mt-auto text-sm font-semibold">Currently active</p>}
    </article>)}</div>
    </>}
    </div>
  </div></ResponsiveCanvasFrame>;
}

