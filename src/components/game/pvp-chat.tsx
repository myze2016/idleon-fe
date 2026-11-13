"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ChatMessage { id: string; userId: string; name: string; body: string; createdAt: string }
interface ChatHistory { messages: ChatMessage[] }

export function PvpChat({ code, userId, ended }: { code: string; userId: string; ended: boolean }) {
  const [draft, setDraft] = useState("");
  const scroll = useRef<HTMLDivElement>(null), follow = useRef(true);
  const client = useQueryClient(), key = ["pvp-chat", userId, code];
  const history = useQuery({ queryKey: key, queryFn: () => api<ChatHistory>(`/pvp/${code}/chat`), retry: false,
    refetchInterval: (query) => ended || query.state.error ? false : 1000 });
  const send = useMutation({ mutationFn: (body: string) => api<ChatHistory>(`/pvp/${code}/chat`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: async (data) => { setDraft(""); follow.current = true; await client.cancelQueries({ queryKey: key }); client.setQueryData(key, data); } });
  const lastId = history.data?.messages.at(-1)?.id;
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [lastId]);
  const error = send.error?.message ?? history.error?.message;

  return <section aria-label="PvP room chat" className="space-y-3 rounded-xl border border-[#708360] bg-[#102e29] p-4">
    <h3 className="font-semibold text-[#e4d895]">Room chat</h3>
    <div ref={scroll} role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" tabIndex={0}
      onScroll={(event) => { const box = event.currentTarget; follow.current = box.scrollHeight - box.scrollTop - box.clientHeight < 40; }}
      className="h-[clamp(8rem,20dvh,12rem)] space-y-2 overflow-y-auto overscroll-contain rounded-lg bg-[#163a30] p-3 text-sm [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-[#fff0b8]">
      {history.isPending ? <p className="text-[#c1cda9]">Loading messages…</p> : history.data?.messages.length ? history.data.messages.map((message) => <p key={message.id} className="break-words [overflow-wrap:anywhere]">
        <span className={message.userId === userId ? "font-semibold text-[#e4d895]" : "font-semibold text-[#a9d4ff]"}>{message.name}{message.userId === userId ? " (You)" : ""}: </span>
        <span className="whitespace-pre-wrap text-[#f1ebce]">{message.body}</span>
      </p>) : <p className="text-[#c1cda9]">No messages yet. Say hello!</p>}
    </div>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && !send.isPending && !ended) send.mutate(draft); }}>
      <input aria-label="Chat message" placeholder={ended ? "This room has ended" : "Message the other player…"} value={draft} maxLength={300} disabled={send.isPending || ended}
        onChange={(event) => { setDraft(event.target.value); if (send.isError) send.reset(); }}
        className="min-w-0 flex-1 rounded-lg border border-[#708360] bg-[#163a30] px-3 py-2 text-sm text-[#f1ebce] outline-none focus-visible:ring-2 focus-visible:ring-[#e4d895] disabled:opacity-50" />
      <button type="submit" disabled={!draft.trim() || send.isPending || ended} className="cursor-pointer rounded-lg border border-[#b8a76d] bg-[#e4d895] px-4 py-2 text-sm font-semibold text-[#17392e] focus-visible:outline-2 focus-visible:outline-[#fff0b8] disabled:cursor-not-allowed disabled:opacity-50">{send.isPending ? "Sending…" : "Send"}</button>
    </form>
    {error && <p role="alert" className="text-xs text-[#ffbca8]">{error}</p>}
  </section>;
}
