"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";

interface ChatMessage { id: string; userId: string; name: string; body: string; createdAt: string }
interface ChatHistory { messages: ChatMessage[] }

export const PvpChat = memo(function PvpChat({ code, userId, ended, onClose, fill = false }: { code: string; userId: string; ended: boolean; onClose?: () => void; fill?: boolean }) {
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

  return <section aria-label="PvP room chat" className="menu-info overflow-hidden text-[#43311f]" style={{ display: "flex", flexDirection: "column", height: fill ? "100%" : 320, minHeight: 0 }}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#a3835866] px-3 py-2">
      <div><h3 className="flex items-center gap-2 font-serif text-base font-semibold"><MessageCircle size={17} />Room chat</h3><p className="mt-0.5 text-[10px] text-[#71583c]">Only players in this room</p></div>
      {onClose && <button type="button" onClick={onClose} aria-label="Close arena chat" className="menu-action grid size-11 shrink-0 cursor-pointer place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[#805523]"><X size={17} /></button>}
    </header>
    <div ref={scroll} role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" tabIndex={0}
      onScroll={(event) => { const box = event.currentTarget; follow.current = box.scrollHeight - box.scrollTop - box.clientHeight < 40; }}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 text-sm [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-[#805523]" style={{ background: "#fff5dc55" }}>
      {history.isPending ? <p className="py-4 text-center text-xs text-[#71583c]">Loading messages?</p> : history.data?.messages.length ? history.data.messages.map((message) => {
        const mine = message.userId === userId;
        return <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
          <div className="max-w-[90%] min-w-0 rounded-lg border px-3 py-2 [overflow-wrap:anywhere]" style={{ background: mine ? "#e3c58d" : "#fff0cf", borderColor: mine ? "#b28c53" : "#cdb184" }}>
            <p className="mb-1 text-[10px] font-semibold" style={{ color: mine ? "#805523" : "#315f8e" }}>{mine ? "You" : message.name}</p>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#43311f]">{message.body}</p>
          </div>
        </div>;
      }) : <p className="py-6 text-center text-xs text-[#71583c]">No messages yet. Say hello!</p>}
    </div>
    <form className="flex shrink-0 items-center gap-2 border-t border-[#a3835866] p-3" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && !send.isPending && !ended) send.mutate(draft); }}>
      <input aria-label="Chat message" placeholder={ended ? "Room ended" : "Write a message?"} value={draft} maxLength={300} disabled={send.isPending || ended}
        onChange={(event) => { setDraft(event.target.value); if (send.isError) send.reset(); }}
        className="min-h-11 min-w-0 flex-1 rounded-md border border-[#ac8b5c] px-3 py-2 text-sm text-[#43311f] outline-none placeholder:text-[#947851] focus-visible:ring-2 focus-visible:ring-[#805523] disabled:opacity-50" style={{ background: "#fff3d8", boxShadow: "inset 0 1px 3px #80552322" }} />
      <button type="submit" aria-label={send.isPending ? "Sending message" : "Send message"} disabled={!draft.trim() || send.isPending || ended} className="menu-action grid size-11 shrink-0 cursor-pointer place-items-center focus-visible:outline-2 focus-visible:outline-[#805523] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /></button>
    </form>
    {error && <p role="alert" className="shrink-0 px-3 pb-3 text-xs text-[#a13725]">{error}</p>}
  </section>;
});
