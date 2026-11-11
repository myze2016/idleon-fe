"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Sprout, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/auth/me").then(() => { if (active) router.replace("/dashboard"); }).catch(() => {});
    return () => { active = false; };
  }, [router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
      setPending(false);
    }
  }

  return <main className="grid min-h-dvh bg-[#fafbf8] text-[#172e27] lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#143c31] p-12 text-[#eef4d9] lg:flex lg:flex-col xl:p-16">
      <div className="flex items-center gap-2.5 text-xl font-semibold"><Sprout className="size-7" />IdleOn<span className="ml-1 rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-normal uppercase tracking-widest">Workspace</span></div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-44 top-36 size-[580px] rounded-full border border-[#c9df9b]/15 p-14"><div className="size-full rounded-full border border-[#c9df9b]/20 p-14"><div className="size-full rounded-full border border-[#c9df9b]/25 bg-[#c9df9b]/5" /></div></div>
      <div className="relative my-auto max-w-lg py-28">
        <p className="mb-7 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#c5d5b4]"><span className="size-1.5 rounded-full bg-[#d0e9a2]" />A little progress, every day</p>
        <h1 className="text-5xl leading-[1.12] font-medium tracking-[-0.045em] xl:text-6xl">Your next chapter<br />starts here.</h1>
        <p className="mt-6 max-w-sm leading-7 text-[#bbcec3]">One place to pick up where you left off. Sign in and make room for what comes next.</p>
        <div className="mt-12 flex items-center gap-3 text-xs text-[#c5d5b4]"><span className="flex size-9 items-center justify-center rounded-full border border-white/15"><ShieldCheck className="size-4" /></span>Your workspace. Your momentum.</div>
      </div>
      <p className="relative text-xs text-[#a6c0b1]">Built for the everyday. Ready when you are.</p>
    </section>
    <section className="flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-16">
      <div className="flex items-center gap-2 text-lg font-semibold lg:invisible"><Sprout className="size-6" />IdleOn</div>
      <div className="mx-auto my-auto w-full max-w-[380px] py-12">
        <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-[#dce4d8] bg-[#edf2e8]"><Sprout className="size-6 text-[#426649]" /></div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#748475]">Welcome to your workspace</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to have you back.</h2>
        <p className="mt-3 text-sm leading-6 text-[#778078]">Enter your details below to sign in.</p>
        <form onSubmit={signIn} className="mt-9 space-y-5" aria-busy={pending}>
          <div className="space-y-2"><label htmlFor="username" className="text-sm font-medium">Username</label><Input id="username" name="username" autoComplete="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={100} disabled={pending} /></div>
          <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Password</label><div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={256} disabled={pending} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[#778078] outline-offset-2 focus-visible:outline-2 focus-visible:outline-emerald-700">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={pending} className="h-12 w-full justify-between bg-[#204d3c] px-4 text-white hover:bg-[#153d2d]">{pending ? "Signing in…" : "Sign in"}{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
        </form>
        {process.env.NODE_ENV !== "production" && <div className="mt-7 rounded-xl border border-[#dce4d8] bg-[#f0f3eb] p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[#4d664c]">Try the admin account</p><button type="button" disabled={pending} onClick={() => { setUsername("admin"); setPassword("Admin123!"); setError(""); }} className="text-xs font-medium underline underline-offset-4 disabled:opacity-50">Fill details</button></div><p className="mt-2 text-xs text-[#6e7b6b]">Username: <code>admin</code><span className="mx-2">·</span>Password: <code>Admin123!</code></p></div>}
        <p className="mt-8 text-center text-xs text-[#8b938a]"><ShieldCheck className="mr-1.5 inline size-3.5" />A secure space to keep moving forward.</p>
      </div>
      <footer className="text-center text-[11px] text-[#92998e]">IdleOn Workspace · A fresh start, every time.</footer>
    </section>
  </main>;
}
