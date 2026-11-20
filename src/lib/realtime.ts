"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

type Channel = "gathering" | "pvp" | "pvp-chat" | "pvp-lobby";
interface Parameters { roomId?: number; token?: string; code?: string }
export type RealtimeEvent = { kind: "resync" | "gathering" | "pvp" | "pvp-chat" | "pvp-lobby" }
  | { kind: "move"; roomId: number; userId: string; x: number; y: number; at: string };
interface Subscriber { channel: Channel; parameters: Parameters; status: (ready: boolean) => void; event: (event: RealtimeEvent) => void }

// Share one authenticated connection across Gathering, the PvP room and chat.
const subscriptions = new Map<string, Subscriber>();
let socket: WebSocket | null = null, authenticated = false, connecting = false, sequence = 0, attempts = 0;
let retry: ReturnType<typeof setTimeout> | undefined, authenticationTimeout: ReturnType<typeof setTimeout> | undefined;
let ticketRequest: AbortController | null = null;
function send(packet: object) {
  if (!authenticated || socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > 128 * 1024) return false;
  socket.send(JSON.stringify(packet)); return true;
}
function subscribePacket(id: string, subscription: Subscriber) { send({ type: "subscribe", id, channel: subscription.channel, ...subscription.parameters }); }
function reconnect() {
  if (!subscriptions.size || retry) return;
  retry = setTimeout(() => { retry = undefined; void connect(); }, Math.min(15000, 1000 * 2 ** Math.min(attempts++, 4)) + Math.random() * 250);
}
async function connect() {
  if (connecting || socket || !subscriptions.size) return;
  connecting = true; const controller = new AbortController(); ticketRequest = controller;
  try {
    const ticket = await api<{ ticket: string; url: string }>("/realtime/ticket", { method: "POST", body: "{}", signal: controller.signal });
    if (controller.signal.aborted || !subscriptions.size) return;
    const connection = new WebSocket(ticket.url); socket = connection;
    authenticationTimeout = setTimeout(() => connection.close(), 8000);
    connection.onopen = () => { if (socket === connection) connection.send(JSON.stringify({ type: "auth", ticket: ticket.ticket })); };
    connection.onmessage = message => {
      if (socket !== connection) return;
      let packet;
      try { packet = JSON.parse(message.data); } catch { connection.close(); return; }
      if (packet.type === "ready") {
        clearTimeout(authenticationTimeout); authenticated = true; attempts = 0;
        for (const [id, subscription] of subscriptions) subscribePacket(id, subscription);
      } else if (packet.type === "subscribed") {
        const subscription = subscriptions.get(packet.id);
        subscription?.status(true); subscription?.event({ kind: "resync" });
      } else if (packet.type === "error") subscriptions.get(packet.id)?.status(false);
      else if (packet.type === "event") subscriptions.get(packet.id)?.event(packet.event);
    };
    connection.onerror = () => connection.close();
    connection.onclose = () => {
      if (socket !== connection) return;
      clearTimeout(authenticationTimeout); socket = null; authenticated = false;
      for (const subscription of subscriptions.values()) subscription.status(false);
      reconnect();
    };
  } catch { if (!controller.signal.aborted) reconnect(); }
  finally { if (ticketRequest === controller) ticketRequest = null; connecting = false; if (subscriptions.size && !socket && !retry) reconnect(); }
}
function register(subscription: Subscriber) {
  const id = `r${++sequence}`;
  subscriptions.set(id, subscription);
  queueMicrotask(() => { if (subscriptions.get(id) === subscription) subscription.status(false); });
  if (authenticated) subscribePacket(id, subscription); else void connect();
  return {
    send: (x: number, y: number) => send({ type: "move", id, x, y }),
    close: () => {
      send({ type: "unsubscribe", id }); subscriptions.delete(id);
      if (!subscriptions.size) {
        clearTimeout(retry); retry = undefined; clearTimeout(authenticationTimeout);
        ticketRequest?.abort();
        const previous = socket; socket = null; authenticated = false;
        previous?.close(); attempts = 0;
      }
    },
  };
}

export function useRealtime(channel: Channel, parameters: Parameters, enabled: boolean, onEvent: (event: RealtimeEvent) => void) {
  const callback = useRef(onEvent), registration = useRef<ReturnType<typeof register> | null>(null);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const { roomId, token, code } = parameters;
  const key = JSON.stringify([channel, roomId, token, code]);
  useEffect(() => { callback.current = onEvent; }, [onEvent]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const subscription = register({ channel, parameters: { roomId, token, code }, status: ready => { if (active) setReadyFor(ready ? key : null); }, event: event => { if (active) callback.current(event); } });
    registration.current = subscription;
    return () => { active = false; subscription.close(); if (registration.current === subscription) registration.current = null; };
  }, [enabled, channel, roomId, token, code, key]);
  const sendPosition = useCallback((x: number, y: number) => registration.current?.send(x, y) ?? false, []);
  return { ready: enabled && readyFor === key, sendPosition };
}
