"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { requestKey } from "@/lib/request-key";
import { donationTiers } from "@/components/game/info-box-skins";

type Resource = "gold" | "levels";
type Account = { id: string; username: string; name: string; donationTier: number; gold: number; level: number };
type Preview = { count: number; recipientsHash: string; sample: string[] };
type GrantResult = { amount: number; recipientCount: number; total: number; wishEarned: number; alreadyApplied: boolean; user?: { id: string; username: string; gold: number; level: number } };
const tiers = [{ tier: 0, name: "Community" }, ...donationTiers];
const field = "menu-field min-h-11 px-3 py-2 text-sm";
const action = "menu-action min-h-11 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const maximum = (kind: Resource) => kind === "gold" ? 1000000 : 27;
const valid = (value: string, kind: Resource) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= maximum(kind);

export function AdminResourceControls({ resource }: { resource: Resource }) {
  const [tab, setTab] = useState<"account" | "tier">("account");
  return <section className="mt-7 space-y-5"><p className="text-sm">{resource === "gold" ? "Add gold to an account without changing its other balances." : "Add account levels, preserving existing progress within the level. Normal level-up rewards apply: 100 wish currency per added level. The current XP storage supports account levels up to 28."}</p>
    <div role="tablist" aria-label={`${resource} recipients`} className="flex flex-wrap gap-2">{(["account", "tier"] as const).map(value => <button key={value} id={`${resource}-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`${resource}-panel-${value}`} tabIndex={tab === value ? 0 : -1} className={action} onClick={() => setTab(value)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const next = event.key === "Home" ? "account" : event.key === "End" ? "tier" : value === "account" ? "tier" : "account"; setTab(next); document.getElementById(`${resource}-tab-${next}`)?.focus();
    }}>{value === "account" ? "By username / account" : "By donation tier"}</button>)}</div>
    <div role="tabpanel" id={`${resource}-panel-account`} aria-labelledby={`${resource}-tab-account`} hidden={tab !== "account"}><AccountGrant resource={resource} /></div>
    <div role="tabpanel" id={`${resource}-panel-tier`} aria-labelledby={`${resource}-tab-tier`} hidden={tab !== "tier"}><TierGrant resource={resource} /></div>
  </section>;
}

function useResourceGrant(resource: Resource, onComplete: (result: GrantResult) => void) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { id?: string; tier?: number; recipientsHash?: string; amount: number; key: string }) => api<GrantResult>(`/admin/account-grants/${resource}/${input.id ? `accounts/${encodeURIComponent(input.id)}` : "tiers"}`, {
    method: "POST", headers: { "Idempotency-Key": input.key }, body: JSON.stringify(input.id ? { amount: input.amount } : { tier: input.tier, amount: input.amount, recipientsHash: input.recipientsHash }),
  }), onSuccess: async result => {
    onComplete(result);
    await Promise.all([["admin-resource-accounts"], ["admin-wish-accounts"], ["admin-donation-tiers"], ["character"]].map(queryKey => client.invalidateQueries({ queryKey })));
  } });
}

function AccountGrant({ resource }: { resource: Resource }) {
  const [search, setSearch] = useState(""), [submitted, setSubmitted] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({}), [notice, setNotice] = useState("");
  const keys = useRef<Record<string, { amount: number; key: string }>>({});
  const accounts = useQuery({ queryKey: ["admin-resource-accounts", submitted], queryFn: () => api<{ users: Account[] }>(`/admin/donation-tiers?search=${encodeURIComponent(submitted)}`), retry: false });
  const grant = useResourceGrant(resource, result => {
    const user = result.user!;
    setNotice(`Added ${result.amount.toLocaleString()} ${resource} to ${user.username}. ${resource === "gold" ? `Gold balance: ${user.gold.toLocaleString()}.` : `Account level: ${user.level}. Awarded ${result.wishEarned} wish currency.`}`);
    delete keys.current[user.id]; setAmounts(previous => ({ ...previous, [user.id]: "" }));
  });
  return <div className="menu-info space-y-4 p-5"><h2 className="text-lg font-semibold">{resource === "gold" ? "Add gold" : "Add account levels"} by account</h2>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setSubmitted(search.trim()); }}><label className="sr-only" htmlFor={`${resource}-search`}>Search accounts</label><input id={`${resource}-search`} className={field + " min-w-0 flex-1"} maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder="Username, account ID or name…" /><button type="submit" className={action}>Find account</button></form>
    {accounts.isPending && <p role="status">Loading accounts…</p>}{(accounts.error || grant.error) && <p role="alert" className="text-sm text-red-700">{grant.error?.message ?? accounts.error?.message}</p>}{notice && <p role="status" className="font-semibold">{notice}</p>}
    <ul className="space-y-4">{accounts.data?.users.map(user => <li key={user.id} className="space-y-3 border-t border-[#a3835866] pt-4"><h3 className="font-semibold">{user.username} · {user.name}</h3><p className="break-all text-xs">{user.id} · {tiers.find(tier => tier.tier === user.donationTier)?.name}</p><p className="text-sm">{user.gold.toLocaleString()} gold · Account level {user.level}</p>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (!valid(amounts[user.id] ?? "", resource)) return;
        const amount = Number(amounts[user.id]); if (keys.current[user.id]?.amount !== amount) keys.current[user.id] = { amount, key: requestKey() }; setNotice(""); grant.mutate({ id: user.id, amount, key: keys.current[user.id].key });
      }}><label className="text-xs font-semibold">{resource === "gold" ? "Gold to add" : "Levels to add"}<input className={field + " mt-1 block w-44"} type="number" required min={1} max={resource === "gold" ? maximum(resource) : Math.max(0, 28 - user.level)} step={1} value={amounts[user.id] ?? ""} disabled={grant.isPending || resource === "levels" && user.level >= 28} onChange={event => setAmounts(previous => ({ ...previous, [user.id]: event.target.value }))} /></label><button className={action} type="submit" disabled={grant.isPending || !valid(amounts[user.id] ?? "", resource) || resource === "levels" && user.level + Number(amounts[user.id]) > 28}>{grant.isPending && grant.variables.id === user.id ? "Adding…" : `Add ${resource}`}</button></form>
    </li>)}</ul>{accounts.data && !accounts.data.users.length && <p>No matching accounts.</p>}<p className="text-xs text-slate-500">Showing up to 20 accounts. All grants are recorded.</p>
  </div>;
}

function TierGrant({ resource }: { resource: Resource }) {
  const [tier, setTier] = useState(1), [amount, setAmount] = useState(""), [notice, setNotice] = useState("");
  const key = useRef<{ signature: string; value: string } | null>(null);
  const preview = useMutation({ mutationFn: () => api<Preview>(`/admin/account-grants/${resource}/tiers/${tier}/preview`) });
  const grant = useResourceGrant(resource, result => {
    setNotice(`${result.alreadyApplied ? "Already applied:" : "Added"} ${result.amount.toLocaleString()} ${resource} each to ${result.recipientCount.toLocaleString()} accounts.${resource === "levels" ? ` Awarded ${result.wishEarned.toLocaleString()} total wish currency.` : ""}`);
    key.current = null; setAmount(""); preview.reset();
  });
  const recipients = preview.data;
  return <form className="menu-info space-y-4 p-5" onSubmit={event => { event.preventDefault(); if (!recipients?.count || !valid(amount, resource)) return;
    const signature = JSON.stringify([resource, tier, Number(amount), recipients.recipientsHash]); if (key.current?.signature !== signature) key.current = { signature, value: requestKey() }; setNotice(""); grant.mutate({ tier, amount: Number(amount), recipientsHash: recipients.recipientsHash, key: key.current.value });
  }}><h2 className="text-lg font-semibold">Add {resource} by donation tier</h2><p className="text-sm">Every account in the exact selected tier receives this amount, including matching admin accounts. Other tiers are excluded.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Recipient tier<select className={field + " mt-1 w-full"} value={tier} disabled={grant.isPending || preview.isPending} onChange={event => { setTier(Number(event.target.value)); preview.reset(); key.current = null; setNotice(""); }}>{tiers.map(entry => <option key={entry.tier} value={entry.tier}>{entry.name} · Tier {entry.tier}</option>)}</select></label><label className="text-xs font-semibold">{resource === "gold" ? "Gold" : "Levels"} per account<input className={field + " mt-1 w-full"} type="number" min={1} max={maximum(resource)} step={1} required disabled={grant.isPending} value={amount} onChange={event => setAmount(event.target.value)} /></label></div>
    <button className={action} type="button" disabled={grant.isPending || preview.isPending} onClick={() => { setNotice(""); preview.mutate(); }}>{preview.isPending ? "Loading…" : "Preview recipients"}</button>
    {recipients && <div className="space-y-2 rounded border border-[#805b3566] p-4"><p className="font-semibold">{recipients.count.toLocaleString()} eligible accounts</p><p className="break-words text-xs">{recipients.sample.join(", ")}{recipients.count > recipients.sample.length ? ", …" : ""}</p><p className="text-sm">{valid(amount, resource) ? `${Number(amount).toLocaleString()} ${resource} each · ${(Number(amount) * recipients.count).toLocaleString()} total` : "Enter an amount to see the total."}</p></div>}
    {(preview.error || grant.error) && <p role="alert" className="text-sm text-red-700">{grant.error?.message ?? preview.error?.message}</p>}{notice && <p role="status" className="font-semibold">{notice}</p>}
    <button type="submit" className={action} disabled={!recipients?.count || !valid(amount, resource) || grant.isPending || preview.isPending}>{grant.isPending ? "Adding…" : `Add ${valid(amount, resource) ? Number(amount).toLocaleString() : "0"} ${resource} each to ${recipients?.count.toLocaleString() ?? "0"} accounts`}</button>
    <p className="text-xs text-slate-500">Preview again if tier membership changes. If any account would exceed a balance or level limit, nothing is added. Every recipient gets an audit record.</p>
  </form>;
}
