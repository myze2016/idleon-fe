"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Coins, LoaderCircle, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCharacter } from "@/lib/character-api";
import { weaponDetails } from "@/lib/character";

const actionClass = "border border-[#78502d] bg-[#81552d] text-[#fff0cc] hover:bg-[#684123] focus-visible:ring-[#805523]";

export default function DashboardPage() {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user;
  const character = useCharacter(session.isError ? undefined : user?.id);
  const state = character.data;
  const adventurer = state?.character;
  const error = session.error?.message ?? "";

  useEffect(() => {
    if ([session.error, character.error].some((error) => error instanceof ApiError && error.status === 401)) router.replace("/login");
  }, [router, session.error, character.error]);

  if (!user) return <main className="flex min-h-0 flex-1 items-center justify-center p-3 text-[#43311f]">
    <div className="paper-menu dashboard-parchment max-w-md p-6 text-center">{error ? <><p role="alert" className="mb-4 text-sm text-[#a13725]">{error}</p><Button className={actionClass} onClick={() => { void session.refetch(); }}>Try again</Button></> : <><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-[#805523]" /><p role="status" className="text-sm">Opening your journal…</p></>}</div>
  </main>;

  return <main className="dashboard-home text-[#43311f]">
    <div className="dashboard-journal">
      <section className="paper-menu dashboard-parchment dashboard-home-parchment min-w-0 shadow-2xl" aria-labelledby="dashboard-title">
        <div className="dashboard-intro">
        <p className="dashboard-eyebrow font-semibold uppercase tracking-[0.16em] text-[#805523]">Adventurer&apos;s journal</p>
        <h1 id="dashboard-title" className="dashboard-title font-serif">Welcome back, {user.name}.</h1>
        <p className="dashboard-description text-[#71583c]">Your cabin is waiting. Gather your team and explore.</p>
        {error && <p role="alert" className="mt-5 rounded border border-[#bc8061] bg-[#f3d8ba] p-3 text-sm text-[#a13725]">{error}</p>}
        </div>
        <div className="dashboard-adventure">
          <h2 className="dashboard-adventure-title flex items-center gap-2 font-serif text-lg"><Swords className="size-4 text-[#805523]" />Your adventure</h2>
          {character.isPending ? <p role="status" className="mt-4 text-sm text-[#71583c]">Loading your team…</p>
            : character.error ? <div className="mt-4"><p role="alert" className="text-sm text-[#a13725]">{character.error.message}</p><Button className={actionClass + " mt-3"} onClick={() => void character.refetch()}>Try again</Button></div>
            : <>
              <p className="dashboard-companion text-[#71583c]">{adventurer ? adventurer.name + " · " + weaponDetails(adventurer.weapon).label : "Choose your first character and begin your journey."}</p>
              <div className="dashboard-stats">
                {[{ label: "Account level", value: state?.progression.level ?? 1 }, { label: "Gold", value: (state?.gold ?? 0).toLocaleString() }, { label: "Companions", value: state?.characters.length ?? 0 }, { label: "Team", value: (state?.teamSlots.filter(Boolean).length ?? 0) + " / 6" }].map((item) => <div key={item.label} className="paper-card dashboard-stat border border-[#ac8a5d] bg-[#e9d4a7]"><p className="text-[11px] text-[#71583c]">{item.label}</p><p className="dashboard-stat-value font-serif tabular-nums">{item.value}</p></div>)}
              </div>
              <Link href="/game" className="menu-action dashboard-start inline-flex min-h-11 items-center justify-center gap-3 px-4 py-2 font-semibold outline-offset-4">Start adventure<ArrowRight className="size-5" /></Link>
              <p className="dashboard-hint text-[#71583c]">{adventurer ? "Manage your team and explore." : "Choose your name and weapon."}</p>
            </>}
        </div>
      </section>
      <div className="dashboard-footer text-xs text-[#e0cba5]"><span className="flex min-w-0 items-center gap-2"><Users className="size-3.5 shrink-0" /><span className="truncate" title={user.username}>{user.username}</span></span><span className="hidden items-center gap-2 sm:flex"><Coins className="size-3.5" />Small steps. New adventures.</span></div>
    </div>
  </main>;
}
