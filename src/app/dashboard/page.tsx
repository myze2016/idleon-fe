"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Coins, LoaderCircle, LogOut, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useSession, useLogout } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { weaponDetails } from "@/lib/character";

const cabin = { backgroundImage: "linear-gradient(#21170d99, #21170dbb), url('/room/cozy-cabin-v5.png')", backgroundSize: "cover", backgroundPosition: "center" };
const actionClass = "border border-[#78502d] bg-[#81552d] text-[#fff0cc] hover:bg-[#684123] focus-visible:ring-[#805523]";

export default function DashboardPage() {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const user = session.data?.user;
  const character = useCharacter(session.isError ? undefined : user?.id);
  const state = character.data;
  const adventurer = state?.character;
  const error = logout.error?.message ?? session.error?.message ?? "";

  useEffect(() => {
    if ([session.error, character.error].some((error) => error instanceof ApiError && error.status === 401)) router.replace("/login");
  }, [router, session.error, character.error]);

  function signOut() {
    logout.mutate(undefined, { onSuccess: () => router.replace("/login") });
  }
  if (!user) return <main className="flex min-h-dvh items-center justify-center p-6 text-[#43311f]" style={cabin}>
    <div className="paper-menu max-w-md p-10 text-center">{error ? <><p role="alert" className="mb-4 text-sm text-[#a13725]">{error}</p><Button className={actionClass} onClick={() => { void session.refetch(); }}>Try again</Button></> : <><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-[#805523]" /><p role="status" className="text-sm">Opening your journal?</p></>}</div>
  </main>;

  return <main className="min-h-dvh px-5 py-6 text-[#43311f] sm:px-10" style={cabin}>
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-[#f4e4bf]">
      <Link href="/dashboard" className="flex items-center gap-3 font-serif text-2xl outline-offset-4"><Swords className="size-7 text-[#dfba77]" />IdleOn<span className="hidden border-l border-[#d0aa6d]/50 pl-3 text-xs tracking-[0.16em] sm:inline">LEON CITY</span></Link>
      <Button variant="outline" className="border-[#bb965f] bg-[#3d2a1e]/80 text-[#f4e4bf] hover:bg-[#624329] hover:text-[#fff0cc]" onClick={signOut} disabled={logout.isPending}><LogOut className="size-4" />{logout.isPending ? "Signing out?" : "Sign out"}</Button>
    </header>
    <div className="mx-auto max-w-4xl py-10 sm:py-16">
      <section className="paper-menu border border-[#a07a46] px-7 py-10 shadow-2xl sm:px-12 sm:py-12" aria-labelledby="dashboard-title">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#805523]">Adventurer&apos;s journal</p>
        <h1 id="dashboard-title" className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">Welcome back, {user.name}.</h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[#71583c]">Your cabin is waiting. Gather your companions and set out when you are ready.</p>
        {error && <p role="alert" className="mt-5 rounded border border-[#bc8061] bg-[#f3d8ba] p-3 text-sm text-[#a13725]">{error}</p>}
        <div className="mt-8 border-t border-[#ac8a5d]/50 pt-7">
          <h2 className="flex items-center gap-2 font-serif text-xl"><Swords className="size-5 text-[#805523]" />Your adventure</h2>
          {character.isPending ? <p role="status" className="mt-4 text-sm text-[#71583c]">Loading your team?</p>
            : character.error ? <div className="mt-4"><p role="alert" className="text-sm text-[#a13725]">{character.error.message}</p><Button className={actionClass + " mt-3"} onClick={() => void character.refetch()}>Try again</Button></div>
            : <>
              <p className="mt-3 text-sm text-[#71583c]">{adventurer ? adventurer.name + " ? " + weaponDetails(adventurer.weapon).label : "Choose your first character and begin your journey."}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[{ label: "Account level", value: state?.progression.level ?? 1 }, { label: "Gold", value: (state?.gold ?? 0).toLocaleString() }, { label: "Companions", value: state?.characters.length ?? 0 }, { label: "Team", value: (state?.teamSlots.filter(Boolean).length ?? 0) + " / 6" }].map((item) => <div key={item.label} className="paper-card border border-[#ac8a5d] bg-[#e9d4a7] p-4"><p className="text-xs text-[#71583c]">{item.label}</p><p className="mt-2 font-serif text-2xl">{item.value}</p></div>)}
              </div>
              <Link href="/game" className={"mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-sm px-6 py-3 font-semibold shadow-md outline-offset-4 sm:w-auto " + actionClass}>Start adventure<ArrowRight className="size-5" /></Link>
              <p className="mt-3 text-xs text-[#71583c]">{adventurer ? "Enter your room to manage your team and explore." : "Start by choosing your name and weapon."}</p>
            </>}
        </div>
      </section>
      <div className="mt-5 flex flex-wrap justify-between gap-3 px-1 text-xs text-[#e0cba5]"><span className="flex items-center gap-2"><Users className="size-3.5" />{user.username}</span><span className="flex items-center gap-2"><Coins className="size-3.5" />Small steps. New adventures.</span></div>
    </div>
  </main>;
}
