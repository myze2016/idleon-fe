"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Swords, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin, useRegister, useSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const session = useSession();
  const login = useLogin();
  const register = useRegister();
  const pending = login.isPending || register.isPending;
  const error = formError || (registering ? register.error?.message : login.error?.message) || "";

  useEffect(() => {
    if (session.data) router.replace("/dashboard");
  }, [router, session.data]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (registering) {
      if (password !== confirmPassword) { setFormError("Passwords do not match"); return; }
      register.mutate({ username, password, confirmPassword }, { onSuccess: () => router.replace("/dashboard") });
      return;
    }
    login.mutate({ username, password }, { onSuccess: () => router.replace("/dashboard") });
  }
  const inputClass = "border-[#ac8a5d] bg-[#fff3d4]/70 text-[#43311f] placeholder:text-[#927957] focus-visible:border-[#805523] focus-visible:ring-[#805523]/20";
  return <main className="relative isolate min-h-dvh overflow-x-hidden bg-[#352619] text-[#43311f]" style={{ backgroundImage: "linear-gradient(90deg, #21170dcc, #21170d66), url('/room/cozy-cabin-v5.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
    <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_440px] lg:gap-16 lg:py-12">
      <section className="text-[#f7e7c3]">
        <div className="flex items-center gap-3 font-serif text-2xl tracking-wide"><Swords className="size-7 text-[#e0bc78]" />IdleOn<span className="border-l border-[#d4b277]/40 pl-3 text-xs tracking-[0.16em] text-[#d9bf91]">LEON CITY</span></div>
        <div className="mt-8 max-w-md lg:mt-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d9ba80]">Your adventure awaits</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A warm hearth.<br />A new adventure.</h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#e1ccb0]">Gather your team, explore the wilds, and return to a cabin of your own.</p>
          <div aria-hidden="true" className="mt-6 hidden h-44 w-28 bg-no-repeat lg:block" style={{ backgroundImage: "url('/sprites/assassin-moe-walk-sheet.png')", backgroundSize: "auto 100%", backgroundPosition: "left center" }} />
        </div>
      </section>
      <section aria-labelledby="login-title" className="paper-menu rounded-sm border border-[#9d7445] px-7 py-9 shadow-2xl sm:px-10 sm:py-11">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#805523]"><ShieldCheck className="size-4" />Adventurer&apos;s journal</div>
        <h2 id="login-title" className="font-serif text-3xl leading-tight">{registering ? "Begin your journey" : "Welcome back, adventurer"}</h2>
        <p className="mt-3 text-sm leading-6 text-[#71583c]">{registering ? "Create an account and choose your first companion." : "Sign in to return to your team."}</p>
        <form onSubmit={signIn} className="mt-7 space-y-4" aria-busy={pending}>
          <div className="space-y-2"><label htmlFor="username" className="text-sm font-medium">Username</label><Input className={inputClass} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={registering ? 3 : undefined} maxLength={registering ? 30 : 100} pattern={registering ? "[a-zA-Z0-9_]{3,30}" : undefined} aria-describedby={registering ? "username-help" : undefined} disabled={pending} />{registering && <p id="username-help" className="text-xs text-[#71583c]">3–30 letters, numbers, or underscores.</p>}</div>
          <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Password</label><div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} placeholder="Enter your password" className={`${inputClass} pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={registering ? 8 : undefined} maxLength={256} aria-describedby={registering ? "password-help" : undefined} disabled={pending} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[#71583c] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#805523]">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          {registering && <div className="space-y-2"><p id="password-help" className="text-xs text-[#71583c]">Use at least 8 characters for your password.</p><label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label><Input className={inputClass} id="confirm-password" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={256} disabled={pending} /></div>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={pending} className="h-12 w-full justify-between border border-[#5d3b20] bg-[#81552d] px-4 text-[#fff0cc] shadow-md hover:bg-[#684123] focus-visible:ring-[#805523]">{registering ? pending ? "Creating account…" : "Create account" : pending ? "Signing in…" : "Sign in"}{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#71583c]">{registering ? "Already have an account? " : "New to IdleOn? "}<button type="button" disabled={pending} onClick={() => { setRegistering(!registering); setPassword(""); setConfirmPassword(""); setVisible(false); setFormError(""); login.reset(); register.reset(); }} className="font-semibold text-[#70451f] underline underline-offset-4 outline-offset-4 focus-visible:outline-[#805523] disabled:opacity-50">{registering ? "Sign in" : "Create account"}</button></p>
      </section>
      <footer className="text-center text-xs text-[#dbc5a0] lg:col-span-2">IdleOn ? Your next chapter starts here.</footer>
    </div>
  </main>;
}
