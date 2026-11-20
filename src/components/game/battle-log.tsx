"use client";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function BattleLog({ children, label = "Battle log", className = "", style, listStyle, expanded, onExpandedChange, defaultExpanded = true }: {
  children: ReactNode; label?: string; className?: string; style?: CSSProperties; listStyle?: CSSProperties;
  expanded?: boolean; onExpandedChange?: (expanded: boolean) => void; defaultExpanded?: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const open = expanded ?? localExpanded, id = useId();
  return <section aria-label={label} className={`battle-info overflow-hidden text-xs ${className}`} style={style}>
    <button type="button" aria-label={open ? "Hide battle log" : "Show battle log"} aria-expanded={open} aria-controls={id} onClick={() => {
      if (onExpandedChange) onExpandedChange(!open); else setLocalExpanded(!open);
    }} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#805523]">
      <span>Battle log</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <ol id={id} tabIndex={0} className="space-y-1 overflow-auto overscroll-contain px-3 pb-3 break-words focus-visible:outline-2 focus-visible:outline-[#805523]" style={{ maxHeight: "16vh", ...listStyle }}>{children}</ol>}
  </section>;
}
