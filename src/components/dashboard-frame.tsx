"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, useLogout } from "@/lib/auth";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { infoBoxStyle } from "@/components/game/info-box-skins";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const session = useSession(), logout = useLogout(), router = useRouter();
  const user = session.data?.user;
  return <div className="min-h-dvh px-5 py-6 sm:px-10" style={{ ...infoBoxStyle(user?.donationTier ?? 0), backgroundImage: "linear-gradient(#21170d99, #21170dbb), url('/room/cozy-cabin-v5.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
    {user && <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-[#f4e4bf]">
      <div className="flex items-center gap-3">{user.role === "admin" && <AdminNavigation username={user.username} />}<Link href="/dashboard" className="flex items-center gap-3 font-serif text-2xl outline-offset-4"><Swords className="size-7 text-[#dfba77]" />IdleOn<span className="hidden border-l border-[#d0aa6d]/50 pl-3 text-xs tracking-[0.16em] sm:inline">LEON CITY</span></Link></div>
      <Button variant="outline" className="border-[#bb965f] bg-[#3d2a1e]/80 text-[#f4e4bf] hover:bg-[#624329] hover:text-[#fff0cc]" onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace("/login") })} disabled={logout.isPending}><LogOut className="size-4" />{logout.isPending ? "Signing out…" : "Sign out"}</Button>
    </header>}
    {logout.error && <p role="alert" className="mx-auto mt-4 max-w-5xl rounded border border-[#bc8061] bg-[#f3d8ba] p-3 text-sm text-[#a13725]">{logout.error.message}</p>}
    {children}
  </div>;
}
