"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { donationTiers } from "../game/info-box-skins";
const button = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const qrKey = ["support-qr"];

interface SupportClaim { id: string; tier: number; amount: string; phone: string; reference: string; createdAt: string; user: { id: string; username: string } }
interface SupportIdentity { id: string; username: string; supportPhoneLast4: string; supportIdentifiedAt: string }
export function AdminSupportControls() {
  const [uploadError, setUploadError] = useState(""), [notice, setNotice] = useState("");
  const client = useQueryClient();
  const qr = useQuery({ queryKey: qrKey, queryFn: () => api<{ qrImage: string | null }>("/support") });
  const queue = useQuery({ queryKey: ["admin-support-submissions"], queryFn: () => api<{ submissions: SupportClaim[] }>("/admin/support-submissions"), refetchInterval: 30000, retry: false });
  const identities = useQuery({ queryKey: ["admin-support-identities"], queryFn: () => api<{ users: SupportIdentity[] }>("/admin/support-identities"), refetchInterval: 30000, retry: false });
  const upload = useMutation({ mutationFn: (image: string | null) => api<{ qrImage: string | null }>("/admin/support-qr", { method: "PUT", body: JSON.stringify({ image }) }),
    onSuccess: (data) => { client.setQueryData(qrKey, data); setNotice(data.qrImage ? "Donation QR saved." : "Donation QR removed."); } });
  const review = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => api(`/admin/support-submissions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ decision }) }),
    onSuccess: async (_data, variables) => { setNotice(variables.decision === "approved" ? "Support confirmed and tier activated." : "Submission rejected."); await Promise.all([client.invalidateQueries({ queryKey: ["admin-support-submissions"] }), client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["auth", "session"] })]); } });
  async function chooseQr(file?: File) {
    setUploadError(""); setNotice("");
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 512 * 1024) { setUploadError("Choose a PNG or JPEG under 512 KB."); return; }
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read this image")); reader.readAsDataURL(file); });
      upload.mutate(image);
    } catch { setUploadError("Could not read this image. Please try again."); }
  }
  return <section aria-labelledby="support-admin-qr-title" className="menu-info mx-auto mt-6 max-w-5xl space-y-4 p-5">
    <h3 id="support-admin-qr-title" className="text-lg font-semibold">Admin · Donation QR & submissions</h3>
    <p className="text-sm text-slate-500">Upload your actual receiving GCash QR. Verify the recipient and test scanning it before inviting supporters to send money.</p>
    <label className="block text-sm font-semibold" htmlFor="admin-support-qr">GCash QR image<input id="admin-support-qr" type="file" accept="image/png,image/jpeg" disabled={upload.isPending} onChange={(event) => { void chooseQr(event.target.files?.[0]); event.target.value = ""; }} className="mt-2 block max-w-full text-sm file:mr-3 file:cursor-pointer file:rounded file:border file:border-[#805b35] file:bg-[#51331e] file:px-3 file:py-2 file:text-[#fff0cc]" /></label>
    {upload.isPending && <p role="status">Saving QR…</p>}
    {qr.data?.qrImage && <div className="flex flex-wrap items-center gap-4"><img src={qr.data.qrImage} alt="Current donation QR" className="h-40 w-40 rounded bg-white p-2 object-contain" /><button type="button" className={button} disabled={upload.isPending} onClick={() => upload.mutate(null)}>Remove QR</button></div>}
    {(uploadError || upload.error || review.error || queue.error) && <p role="alert" className="text-sm text-red-600">{uploadError || upload.error?.message || review.error?.message || queue.error?.message}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <h4 className="font-semibold">Supporter identification</h4>
    <p className="text-xs text-slate-500">The last four phone digits are linked to each account. Verify the actual donation before assigning a supporter tier in Accounts.</p>
    {identities.isPending && <p role="status">Loading saved details…</p>}
    {identities.error && <p role="alert" className="text-sm text-red-600">{identities.error.message}</p>}
    <ul className="space-y-3">{identities.data?.users.map((user) => <li key={user.id} className="border-t border-slate-200 pt-3">
      <p className="font-semibold">{user.username} · Phone ending in {user.supportPhoneLast4}</p>
      <p className="text-xs text-slate-500">Saved {new Date(user.supportIdentifiedAt).toLocaleString()}</p>
    </li>)}</ul>
    {identities.data && !identities.data.users.length && <p className="text-sm text-slate-500">No saved supporter details yet.</p>}
    <h4 className="font-semibold">Previous donation submissions</h4><p className="text-xs text-slate-500">Confirm receipt in your own GCash transaction history before approving. A submitted number or reference is not proof of payment.</p>
    {queue.isPending && <p role="status">Loading submissions…</p>}
    <ul className="space-y-3">{queue.data?.submissions.map((claim) => <li key={claim.id} className="space-y-2 border-t border-slate-200 pt-3">
      <p className="font-semibold">{claim.user.username} · {donationTiers.find((entry) => entry.tier === claim.tier)?.name ?? "Community support"} · ₱{Number(claim.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p className="break-all text-sm">Sender: {claim.phone} · Reference: {claim.reference}</p><p className="text-xs text-slate-500">Submitted {new Date(claim.createdAt).toLocaleString()}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={review.isPending} className={button} onClick={() => review.mutate({ id: claim.id, decision: "approved" })}>{claim.tier ? "Confirm received & activate tier" : "Confirm received"}</button><button type="button" disabled={review.isPending} className={button} onClick={() => review.mutate({ id: claim.id, decision: "rejected" })}>Reject</button></div>
    </li>)}</ul>
    {queue.data && !queue.data.submissions.length && <p className="text-sm text-slate-500">No pending submissions.</p>}
  </section>;
}
