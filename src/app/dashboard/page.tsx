"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, LoaderCircle, LogOut, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useSession, useLogout } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { weaponDetails } from "@/lib/character";

export default function DashboardPage() {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const user = session.data?.user;
  const character = useCharacter(session.isError ? undefined : user?.id);
  const adventurer = character.data?.character;
  const error = logout.error?.message ?? session.error?.message ?? "";
  const pending = logout.isPending;

  useEffect(() => {
    if ([session.error, character.error].some((error) => error instanceof ApiError && error.status === 401)) router.replace("/login");
  }, [router, session.error, character.error]);

  function signOut() {
    logout.mutate(undefined, { onSuccess: () => router.replace("/login") });
  }
  if (!user) return <main className="flex min-h-dvh items-center justify-center bg-[#fafbf8] p-6"><div className="max-w-md text-center">{error ? <><p role="alert" className="mb-4 text-sm text-red-700">{error}</p><Button onClick={() => { void session.refetch(); }}>Try again</Button></> : <><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-emerald-800" /><p className="text-sm text-muted-foreground">Opening your workspace…</p></>}</div></main>;

  return <main className="min-h-dvh bg-[#fafbf8] text-[#172e27]">
    <header className="border-b border-[#e1e6dc] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5"><span className="flex items-center gap-2 text-xl font-semibold"><Sprout className="size-6 text-emerald-800" />IdleOn</span><Button variant="outline" onClick={signOut} disabled={pending}><LogOut className="size-4" />{pending ? "Signing out…" : "Sign out"}</Button></div></header>
    <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#748475]">Your workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Welcome back, {user.name}.</h1><p className="mt-4 text-[#778078]">You’re signed in and ready for what’s next.</p>{error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="mt-8 rounded-2xl border border-[#dce4d8] bg-white p-6">
        <h2 className="text-xl font-semibold">Your character</h2>
        {character.isPending ? <p role="status" className="mt-3 text-sm text-[#617361]">Loading your character…</p>
          : character.error ? <div className="mt-3"><p role="alert" className="text-sm text-red-700">{character.error.message}</p><Button variant="outline" onClick={() => void character.refetch()} className="mt-3">Try again</Button></div>
          : <><p className="mt-3 text-sm text-[#617361]">{adventurer ? `${adventurer.name} · ${weaponDetails(adventurer.weapon).label}` : "Your adventure begins with a name and a weapon."}</p>
            <Link href="/game" className="mt-5 inline-flex items-center rounded-lg bg-[#204d3c] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#153d2d]">{adventurer ? "Continue adventure" : "Create character"} →</Link></>}
      </section>
      <section className="mt-10 grid overflow-hidden rounded-2xl border border-[#dce4d8] bg-white md:grid-cols-[1fr_280px]"><div className="p-7 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full bg-[#edf3e7] px-3 py-1 text-xs font-medium text-[#426649]"><Check className="size-3" />Session active</span><h2 className="mt-6 text-2xl font-semibold tracking-tight">Make yourself at home.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#778078]">Your admin workspace is ready. This is your starting point for the tools and features we build next.</p></div><div className="border-t border-[#dce4d8] bg-[#f0f3eb] p-7 md:border-t-0 md:border-l sm:p-10"><ShieldCheck className="size-6 text-[#426649]" /><h3 className="mt-5 text-sm font-semibold">Account details</h3><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-[#778078]">Username</dt><dd className="mt-1 font-medium">{user.username}</dd></div><div><dt className="text-xs text-[#778078]">Access level</dt><dd className="mt-1 font-medium capitalize">{user.role}</dd></div></dl></div></section>
    </div>
  </main>;
}

