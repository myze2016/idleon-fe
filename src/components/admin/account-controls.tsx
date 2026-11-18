"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { requestKey } from "@/lib/request-key";
import { donationTiers } from "../game/info-box-skins";
const action = "menu-action cursor-pointer px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#805523] disabled:cursor-not-allowed disabled:opacity-50";

interface DonationAccount { id: string; username: string; name: string; donationTier: number; wishCurrency: number; characters: { id: string; name: string }[] }
export function AdminAccountControls() {
  const [search, setSearch] = useState(""), [submitted, setSubmitted] = useState("");
  const [drafts, setDrafts] = useState<Record<string, number>>({}), [notice, setNotice] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const grantKeys = useRef<Record<string, { amount: number; key: string }>>({});
  const client = useQueryClient();
  const accounts = useQuery({ queryKey: ["admin-donation-tiers", submitted], queryFn: () => api<{ users: DonationAccount[] }>(`/admin/donation-tiers?search=${encodeURIComponent(submitted)}`), retry: false });
  const save = useMutation({ mutationFn: ({ id, tier }: { id: string; tier: number }) => api<{ user: Pick<DonationAccount, "id" | "username" | "donationTier"> }>(`/admin/users/${encodeURIComponent(id)}/donation-tier`, { method: "PATCH", body: JSON.stringify({ tier }) }), onSuccess: async ({ user }) => {
    setNotice(`Saved ${user.username}: ${donationTiers.find((entry) => entry.tier === user.donationTier)?.name ?? "Community"}.`);
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["auth", "session"] })]);
    setDrafts((previous) => { const next = { ...previous }; delete next[user.id]; return next; });
  } });
  const grant = useMutation({ mutationFn: ({ id, amount, key }: { id: string; amount: number; key: string }) => api<{ user: { id: string; username: string; wishCurrency: number } }>(`/admin/users/${encodeURIComponent(id)}/wish-currency`, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ amount }) }),
    onSuccess: async ({ user }, variables) => {
      setNotice(`Added ${variables.amount.toLocaleString()} wish currency to ${user.username}. Balance: ${user.wishCurrency.toLocaleString()}.`);
      delete grantKeys.current[user.id];
      setAmounts((previous) => ({ ...previous, [user.id]: "" }));
      await Promise.all([client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["character"] })]);
    } });
  return <section aria-labelledby="donation-admin-title" className="menu-info mx-auto mt-6 max-w-5xl space-y-4 p-5">
    <div><h3 id="donation-admin-title" className="text-lg font-semibold">Admin · Accounts & rewards</h3><p className="mt-1 text-xs text-slate-500">Find a player or character to add wish currency or assign a donation tier. Wishes are shared by all characters on the account. Every change is recorded.</p></div>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setSubmitted(search.trim()); }}><label className="sr-only" htmlFor="donation-account-search">Find by username or character name</label><input id="donation-account-search" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or character name…" className="menu-field min-h-11 min-w-0 flex-1 px-3 py-2 text-sm" /><button type="submit" className={action}>Find account</button></form>
    {accounts.isPending && <p role="status">Loading accounts…</p>}
    {(accounts.error || save.error || grant.error) && <p role="alert" className="text-sm text-red-600">{grant.error?.message ?? save.error?.message ?? accounts.error?.message}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <ul className="space-y-3">{accounts.data?.users.map((user) => <li key={user.id} className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
      <div className="min-w-0 flex-1"><p className="break-all font-semibold">{user.username}</p><p className="text-xs text-slate-500">{donationTiers.find((entry) => entry.tier === user.donationTier)?.name ?? "Community"} · {user.wishCurrency.toLocaleString()} wish currency</p><p className="mt-1 break-words text-xs text-slate-500">Characters: {user.characters.map((character) => character.name).join(", ") || "No character yet"}</p></div>
      <select aria-label={`Donation tier for ${user.username}`} value={drafts[user.id] ?? user.donationTier} disabled={save.isPending} onChange={(event) => setDrafts((previous) => ({ ...previous, [user.id]: Number(event.target.value) }))} className="menu-field max-w-full px-3 py-2 text-sm"><option value={0}>Community · Classic</option>{donationTiers.map((entry) => <option key={entry.tier} value={entry.tier}>{entry.name} · {entry.skin}</option>)}</select>
      <button type="button" className={action} disabled={save.isPending || (drafts[user.id] ?? user.donationTier) === user.donationTier} onClick={() => { setNotice(""); save.mutate({ id: user.id, tier: drafts[user.id] ?? user.donationTier }); }} aria-label={`Save donation tier for ${user.username}`}>{save.isPending && save.variables.id === user.id ? "Saving…" : "Save tier"}</button>
      <form className="flex w-full flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault(); const amount = Number(amounts[user.id]);
        if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) return;
        if (grantKeys.current[user.id]?.amount !== amount) grantKeys.current[user.id] = { amount, key: requestKey() };
        setNotice(""); grant.mutate({ id: user.id, amount, key: grantKeys.current[user.id].key });
      }}><label className="text-xs font-semibold" htmlFor={`grant-wishes-${user.id}`}>Add wish currency<input id={`grant-wishes-${user.id}`} type="number" required min={1} max={1000000} step={1} inputMode="numeric" placeholder="Amount" value={amounts[user.id] ?? ""} disabled={grant.isPending} onChange={(event) => setAmounts((previous) => ({ ...previous, [user.id]: event.target.value }))} className="menu-field mt-1 block min-h-10 w-40 px-3 py-2 text-sm" /></label><button type="submit" className={action} disabled={grant.isPending || !Number.isInteger(Number(amounts[user.id])) || Number(amounts[user.id]) < 1 || Number(amounts[user.id]) > 1000000} aria-label={`Add wish currency to ${user.username}`}>{grant.isPending && grant.variables.id === user.id ? "Adding…" : "Add wishes"}</button></form>
    </li>)}</ul>
    {accounts.data && !accounts.data.users.length && <p className="text-sm text-slate-500">No accounts found.</p>}
    {!!accounts.data?.users.length && <p className="text-xs text-slate-500">Showing up to 20 matches. Search by username or character name to find another account.</p>}
  </section>;
}
