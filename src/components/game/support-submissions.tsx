"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { donationTiers } from "./info-box-skins";

const button = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const field = "menu-field min-h-11 w-full min-w-0 px-3 py-2 text-sm";
const qrKey = ["support-qr"];

export function SupportContributionForm({ onBack }: { onBack: () => void }) {
  const [amount, setAmount] = useState("");
  const eligible = [...donationTiers].reverse().find((entry) => Number(amount) >= entry.minimumAmount);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  const [phone, setPhone] = useState(""), [reference, setReference] = useState("");
  const qr = useQuery({ queryKey: qrKey, queryFn: () => api<{ qrImage: string | null }>("/support"), retry: false });
  const submit = useMutation({ mutationFn: () => api<{ submission: { id: string } }>("/support/submissions", { method: "POST", body: JSON.stringify({ amount, phone: phone.trim(), reference: reference.trim() }) }),
    onSuccess: () => { setPhone(""); setReference(""); } });
  return <section aria-labelledby="support-payment-title" className="menu-info mx-auto mt-6 max-w-xl space-y-4 p-5">
    <button type="button" className={button} onClick={onBack}>Back to tiers</button>
    <h3 ref={headingRef} tabIndex={-1} id="support-payment-title" className="text-xl font-semibold outline-none">Donate any amount</h3>
    {qr.isPending ? <p role="status">Loading donation QR…</p> : qr.error ? <div role="alert"><p>{qr.error.message}</p><button type="button" className={`${button} mt-2`} onClick={() => void qr.refetch()}>Retry</button></div> : !qr.data?.qrImage ? <p role="status">The admin hasn’t added the donation QR yet. Please check back later.</p> : submit.isSuccess ? <div role="status" className="space-y-2 py-6"><p className="text-lg font-semibold">Your details were sent for review.</p><p className="text-sm">An admin will confirm the donation and apply any qualifying thank-you skin.</p><p className="break-all text-xs">Submission: {submit.data.submission.id}</p></div> : <>
      <p className="text-sm">Scan the GCash QR and send any amount you’d like. Enter the actual amount sent and your sender GCash number below so we know who sent it.</p>
      <img src={qr.data.qrImage} alt="GCash donation QR provided by the game admin" className="mx-auto h-80 w-80 max-w-full rounded-lg bg-white p-3 object-contain" />
      <a href={qr.data.qrImage} download="game-support-qr.png" className="block text-center text-sm underline underline-offset-4">Save QR image</a>
      <p className="text-xs text-[#71583c]">Using the same phone? Save the QR, then open GCash’s scanner and upload the image. Check the recipient name before sending.</p>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}>
        <label className="block text-sm font-semibold" htmlFor="support-amount">Amount sent (PHP)<input id="support-amount" type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Any amount" className={`${field} mt-2`} /></label>
        {Number(amount) > 0 && <p className="text-xs text-[#71583c]">{eligible ? `${eligible.name} · ${eligible.skin} skin after admin verification.` : "Thank you! Every amount helps. Skin recognition starts at ₱10."}</p>}
        <label className="block text-sm font-semibold" htmlFor="support-phone">Your sender GCash number<input id="support-phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={16} placeholder="09XXXXXXXXX" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${field} mt-2`} /></label>
        <label className="block text-sm font-semibold" htmlFor="support-reference">GCash transaction reference<input id="support-reference" required minLength={6} maxLength={64} autoComplete="off" placeholder="Reference from your completed transfer" value={reference} onChange={(event) => setReference(event.target.value)} className={`${field} mt-2`} /></label>
        <p className="text-xs text-[#71583c]">Your account username is linked automatically. Only admins can view your submitted number and reference to match the transfer. Never share your MPIN or OTP.</p>
        {submit.error && <p role="alert" className="text-sm text-[#a13725]">{submit.error.message}</p>}
        <button type="submit" disabled={submit.isPending} className={button}>{submit.isPending ? "Sending…" : "I’ve sent it · Submit for review"}</button>
        <p className="text-xs text-[#71583c]">Submitting details does not confirm payment or activate a tier automatically.</p>
      </form>
    </>}
  </section>;
}

