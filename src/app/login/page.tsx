"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Swords, ShieldCheck, CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin, useRegister, useRegistrationCode, useSession } from "@/lib/auth";
import { GoogleLoginButton } from "@/components/google-login-button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [resendWait, setResendWait] = useState(0);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const session = useSession();
  const login = useLogin();
  const register = useRegister();
  const sendCode = useRegistrationCode();
  const pending = login.isPending || register.isPending || sendCode.isPending;
  const rawError = formError || (registering ? register.error?.message || sendCode.error?.message : login.error?.message) || "";
  const error = rawError === "That email is already registered" ? "" : rawError;

  function registrationError(error: Error) {
    if (error.message === "That email is already registered") setToast({ message: error.message, id: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const update = () => setResendWait(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  useEffect(() => {
    if (session.data) router.replace("/dashboard");
  }, [router, session.data]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (registering) {
      if (password !== confirmPassword) { setFormError("Passwords do not match"); return; }
      if (sentEmail !== email.trim().toLowerCase()) { setFormError("Send a verification code to your email first"); return; }
      register.mutate({ username, password, confirmPassword, email, code }, { onSuccess: () => router.replace("/dashboard"), onError: registrationError });
      return;
    }
    login.mutate({ username, password }, { onSuccess: () => router.replace("/dashboard") });
  }
  const inputClass = "min-w-0 text-base sm:text-sm border-[#ac8a5d] bg-[#fff3d4]/70 text-[#43311f] placeholder:text-[#927957] focus-visible:border-[#805523] focus-visible:ring-[#805523]/20";
  return <main className="relative isolate min-h-dvh overflow-x-hidden bg-[#352619] text-[#43311f]" style={{ backgroundImage: "linear-gradient(90deg, #21170dcc, #21170d66), url('/room/cozy-cabin-v5.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
    {toast && <div key={toast.id} role="alert" className="fixed top-4 right-4 left-4 z-50 flex items-center gap-3 rounded-lg border border-[#d0a875] bg-[#51331e] py-2 pr-1 pl-4 text-sm text-[#fff0cc] shadow-xl sm:left-auto sm:w-full sm:max-w-sm">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-[#efbd79]" />
      <p className="min-w-0 flex-1 break-words">{toast.message}</p>
      <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded focus-visible:outline-2 focus-visible:outline-[#ffe2a1]"><X aria-hidden="true" className="size-4" /></button>
    </div>}
    <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl content-start items-start gap-6 px-3 py-5 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[1fr_auto] lg:content-normal lg:items-center lg:gap-x-16 lg:gap-y-8 lg:px-10 lg:py-12">
      <section className="min-w-0 text-[#f7e7c3]">
        <div className="flex flex-wrap items-center gap-2 font-serif text-xl tracking-wide sm:gap-3 sm:text-2xl"><Swords className="size-7 text-[#e0bc78]" />IdleOn<span className="border-l border-[#d4b277]/40 pl-3 text-xs tracking-[0.16em] text-[#d9bf91]">LEON CITY</span></div>
        <div className="mt-8 hidden max-w-md lg:mt-24 lg:block">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d9ba80]">Your adventure awaits</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A warm hearth.<br />A new adventure.</h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#e1ccb0]">Gather your team, explore the wilds, and return to a cabin of your own.</p>
          <div aria-hidden="true" className="mt-6 hidden h-44 w-28 bg-no-repeat lg:block" style={{ backgroundImage: "url('/sprites/assassin-moe-walk-sheet.png')", backgroundSize: "auto 100%", backgroundPosition: "left center" }} />
        </div>
      </section>
      <section aria-labelledby="login-title" className="paper-menu auth-parchment mx-auto w-full min-w-0 max-w-md rounded-sm shadow-2xl lg:mx-0">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-[#805523]"><ShieldCheck className="size-4" />Adventurer&apos;s journal</div>
        <h2 id="login-title" className="break-words font-serif text-2xl leading-tight sm:text-3xl">{registering ? "Begin your journey" : "Welcome back, adventurer"}</h2>
        <p className="mt-3 text-sm leading-6 text-[#71583c]">{registering ? "Create an account and choose your first companion." : "Sign in to return to your team."}</p>
        <form onSubmit={signIn} className="mt-6 min-w-0 space-y-4" aria-busy={pending}>
          {registering && <div className="space-y-2">
            <label htmlFor="registration-email" className="text-sm font-medium">Email</label>
            <Input id="registration-email" type="email" autoComplete="email" className={inputClass} value={email} maxLength={254} required disabled={pending} onChange={(event) => { setEmail(event.target.value); setCode(""); setSentEmail(""); sendCode.reset(); register.reset(); }} />
            <Button type="button" disabled={pending || resendWait > 0 || !email.trim()} className="h-auto min-h-11 w-full min-w-0 whitespace-normal border border-[#a38358] px-3 py-2.5 bg-[#e9d4a7] text-[#43311f] hover:bg-[#ddc391]" onClick={(event) => {
              const input = event.currentTarget.form?.querySelector<HTMLInputElement>("#registration-email");
              if (!input?.reportValidity()) return;
              setFormError(""); register.reset();
              sendCode.mutate(email, { onSuccess: () => { setSentEmail(email.trim().toLowerCase()); setCode(""); setResendAt(Date.now() + 60000); }, onError: registrationError });
            }}>{sendCode.isPending ? "Sending code…" : resendWait > 0 ? `Resend in ${resendWait}s` : sentEmail ? "Resend code" : "Send verification code"}</Button>
            {sentEmail && <p role="status" className="break-words text-xs text-[#71583c] [overflow-wrap:anywhere]">Code sent to {sentEmail}. It expires in 10 minutes.</p>}
            <label htmlFor="registration-code" className="block text-sm font-medium">Verification code</label>
            <Input id="registration-code" className={inputClass} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={pending} placeholder="Six-digit email code" />
          </div>}
          <div className="space-y-2"><label htmlFor="username" className="text-sm font-medium">Username</label><Input className={inputClass} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={registering ? 3 : undefined} maxLength={registering ? 30 : 100} pattern={registering ? "[a-zA-Z0-9_]{3,30}" : undefined} aria-describedby={registering ? "username-help" : undefined} disabled={pending} />{registering && <p id="username-help" className="text-xs text-[#71583c]">3–30 letters, numbers, or underscores.</p>}</div>
          <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Password</label><div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} placeholder="Enter your password" className={`${inputClass} pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={registering ? 8 : undefined} maxLength={256} aria-describedby={registering ? "password-help" : undefined} disabled={pending} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[#71583c] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#805523]">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          {registering && <div className="space-y-2"><p id="password-help" className="text-xs text-[#71583c]">Use at least 8 characters for your password.</p><label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label><Input className={inputClass} id="confirm-password" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={256} disabled={pending} /></div>}
          {error && <p role="alert" className="break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 [overflow-wrap:anywhere]">{error}</p>}
          <Button type="submit" disabled={pending} className="h-12 w-full justify-between border border-[#5d3b20] bg-[#81552d] px-4 text-[#fff0cc] shadow-md hover:bg-[#684123] focus-visible:ring-[#805523]">{registering ? pending ? "Creating account…" : "Create account" : pending ? "Signing in…" : "Sign in"}{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
        </form>
        <Suspense fallback={<p className="mt-5 text-center text-sm text-[#71583c]">Loading Google sign-in…</p>}><GoogleLoginButton disabled={pending} /></Suspense>
        <p className="mt-5 break-words text-center text-sm leading-6 text-[#71583c]">{registering ? "Already have an account? " : "New to IdleOn? "}<button type="button" disabled={pending} onClick={() => { setRegistering(!registering); setPassword(""); setConfirmPassword(""); setVisible(false); setFormError(""); login.reset(); register.reset(); }} className="font-semibold text-[#70451f] underline underline-offset-4 outline-offset-4 focus-visible:outline-[#805523] disabled:opacity-50">{registering ? "Sign in" : "Create account"}</button></p>
      </section>
      <footer className="min-w-0 px-2 text-center text-xs leading-5 text-[#dbc5a0] lg:col-span-2">IdleOn ? Your next chapter starts here.</footer>
    </div>
  </main>;
}
