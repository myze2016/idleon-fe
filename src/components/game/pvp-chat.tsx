"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";

interface ChatMessage { id: string; userId: string; name: string; body: string; createdAt: string }
interface ChatHistory { messages: ChatMessage[] }

export const PvpChat = memo(function PvpChat({ code, userId, ended }: { code: string; userId: string; ended: boolean }) {
  const [draft, setDraft] = useState("");
  const scroll = useRef<HTMLDivElement>(null), follow = useRef(true);
  const client = useQueryClient(), key = ["pvp-chat", userId, code];
  const live = useRealtime("pvp-chat", { code }, !ended && !!userId, () => { void client.invalidateQueries({ queryKey: ["pvp-chat", userId, code] }); });
  const history = useQuery({ queryKey: key, queryFn: ({ signal }) => api<ChatHistory>(`/pvp/${code}/chat`, { signal }), retry: false,
    refetchInterval: (query) => ended || query.state.error ? false : live.ready ? 15000 : 1000 });
  const send = useMutation({ mutationFn: (body: string) => api<ChatHistory>(`/pvp/${code}/chat`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: async (data) => { setDraft(""); follow.current = true; await client.cancelQueries({ queryKey: key }); client.setQueryData(key, data); } });
  const lastId = history.data?.messages.at(-1)?.id;
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [lastId]);
  const error = send.error?.message ?? history.error?.message;

  return <section aria-label="PvP room chat" className="menu-info space-y-3 p-4 text-[#43311f]">
    <h3 className="font-semibold text-[#805523]">Room chat</h3>
    <div ref={scroll} role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" tabIndex={0}
      onScroll={(event) => { const box = event.currentTarget; follow.current = box.scrollHeight - box.scrollTop - box.clientHeight < 40; }}
      className="h-[clamp(8rem,20dvh,12rem)] space-y-2 overflow-y-auto overscroll-contain menu-info rounded-lg bg-[#efdfb8] p-3 text-sm [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-[#805523]">
      {history.isPending ? <p className="text-[#71583c]">Loading messages…</p> : history.data?.messages.length ? history.data.messages.map((message) => <p key={message.id} className="break-words [overflow-wrap:anywhere]">
        <span className={message.userId === userId ? "font-semibold text-[#805523]" : "font-semibold text-[#315f8e]"}>{message.name}{message.userId === userId ? " (You)" : ""}: </span>
        <span className="whitespace-pre-wrap text-[#43311f]">{message.body}</span>
      </p>) : <p className="text-[#71583c]">No messages yet. Say hello!</p>}
    </div>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && !send.isPending && !ended) send.mutate(draft); }}>
      <input aria-label="Chat message" placeholder={ended ? "This room has ended" : "Message the other player…"} value={draft} maxLength={300} disabled={send.isPending || ended}
        onChange={(event) => { setDraft(event.target.value); if (send.isError) send.reset(); }}
        className="min-w-0 flex-1 rounded-lg menu-field border border-[#a38358] bg-[#efdfb8] px-3 py-2 text-sm text-[#43311f] outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:opacity-50" />
      <button type="submit" disabled={!draft.trim() || send.isPending || ended} className="menu-action min-h-11 cursor-pointer rounded-lg border border-[#a38358] px-4 py-2 text-sm font-semibold text-[#43311f] focus-visible:outline-2 focus-visible:outline-[#805523] disabled:cursor-not-allowed disabled:opacity-50">{send.isPending ? "Sending…" : "Send"}</button>
    </form>
    {error && <p role="alert" className="text-xs text-[#a13725]">{error}</p>}
  </section>;
});
