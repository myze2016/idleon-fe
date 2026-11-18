"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const button = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const field = "menu-field min-h-11 w-full min-w-0 px-3 py-2 text-sm";
const qrKey = ["support-qr"];
type SupportInfo = { qrImage: string | null; phoneLast4?: string | null };

export function SupportContributionForm({ onBack }: { onBack: () => void }) {
  const [digits, setDigits] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  const client = useQueryClient();
  const qr = useQuery({ queryKey: qrKey, queryFn: () => api<SupportInfo>("/support"), retry: false });
  const phoneLast4 = digits ?? qr.data?.phoneLast4 ?? "";
  const save = useMutation({
    mutationFn: () => api<{ phoneLast4: string }>("/support/identity", { method: "POST", body: JSON.stringify({ phoneLast4 }) }),
    onSuccess: (data) => {
      client.setQueryData<SupportInfo>(qrKey, (previous) => ({ qrImage: previous?.qrImage ?? null, phoneLast4: data.phoneLast4 }));
      void client.invalidateQueries({ queryKey: ["admin-support-identities"] });
    },
  });
  return <section aria-labelledby="support-payment-title" className="menu-info mx-auto mt-6 max-w-xl space-y-4 p-5">
    <button type="button" className={button} onClick={onBack}>Back to support</button>
    <h3 ref={headingRef} tabIndex={-1} id="support-payment-title" className="text-xl font-semibold outline-none">{save.isSuccess ? "Donate any amount" : "Let us know who you are"}</h3>
    {!save.isSuccess ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <p className="text-sm">Enter the last four digits of the phone number you’ll use to donate.</p>
      <label className="block text-sm font-semibold" htmlFor="support-last-four">Last 4 phone digits
        <input id="support-last-four" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" minLength={4} maxLength={4} required placeholder="1234" value={phoneLast4} disabled={save.isPending} onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").slice(0, 4))} className={`${field} mt-2`} aria-describedby="support-identity-help" />
      </label>
      <p id="support-identity-help" className="text-xs text-[#71583c]">Saved to your account so admins can identify your donation. Only the last four digits are needed.</p>
      {save.error && <p role="alert" className="text-sm text-[#a13725]">{save.error.message}</p>}
      <button type="submit" disabled={save.isPending || !/^\d{4}$/.test(phoneLast4)} className={button}>{save.isPending ? "Saving…" : "Save & show QR"}</button>
    </form> : <>
      <p role="status" className="text-sm">Saved. Phone ending in <strong>{save.data.phoneLast4}</strong> is linked to your account.</p>
      {qr.isPending ? <p role="status">Loading donation QR…</p> : qr.error ? <div role="alert"><p>{qr.error.message}</p><button type="button" className={`${button} mt-2`} onClick={() => void qr.refetch()}>Retry</button></div> : !qr.data?.qrImage ? <p role="status">The admin hasn’t added the donation QR yet. Please check back later.</p> : <>
        <p className="text-sm">Scan the GCash QR and send any amount you’d like.</p>
        {/* The QR is an admin-uploaded data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr.data.qrImage} alt="GCash donation QR provided by the game admin" className="mx-auto h-80 w-80 max-w-full rounded-lg bg-white p-3 object-contain" />
        <a href={qr.data.qrImage} download="game-support-qr.png" className="block text-center text-sm underline underline-offset-4">Save QR image</a>
        <p className="text-xs text-[#71583c]">Using the same phone? Save the QR, then upload it in GCash’s scanner. Check the recipient name before sending.</p>
      </>}
      <button type="button" className={button} onClick={() => save.reset()}>Change last four digits</button>
    </>}
  </section>;
}
