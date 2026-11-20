"use client";

export interface Skill2Control { id: string; name: string; enabled: boolean }

export function Skill2Controls({ fighters, open, onOpenChange, busy, onChange }: {
  fighters?: Skill2Control[]; open: boolean; onOpenChange: (open: boolean) => void;
  busy: boolean; onChange: (fighterId: string, enabled: boolean) => void;
}) {
  if (!fighters?.length) return null;
  const button = "menu-action inline-flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm disabled:opacity-50";
  return <div className="relative">
    <button type="button" className={button} aria-expanded={open} onClick={() => onOpenChange(!open)}>Skill 2</button>
    {open && <div className="menu-info absolute right-0 top-full mt-2 w-48 space-y-1 p-2 shadow-xl">
      {fighters.map(fighter => <button key={fighter.id} type="button" className={`${button} w-full justify-between`} disabled={busy} aria-label={`Skill 2 for ${fighter.name}`} aria-pressed={fighter.enabled} onClick={() => onChange(fighter.id, !fighter.enabled)}>
        <span>{fighter.name}</span><span>{fighter.enabled ? "On" : "Off"}</span>
      </button>)}
    </div>}
  </div>;
}
