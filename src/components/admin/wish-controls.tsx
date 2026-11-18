"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { requestKey } from "@/lib/request-key";
import { donationTiers } from "@/components/game/info-box-skins";

const action = "menu-action min-h-11 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const field = "menu-field min-h-11 px-3 py-2 text-sm";
const tiers = [{ tier: 0, name: "Community" }, ...donationTiers];
const validAmount = (value: string) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 1000000;
type Account = { id: string; username: string; name: string; donationTier: number; wishCurrency: number; characters: { id: string; name: string }[] };

export function AdminWishControls() {
  const [tab, setTab] = useState<"account" | "tier">("account");
  return <section className="mt-7 space-y-5"><div role="tablist" aria-label="Wish recipients" className="flex flex-wrap gap-2">{(["account", "tier"] as const).map(value => <button key={value} id={`wish-tab-${value}`} type="button" role="tab" tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} aria-controls={`wish-panel-${value}`} className={action} onClick={() => setTab(value)} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const next = event.key === "Home" ? "account" : event.key === "End" ? "tier" : value === "account" ? "tier" : "account"; setTab(next); document.getElementById(`wish-tab-${next}`)?.focus();
  }}>{value === "account" ? "By username / account" : "By donation tier"}</button>)}</div>
    <div role="tabpanel" id="wish-panel-account" aria-labelledby="wish-tab-account" hidden={tab !== "account"}><AccountWishes /></div>
    <div role="tabpanel" id="wish-panel-tier" aria-labelledby="wish-tab-tier" hidden={tab !== "tier"}><TierWishes /></div>
  </section>;
}

function AccountWishes() {
  const client = useQueryClient();
  const [search, setSearch] = useState(""), [submitted, setSubmitted] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({}), [notice, setNotice] = useState("");
  const keys = useRef<Record<string, { amount: number; key: string }>>({});
  const accounts = useQuery({ queryKey: ["admin-wish-accounts", submitted], queryFn: () => api<{ users: Account[] }>(`/admin/donation-tiers?search=${encodeURIComponent(submitted)}`), retry: false });
  const grant = useMutation({ mutationFn: ({ id, amount, key }: { id: string; amount: number; key: string }) => api<{ user: { id: string; username: string; wishCurrency: number } }>(`/admin/users/${encodeURIComponent(id)}/wish-currency`, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ amount }) }), onSuccess: async ({ user }, variables) => {
    setNotice(`Sent ${variables.amount.toLocaleString()} wish currency to ${user.username}. New balance: ${user.wishCurrency.toLocaleString()}.`); delete keys.current[user.id]; setAmounts(previous => ({ ...previous, [user.id]: "" }));
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-wish-accounts"] }), client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["character"] })]);
  } });
  return <div className="menu-info space-y-4 p-5"><h2 className="text-lg font-semibold">Send to an account</h2><p className="text-xs">Search by username, account ID, account name or character name. Wishes belong to the account and are shared by its characters.</p>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setSubmitted(search.trim()); }}><label className="sr-only" htmlFor="wish-account-search">Search accounts</label><input id="wish-account-search" className={field + " min-w-0 flex-1"} maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder="Username, account ID or name…" /><button className={action} type="submit">Find account</button></form>
    {accounts.isPending && <p role="status">Loading accounts…</p>}
    {(accounts.error || grant.error) && <p role="alert" className="text-sm text-red-700">{grant.error?.message ?? accounts.error?.message}</p>}
    {notice && <p role="status" className="text-sm font-semibold">{notice}</p>}
    <ul className="space-y-4">{accounts.data?.users.map(user => <li key={user.id} className="space-y-3 border-t border-[#a3835866] pt-4"><div><h3 className="font-semibold">{user.username} · {user.name}</h3><p className="break-all text-xs text-slate-500">Account: {user.id}</p><p className="text-sm">{tiers.find(tier => tier.tier === user.donationTier)?.name} · {user.wishCurrency.toLocaleString()} wish currency</p></div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); const value = amounts[user.id] ?? ""; if (!validAmount(value)) return;
        const amount = Number(value); if (keys.current[user.id]?.amount !== amount) keys.current[user.id] = { amount, key: requestKey() }; setNotice(""); grant.mutate({ id: user.id, amount, key: keys.current[user.id].key });
      }}><label className="text-xs font-semibold">Wish currency amount<input className={field + " mt-1 block w-44"} type="number" min={1} max={1000000} step={1} required value={amounts[user.id] ?? ""} disabled={grant.isPending} onChange={event => setAmounts(previous => ({ ...previous, [user.id]: event.target.value }))} /></label><button type="submit" className={action} disabled={grant.isPending || !validAmount(amounts[user.id] ?? "")}>{grant.isPending && grant.variables.id === user.id ? "Sending…" : `Send to ${user.username}`}</button></form>
    </li>)}</ul>
    {accounts.data && !accounts.data.users.length && <p>No matching accounts.</p>}<p className="text-xs text-slate-500">Up to 20 matches. Narrow the search to find another account. All grants are recorded.</p>
  </div>;
}

type Preview = { tier: number; count: number; recipientsHash: string; sample: string[] };
function TierWishes() {
  const client = useQueryClient();
  const [tier, setTier] = useState(1), [amount, setAmount] = useState(""), [notice, setNotice] = useState("");
  const key = useRef<{ signature: string; value: string } | null>(null);
  const preview = useMutation({ mutationFn: () => api<Preview>(`/admin/wish-currency/tiers/${tier}/preview`) });
  const grant = useMutation({ mutationFn: (input: { tier: number; amount: number; recipientsHash: string; key: string }) => api<{ recipientCount: number; total: number; amount: number; alreadyApplied: boolean }>("/admin/wish-currency/tiers", { method: "POST", headers: { "Idempotency-Key": input.key }, body: JSON.stringify({ tier: input.tier, amount: input.amount, recipientsHash: input.recipientsHash }) }), onSuccess: async result => {
    setNotice(`${result.alreadyApplied ? "This grant was already applied:" : "Sent"} ${result.amount.toLocaleString()} wish currency each to ${result.recipientCount.toLocaleString()} accounts (${result.total.toLocaleString()} total).`); key.current = null; setAmount(""); preview.reset();
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-wish-accounts"] }), client.invalidateQueries({ queryKey: ["admin-donation-tiers"] }), client.invalidateQueries({ queryKey: ["character"] })]);
  } });
  const recipients = preview.data;
  return <form className="menu-info space-y-4 p-5" onSubmit={event => { event.preventDefault(); if (!recipients || !recipients.count || !validAmount(amount)) return;
    const signature = JSON.stringify([tier, Number(amount), recipients.recipientsHash]); if (key.current?.signature !== signature) key.current = { signature, value: requestKey() }; setNotice(""); grant.mutate({ tier, amount: Number(amount), recipientsHash: recipients.recipientsHash, key: key.current.value });
  }}><h2 className="text-lg font-semibold">Send by donation tier</h2><p className="text-sm">Every account in the exact selected tier receives the amount below, including admin accounts if they belong to that tier. Other tiers are excluded.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Recipient tier<select className={field + " mt-1 w-full"} value={tier} disabled={grant.isPending || preview.isPending} onChange={event => { setTier(Number(event.target.value)); preview.reset(); key.current = null; setNotice(""); }}>{tiers.map(entry => <option key={entry.tier} value={entry.tier}>{entry.name} · Tier {entry.tier}</option>)}</select></label><label className="text-xs font-semibold">Wish currency per account<input className={field + " mt-1 w-full"} type="number" min={1} max={1000000} step={1} required value={amount} disabled={grant.isPending} onChange={event => setAmount(event.target.value)} /></label></div>
    <button type="button" className={action} disabled={preview.isPending || grant.isPending} onClick={() => { setNotice(""); preview.mutate(); }}>{preview.isPending ? "Loading recipients…" : "Preview recipients"}</button>
    {recipients && <div className="space-y-2 rounded border border-[#805b3566] p-4"><p className="font-semibold">{recipients.count.toLocaleString()} eligible accounts in {tiers.find(entry => entry.tier === tier)?.name}</p>{!!recipients.sample.length && <p className="break-words text-xs">{recipients.sample.join(", ")}{recipients.count > recipients.sample.length ? ", …" : ""}</p>}<p className="text-sm">{validAmount(amount) ? `${Number(amount).toLocaleString()} each · ${(Number(amount) * recipients.count).toLocaleString()} total wish currency` : "Enter an amount to see the total."}</p></div>}
    {(preview.error || grant.error) && <p role="alert" className="text-sm text-red-700">{grant.error?.message ?? preview.error?.message}</p>}{notice && <p role="status" className="font-semibold">{notice}</p>}
    <button type="submit" className={action} disabled={!recipients?.count || !validAmount(amount) || grant.isPending || preview.isPending}>{grant.isPending ? "Sending…" : `Send ${validAmount(amount) ? Number(amount).toLocaleString() : "wishes"} each to ${recipients?.count.toLocaleString() ?? "0"} accounts`}</button>
    <p className="text-xs text-slate-500">Preview again if tier membership changes. The grant is applied to all previewed recipients together, with an audit record for each account and duplicate-request protection.</p>
  </form>;
}
