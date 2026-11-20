"use client";
import { Check, Slash } from "lucide-react";
import type { Skill2Control } from "./pvp-types";

const skillIcons = ["bouncing-glaive", "freeze-all", "axe-frenzy", "shackle", "mass-heal", "inferno",
  "speed-buff", "charge", "berserker-blow", "hero", "burst-fire"];

export function Skill2Controls({ fighters, busy, onChange }: {
  fighters?: Skill2Control[];
  busy: boolean; onChange: (fighterId: string, enabled: boolean) => void;
}) {
  if (!fighters?.length) return null;
  return <div role="group" aria-label="Skill 2 toggles" className="pointer-events-none absolute inset-x-2 bottom-3 z-20 flex flex-wrap justify-center gap-1.5">
    {fighters.map(fighter => {
      const index = skillIcons.indexOf(fighter.skillId ?? "");
      const tile = index < 0 ? 11 : index;
      const label = `${fighter.skillName ?? "Skill 2"} for ${fighter.name}`;
      return <button key={fighter.id} type="button" disabled={busy} aria-label={label} aria-pressed={fighter.enabled}
        title={`${label} (${fighter.enabled ? "on" : "off"})`} onClick={() => onChange(fighter.id, !fighter.enabled)}
        className={`menu-info pointer-events-auto flex w-16 cursor-pointer flex-col items-center gap-1 rounded-lg border p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-wait disabled:opacity-60 ${fighter.enabled ? "border-emerald-700 bg-[#f5e8b8]" : "border-stone-500 bg-[#dfd3b7]"}`}>
        <span aria-hidden="true" className="relative grid size-12 place-items-center rounded bg-[#181316]">
          <span className={`absolute inset-0 rounded bg-[url('/sprites/skill-2-icons-v1.webp')] bg-[length:400%_300%] ${fighter.enabled ? "" : "opacity-60 grayscale"}`}
            style={{ backgroundPosition: `${(tile % 4) * 100 / 3}% ${Math.floor(tile / 4) * 50}%` }} />
          {fighter.enabled ? <Check size={18} className="absolute -right-1 -bottom-0.5 rounded-full bg-emerald-800 p-0.5 text-white" />
            : <Slash size={36} className="absolute text-white drop-shadow-[0_1px_3px_black]" />}
        </span>
        <span aria-hidden="true" className="w-full truncate text-center text-xs font-semibold leading-tight">{fighter.name}</span>
      </button>;
    })}
  </div>;
}
