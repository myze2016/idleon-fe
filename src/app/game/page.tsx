import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";
import { GameCanvas } from "@/components/game/game-canvas";

export const metadata = { title: "Game playground | IdleOn" };

export default function GamePage() {
  return <main className="min-h-dvh bg-[#fafbf8] text-[#172e27]">
    <header className="border-b border-[#e1e6dc] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold"><Sprout className="size-6 text-emerald-800" />IdleOn</Link><Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#617361] hover:text-[#204d3c]"><ArrowLeft className="size-4" />Dashboard</Link></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#748475]">A world in the making</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your little adventure starts here.</h1><p className="mt-3 mb-7 text-sm leading-6 text-[#778078]">Take a walk, hop between platforms, and explore the meadow.</p><GameCanvas /><p className="mt-4 text-center text-xs text-[#7f897d]">A local playground. Progress resets when you leave the page.</p></div>
  </main>;
}
