"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DamageEntry } from "@/lib/battle-damage";

export function DamageSpread({ rows, compact, top, pad }: { rows: DamageEntry[]; compact: boolean; top: number; pad: number }) {
  const [expanded, setExpanded] = useState(true);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  return <section aria-label="Live battle damage spread" className="absolute z-10 overflow-hidden rounded-xl border border-[#708360] bg-[#102c26ed] text-[#f1ebce]"
    style={{ width: compact ? 190 : 248, maxWidth: "calc(100% - 20px)", right: pad, top }}>
    <button type="button" aria-expanded={expanded} aria-controls="damage-spread-rows" onClick={() => setExpanded((value) => !value)} className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e4d895]">
      <span>Damage · {total.toLocaleString()}</span>{expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </button>
    {expanded && <div id="damage-spread-rows" className="overflow-auto px-3 pb-3" style={{ maxHeight: compact ? "28vh" : "38vh" }}>
      <p className="mb-2 text-[10px] text-[#c1cda9]">Current battle · actual HP damage</p>
      {sorted.length ? <ol className="space-y-2">{sorted.map((row) => {
        const share = total ? row.total / total * 100 : 0;
        return <li key={row.id}>
          <div className="flex justify-between gap-2 text-[11px]"><span className="truncate">{row.name}</span><span className="shrink-0 tabular-nums">{row.total.toLocaleString()} · {share.toFixed(1)}%</span></div>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded bg-[#365642]" aria-hidden="true">
            <span style={{ width: `${total ? row.basic / total * 100 : 0}%` }} className="bg-[#e4d895]" />
            <span style={{ width: `${total ? row.skill / total * 100 : 0}%` }} className="bg-[#69b7ff]" />
            <span style={{ width: `${total ? row.dot / total * 100 : 0}%` }} className="bg-[#ef7e89]" />
          </div>
          <p className="mt-0.5 text-[9px] tabular-nums text-[#c1cda9]">Basic {row.basic.toLocaleString()} · Skill {row.skill.toLocaleString()} · DoT {row.dot.toLocaleString()}</p>
        </li>;
      })}</ol> : <p className="text-xs text-[#c1cda9]">Waiting for battle…</p>}
      <p className="mt-3 flex flex-wrap gap-x-2 text-[9px]"><span className="text-[#e4d895]">Basic</span><span className="text-[#69b7ff]">Skill</span><span className="text-[#ef7e89]">Poison / bleed</span></p>
    </div>}
  </section>;
}
