"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";

export function AdminShell({ children }: { children: ReactNode }) {
  const session = useSession(), router = useRouter();
  const user = session.data?.user;
  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) router.replace("/login");
    else if (user && user.role !== "admin") router.replace("/dashboard");
  }, [session.error, user, router]);
  if (session.isPending || !user || user.role !== "admin" || session.isError) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-slate-700">
    {session.isError && !(session.error instanceof ApiError && session.error.status === 401) ? <div className="space-y-4 text-center"><p role="alert">{session.error.message}</p><button className="rounded-lg border border-slate-300 bg-white px-4 py-2" onClick={() => void session.refetch()}>Retry</button><Link href="/dashboard" className="block underline">Back to dashboard</Link></div> : <p role="status" className="flex items-center gap-2"><LoaderCircle className="size-5 animate-spin" />Opening admin modules...</p>}
  </main>;
  return <div className="admin-workspace min-w-0 py-4 sm:py-6">
    <main id="admin-content" className="admin-content mx-auto min-w-0 max-w-[1200px] px-4 py-7 sm:px-7 sm:py-10">{children}</main>
  </div>;
}
