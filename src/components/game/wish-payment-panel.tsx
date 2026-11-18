"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, QrCode } from "lucide-react";
import { api } from "@/lib/api";
import { ResponsiveCanvasFrame } from "./responsive-canvas-frame";

interface WishPayment {
  id: string; status: "creating" | "pending" | "paid" | "expired";
  testMode: boolean; expiresAt: string; qrImage: string | null;
}
export function WishPaymentPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestKey = useRef<string | null>(null), credited = useRef<string | null>(null);
  const [order, setOrder] = useState<WishPayment | null>(null);
  const [now, setNow] = useState(Date.now);
  const client = useQueryClient();
  const latest = useQuery({ queryKey: ["wish-payment-latest", userId], queryFn: () => api<{ available: boolean; order: WishPayment | null }>("/payments/wish/latest"), retry: false });
  const create = useMutation({ mutationFn: () => {
    requestKey.current ??= crypto.randomUUID();
    return api<WishPayment>("/payments/wish", { method: "POST", headers: { "Idempotency-Key": requestKey.current } });
  }, onSuccess: (payment) => { setOrder(payment); requestKey.current = null; }, onError: () => { void latest.refetch(); } });
  const activeOrder = order ?? latest.data?.order ?? null;
  const status = useQuery({ queryKey: ["wish-payment", userId, activeOrder?.id], queryFn: () => api<WishPayment>(`/payments/wish/${encodeURIComponent(activeOrder!.id)}`), enabled: !!activeOrder, retry: false,
    refetchInterval: (query) => { const payment = query.state.data ?? activeOrder; return payment && payment.status !== "paid" && new Date(payment.expiresAt).getTime() > Date.now() ? 5000 : false; } });
  const payment = status.data ?? activeOrder, paid = payment?.status === "paid";
  const expired = !!payment && !paid && new Date(payment.expiresAt).getTime() <= now;
  const remaining = payment ? Math.max(0, Math.ceil((new Date(payment.expiresAt).getTime() - now) / 1000)) : 0;
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (paid && payment && credited.current !== payment.id) {
      credited.current = payment.id;
      void client.invalidateQueries({ queryKey: ["character", userId] });
      void client.invalidateQueries({ queryKey: ["wish-payment-latest", userId] });
    }
  }, [paid, payment, userId, client]);
  const button = "menu-action cursor-pointer px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
  return <ResponsiveCanvasFrame><div role="dialog" aria-modal="true" aria-labelledby="wish-payment-title" className="paper-menu absolute inset-0 z-40 overflow-auto bg-[#efdfb8] p-6 text-[#43311f]" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <h2 id="wish-payment-title" className="flex items-center gap-2 pr-14 text-2xl font-semibold"><QrCode aria-hidden="true" /> Buy Wish Currency</h2>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Back to Wish" className={`${button} absolute right-4 top-4 grid size-12 place-items-center p-0`}><X size={20} /></button>
    <div className="menu-info mx-auto mt-6 max-w-lg space-y-4 p-5 text-center">
      <p className="text-2xl font-semibold">₱10 = 100 Wish Currency</p>
      <p className="text-sm text-[#71583c]">Pay with GCash by scanning the QR Ph code. Wish currency is added after payment is confirmed.</p>
      {latest.isPending && <p role="status">Checking payments…</p>}
      {latest.data?.available === false && <p role="status">QR payments are not available yet. Please try again later.</p>}
      {payment?.testMode && <p className="rounded border border-[#805523] p-2 text-sm font-semibold">Test payment — no real money will be charged.</p>}
      {paid ? <p role="status" className="py-8 text-xl font-semibold">Payment confirmed! 100 wish currency added.</p> : expired ? <p role="status">This QR code has expired. Check its payment status before creating another code.</p> : payment ? <>
        {payment.qrImage ? <img src={payment.qrImage} alt="Scan this QR Ph code with GCash to pay 10 pesos" className="mx-auto h-64 w-64 max-w-full rounded bg-white p-3 object-contain" /> : <p role="status">Preparing your QR code. You can return later to check this order.</p>}
        {payment.qrImage && <a href={payment.qrImage} download="wish-payment-qr.png" className="inline-block underline underline-offset-4">Save QR image</a>}
        <p className="text-sm">Open GCash → Scan QR. On the same phone, save the image and choose Upload QR in GCash.</p>
        <p role="status" className="text-xs text-[#71583c]">Waiting for payment · Expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
      </> : null}
      {(create.error || status.error || latest.error) && <p role="alert" className="text-sm text-[#a13725]">{create.error?.message ?? status.error?.message ?? latest.error?.message}</p>}
      {!payment && <button type="button" disabled={create.isPending || latest.isPending || latest.data?.available !== true} className={button} onClick={() => create.mutate()}>{create.isPending ? "Creating QR…" : "Generate QR · ₱10"}</button>}
      {payment && !paid && <button type="button" className={button} disabled={status.isFetching} onClick={() => void status.refetch()}>{status.isFetching ? "Checking…" : "Check payment"}</button>}
      {expired && <button type="button" className={`${button} ml-2`} disabled={create.isPending || status.isFetching} onClick={() => create.mutate()}>{create.isPending ? "Creating QR…" : "Create new QR"}</button>}
      {paid && <button type="button" className={button} onClick={onClose}>Back to Wish</button>}
      {payment && <p className="break-all text-xs text-[#71583c]">Order: {payment.id}</p>}
      <p className="text-xs text-[#71583c]">Closing this screen does not cancel a payment. Reopen it to check an active order.</p>
    </div>
  </div></ResponsiveCanvasFrame>;
}
