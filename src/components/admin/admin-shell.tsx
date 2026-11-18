"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSession, useLogout } from "@/lib/auth";
import { AdminNavigation } from "./admin-navigation";
import { infoBoxStyle } from "@/components/game/info-box-skins";

export function AdminShell({ children }: { children: ReactNode }) {
  const session = useSession(), logout = useLogout(), router = useRouter();
  const user = session.data?.user;
  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) router.replace("/login");
    else if (user && user.role !== "admin") router.replace("/dashboard");
  }, [session.error, user, router]);
  if (session.isPending || !user || user.role !== "admin" || session.isError) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-slate-700">
    {session.isError && !(session.error instanceof ApiError && session.error.status === 401) ? <div className="space-y-4 text-center"><p role="alert">{session.error.message}</p><button className="rounded-lg border border-slate-300 bg-white px-4 py-2" onClick={() => void session.refetch()}>Retry</button><Link href="/dashboard" className="block underline">Back to dashboard</Link></div> : <p role="status" className="flex items-center gap-2"><LoaderCircle className="size-5 animate-spin" />Opening admin modules...</p>}
  </main>;
  return <div className={`admin-workspace min-h-dvh`} style={infoBoxStyle(user.donationTier)}>
    <header className={`admin-header sticky top-0 z-20 border-b`}><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
      <div className="flex min-w-0 items-center gap-3"><AdminNavigation username={user.username} /><Link href="/dashboard" className="text-lg font-bold text-slate-900">IdleOn<span className="ml-3 hidden text-sm font-normal text-slate-500 sm:inline">Admin workspace</span></Link></div>
      <button type="button" className="menu-action min-h-10 shrink-0 px-3 py-2 text-sm" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace("/login") })}><LogOut size={16} />{logout.isPending ? "Signing out..." : "Sign out"}</button>
    </div></header>
    <main id="admin-content" className={`admin-content mx-auto min-w-0 max-w-[1200px] px-4 py-7 sm:px-7 sm:py-10`}>{logout.error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{logout.error.message}</p>}{children}</main>
  </div>;
}
