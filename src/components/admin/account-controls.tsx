"use client";
import { CurrencyIcon } from "@/components/currency-icon";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { donationTiers } from "../game/info-box-skins";
const action = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-not-allowed disabled:opacity-50";

interface DonationAccount { id: string; username: string; name: string; donationTier: number; wishCurrency: number; characters: { id: string; name: string }[] }
export function AdminAccountControls() {
  const [search, setSearch] = useState(""), [submitted, setSubmitted] = useState("");
  const [drafts, setDrafts] = useState<Record<string, number>>({}), [notice, setNotice] = useState("");
  const client = useQueryClient();
  const accounts = useQuery({ queryKey: ["admin-donation-tiers", submitted], queryFn: () => api<{ users: DonationAccount[] }>(`/admin/donation-tiers?search=${encodeURIComponent(submitted)}`), retry: false });
  const save = useMutation({ mutationFn: ({ id, tier }: { id: string; tier: number }) => api<{ user: Pick<DonationAccount, "id" | "username" | "donationTier"> }>(`/admin/users/${encodeURIComponent(id)}/donation-tier`, { method: "PATCH", body: JSON.stringify({ tier }) }), onSuccess: async ({ user }) => {
    setNotice(`Saved ${user.username}: ${donationTiers.find((entry) => entry.tier === user.donationTier)?.name ?? "Community"}.`);
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["auth", "session"] })]);
    setDrafts((previous) => { const next = { ...previous }; delete next[user.id]; return next; });
  } });
  return <section aria-labelledby="donation-admin-title" className="menu-info mx-auto mt-6 max-w-5xl space-y-4 p-5">
    <div><h3 id="donation-admin-title" className="text-lg font-semibold">Account donation tiers</h3><p className="mt-1 text-xs text-slate-500">Find an account and assign its donation tier. Use the Wish currency module to send wishes. Every tier change is recorded.</p></div>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setSubmitted(search.trim()); }}><label className="sr-only" htmlFor="donation-account-search">Find by username or character name</label><input id="donation-account-search" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or character name…" className="menu-field min-h-11 min-w-0 flex-1 px-3 py-2 text-sm" /><button type="submit" className={action}>Find account</button></form>
    {accounts.isPending && <p role="status">Loading accounts…</p>}
    {(accounts.error || save.error) && <p role="alert" className="text-sm text-red-600">{save.error?.message ?? accounts.error?.message}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <ul className="space-y-3">{accounts.data?.users.map((user) => <li key={user.id} className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
      <div className="min-w-0 flex-1"><p className="break-all font-semibold">{user.username}</p><p className="text-xs text-slate-500">{donationTiers.find((entry) => entry.tier === user.donationTier)?.name ?? "Community"} · <CurrencyIcon kind="wish" size={20} /> {user.wishCurrency.toLocaleString()} wish currency</p><p className="mt-1 break-words text-xs text-slate-500">Characters: {user.characters.map((character) => character.name).join(", ") || "No character yet"}</p></div>
      <select aria-label={`Donation tier for ${user.username}`} value={drafts[user.id] ?? user.donationTier} disabled={save.isPending} onChange={(event) => setDrafts((previous) => ({ ...previous, [user.id]: Number(event.target.value) }))} className="menu-field max-w-full px-3 py-2 text-sm"><option value={0}>Community · Classic</option>{donationTiers.map((entry) => <option key={entry.tier} value={entry.tier}>{entry.name} · {entry.skin}</option>)}</select>
      <button type="button" className={action} disabled={save.isPending || (drafts[user.id] ?? user.donationTier) === user.donationTier} onClick={() => { setNotice(""); save.mutate({ id: user.id, tier: drafts[user.id] ?? user.donationTier }); }} aria-label={`Save donation tier for ${user.username}`}>{save.isPending && save.variables.id === user.id ? "Saving…" : "Save tier"}</button>

    </li>)}</ul>
    {accounts.data && !accounts.data.users.length && <p className="text-sm text-slate-500">No accounts found.</p>}
    {!!accounts.data?.users.length && <p className="text-xs text-slate-500">Showing up to 20 matches. Search by username or character name to find another account.</p>}
  </section>;
}
