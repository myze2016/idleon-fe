"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, LoaderCircle, LogOut, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/auth/me").then(({ user }) => {
      if (active) { setUser(user); setError(""); }
    }).catch((cause) => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) router.replace("/login");
      else setError(cause instanceof Error ? cause.message : "Unable to load your account.");
    });
    return () => { active = false; };
  }, [router, attempt]);

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      router.replace("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
      setPending(false);
    }
  }

  if (!user) return <main className="flex min-h-dvh items-center justify-center bg-[#fafbf8] p-6"><div className="max-w-md text-center">{error ? <><p role="alert" className="mb-4 text-sm text-red-700">{error}</p><Button onClick={() => { setError(""); setAttempt(attempt + 1); }}>Try again</Button></> : <><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-emerald-800" /><p className="text-sm text-muted-foreground">Opening your workspace…</p></>}</div></main>;

  return <main className="min-h-dvh bg-[#fafbf8] text-[#172e27]">
    <header className="border-b border-[#e1e6dc] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5"><span className="flex items-center gap-2 text-xl font-semibold"><Sprout className="size-6 text-emerald-800" />IdleOn</span><Button variant="outline" onClick={signOut} disabled={pending}><LogOut className="size-4" />{pending ? "Signing out…" : "Sign out"}</Button></div></header>
    <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#748475]">Your workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Welcome back, {user.name}.</h1><p className="mt-4 text-[#778078]">You’re signed in and ready for what’s next.</p>{error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <Link href="/game" className="mt-8 inline-flex items-center rounded-lg bg-[#204d3c] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#153d2d]">Open game playground →</Link>
      <section className="mt-10 grid overflow-hidden rounded-2xl border border-[#dce4d8] bg-white md:grid-cols-[1fr_280px]"><div className="p-7 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full bg-[#edf3e7] px-3 py-1 text-xs font-medium text-[#426649]"><Check className="size-3" />Session active</span><h2 className="mt-6 text-2xl font-semibold tracking-tight">Make yourself at home.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#778078]">Your admin workspace is ready. This is your starting point for the tools and features we build next.</p></div><div className="border-t border-[#dce4d8] bg-[#f0f3eb] p-7 md:border-t-0 md:border-l sm:p-10"><ShieldCheck className="size-6 text-[#426649]" /><h3 className="mt-5 text-sm font-semibold">Account details</h3><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-[#778078]">Username</dt><dd className="mt-1 font-medium">{user.username}</dd></div><div><dt className="text-xs text-[#778078]">Access level</dt><dd className="mt-1 font-medium capitalize">{user.role}</dd></div></dl></div></section>
    </div>
  </main>;
}
