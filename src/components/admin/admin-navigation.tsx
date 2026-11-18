"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, LayoutDashboard, Menu, ShieldCheck, SlidersHorizontal, Swords, Users, X } from "lucide-react";

const modules = [
  { href: "/dashboard", label: "Dashboard", description: "Your adventure overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/accounts", label: "Accounts", description: "Wishes and donation tiers", icon: Users },
  { href: "/dashboard/admin/balance", label: "Balance", description: "Characters, enemies and battle lab", icon: SlidersHorizontal },
  { href: "/dashboard/admin/support", label: "Support", description: "Donation QR and submissions", icon: HeartHandshake },
];
export function AdminNavigation({ username }: { username: string }) {
  const pathname = usePathname(), id = useId();
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function close() { dialog.current?.close(); }
  return <>
    <button ref={trigger} type="button" aria-label="Open admin navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { dialog.current?.showModal(); setOpen(true); }} className={`admin-nav-trigger size-11 shrink-0`}><Menu size={21} /></button>
    <dialog ref={dialog} id={id} aria-labelledby={`${id}-title`} onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX > bounds.right || event.clientY > bounds.bottom || event.clientX < bounds.left || event.clientY < bounds.top) close();
    }} className={`admin-nav-drawer fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-80 max-w-[calc(100vw-32px)] p-0 shadow-2xl backdrop:bg-slate-950/50`}>
      <div className="flex min-h-full flex-col p-5"><div className="flex items-center justify-between gap-3"><h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={21} className="text-blue-600" />Admin workspace</h2><button type="button" onClick={close} aria-label="Close admin navigation" className="grid size-10 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"><X size={20} /></button></div>
        <p className="mt-1 truncate text-sm text-slate-500">{username}</p>
        <nav aria-label="Admin modules" className="mt-7 space-y-2">{modules.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 outline-offset-2 ${pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}><Icon size={20} className="shrink-0" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span></Link>)}</nav>
        <Link href="/game" onClick={close} className="mt-auto flex min-h-12 items-center gap-3 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-600 hover:text-blue-700"><Swords size={18} />Return to My Room</Link>
      </div>
    </dialog>
  </>;
}
