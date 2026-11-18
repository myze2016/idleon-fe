"use client";
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ScrollText, X } from "lucide-react";
import { api } from "@/lib/api";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

type PatchPage = { patches: { version: number; changes: string[]; publishedAt: string }[]; nextCursor: number | null };
const action = "menu-action min-h-10 cursor-pointer px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function PatchNotesPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const notes = useInfiniteQuery({ queryKey: ["patch-notes"], initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => api<PatchPage>(`/patch-notes${pageParam === null ? "" : `?before=${pageParam}`}`),
    getNextPageParam: last => last.nextCursor ?? undefined, staleTime: 0 });
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  const patches = notes.data?.pages.flatMap(page => page.patches) ?? [];
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="patch-notes-title" className="paper-menu absolute inset-0 z-40 overflow-auto p-6 text-[#43311f]" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header className="mx-auto max-w-3xl pr-14"><h2 id="patch-notes-title" className="flex items-center gap-2 text-2xl font-semibold"><ScrollText size={24} aria-hidden="true" />Patch notes</h2><p className="mt-2 text-sm">The latest published character, enemy and skill balance changes.</p></header>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close patch notes" className={action + " absolute right-4 top-4 grid size-12 place-items-center p-0"}><X size={20} /></button>
    <div className="mx-auto mt-6 max-w-3xl space-y-4">
      {notes.isPending && <p role="status">Loading patch notes…</p>}
      {notes.error && <div role="alert" className="menu-info space-y-3 p-4"><p>{notes.error.message}</p><button className={action} onClick={() => void (notes.isFetchNextPageError ? notes.fetchNextPage() : notes.refetch())}>Try again</button></div>}
      {!notes.isPending && !notes.error && !patches.length && <div className="menu-info p-5"><p className="font-semibold">No balance updates published yet.</p><p className="mt-2 text-sm">New patch notes will appear here when an admin publishes a balance change.</p></div>}
      {patches.map(patch => <article key={patch.version} className="menu-info p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold">Balance update {patch.version}</h3><time dateTime={patch.publishedAt} className="text-xs">{new Date(patch.publishedAt).toLocaleString()}</time></div><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed">{patch.changes.map((change, index) => <li key={index}>{change}</li>)}</ul></article>)}
      {notes.hasNextPage && <button className={action} disabled={notes.isFetchingNextPage} onClick={() => void notes.fetchNextPage()}>{notes.isFetchingNextPage ? "Loading…" : "Older patch notes"}</button>}
    </div>
  </div></ResponsiveCanvasFrame>;
}
