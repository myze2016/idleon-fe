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
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="donation-title" className="paper-menu absolute inset-0 z-40 overflow-hidden bg-[#efdfb8] text-[#43311f]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close support" className={`${action} absolute right-4 top-4 z-10 grid size-12 place-items-center p-0`}><X size={20} /></button>
    <div className="absolute inset-[8%] overflow-y-auto overscroll-contain p-3 [overflow-wrap:anywhere]">
    <header className="menu-info mx-auto w-full max-w-5xl p-5"><h2 id="donation-title" className="flex items-center gap-2 text-2xl font-semibold"><Heart size={24} className="shrink-0" aria-hidden="true" /> Support the game</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#71583c]">Donate any amount to help the game grow. These skins are a thank-you for your support, not fixed-price packages. Everyone earns wishes through gameplay.</p>
      <p className="mt-2 text-sm font-semibold">We sometimes give freebies to supporters.</p><p className="mt-1 text-xs text-[#71583c]">Occasional gifts are a surprise, not a guaranteed reward or a scheduled benefit.</p>
      <p className="mt-2 text-sm">Your tier: <strong>{donationTiers.find((entry) => entry.tier === tier)?.name ?? "Community"}</strong> · {infoBoxSkin(tier).name} skin</p>
    </header>
    {showContribution ? <SupportContributionForm onBack={() => setShowContribution(false)} /> : <>
    <div className="mx-auto mt-5 max-w-5xl"><button type="button" className={action} onClick={() => setShowContribution(true)}>Donate any amount</button></div>
    <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">{donationTiers.map((entry) => <article key={entry.tier} className="menu-info flex flex-col gap-4 p-5">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#71583c]">Supporter thank-you</p><h3 className="mt-1 text-xl font-semibold">{entry.name}</h3><p className="mt-2 text-sm text-[#71583c]">For donations of ₱{entry.minimumAmount} or more</p></div>
      <div className="skin-preview space-y-2 p-4" style={infoBoxStyle(entry.tier)} aria-label={`${entry.skin} info-box skin preview`}><p className="text-xs uppercase tracking-widest">{entry.skin}</p><p className="font-semibold">Your adventure</p><p className="text-sm">Account level · Gold · EXP</p></div>
      <p className="text-sm text-[#71583c]">{entry.skin} info boxes throughout your room, battles, and menus.</p>
      {tier === entry.tier && <p className="mt-auto text-sm font-semibold">Currently active</p>}
    </article>)}</div>
    </>}
    </div>
  </div></ResponsiveCanvasFrame>;
}

