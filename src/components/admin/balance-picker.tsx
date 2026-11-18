"use client";
import { useState } from "react";

export function BalancePicker({ label, options, selected, onSelect }: { label: string; options: { id: string; name: string; aliases?: string }[]; selected: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const matches = options.filter(option => `${option.name} ${option.id} ${option.aliases ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-3"><label className="block text-xs font-semibold">Search {label.toLowerCase()}<input type="search" className="menu-field mt-1 min-h-10 w-full px-3 py-2 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${label.toLowerCase()} by name…`} /></label>
    <p className="text-xs" role="status">{matches.length} matches · Editing: <strong>{options.find(option => option.id === selected)?.name}</strong></p>
    <div role="group" aria-label={`Select ${label.toLowerCase()}`} className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3">{matches.map(option => <button key={option.id} type="button" className="menu-action min-h-11 px-3 py-2 text-left text-xs" aria-pressed={selected === option.id} onClick={() => onSelect(option.id)}>{option.name}</button>)}</div>
    {!matches.length && <p className="text-sm">No matching {label.toLowerCase()}. Try another name.</p>}
  </div>;
}
