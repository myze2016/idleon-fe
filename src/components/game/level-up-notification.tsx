import { CurrencyIcon } from "@/components/currency-icon";
import { ChevronUp, Sparkles } from "lucide-react";

export interface LevelUpNotice { level: number; wishes: number; levels: number }

export function LevelUpNotification({ notice }: { notice: LevelUpNotice }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
    <div key={`${notice.level}-${notice.wishes}`} className="level-up-card relative isolate w-full max-w-sm px-6 pt-9 pb-6 text-center text-[#43311f]">
      <div aria-hidden="true" className="level-up-rays absolute inset-[-20%] -z-10 rounded-full" />
      <div aria-hidden="true" className="level-up-particles absolute inset-0">
        {[0, 1, 2, 3, 4, 5].map((i) => <Sparkles key={i} className={`level-up-spark level-up-spark-${i}`} size={18} />)}
      </div>
      <div className="relative mx-auto mb-4 flex size-24 flex-col items-center justify-center rounded-full border-[3px] border-[#b58a43] bg-[#ead19a] shadow-[0_0_0_5px_#644427,0_0_0_7px_#d8b76e,inset_0_2px_8px_#fff0c4]">
        <ChevronUp aria-hidden="true" className="absolute -top-4 size-8 rounded-full bg-[#644427] p-1 text-[#ffe2a0]" />
        <span className="mt-1 text-[9px] font-bold tracking-[.2em] text-[#79603c]">LEVEL</span>
        <span className="font-serif text-4xl font-bold leading-none">{notice.level}</span>
      </div>
      <p className="text-[10px] font-semibold tracking-[.25em] text-[#806440]">YOUR JOURNEY CONTINUES</p>
      <p className="mt-1 font-serif text-4xl font-bold text-[#644427]">Level up!</p>
      <div aria-hidden="true" className="mx-auto my-4 h-px w-3/4 bg-gradient-to-r from-transparent via-[#a27b43] to-transparent" />
      <div className="flex items-center justify-center gap-3 rounded-lg border border-[#b89961] bg-[#fff3d3]/60 px-3 py-3 shadow-[inset_0_1px_0_#fff8e6]">
        <CurrencyIcon kind="wish" size={42} />
        <div className="text-left"><p className="text-[10px] font-semibold tracking-widest text-[#806440]">WISH REWARD</p><p className="text-xl font-bold">+{notice.wishes.toLocaleString()} <span className="text-sm font-medium">wishes</span></p></div>
      </div>
      <p className="mt-3 text-xs text-[#71583c]">{notice.levels > 1 ? `${notice.levels} levels gained · ` : ""}Account level {notice.level}</p>
    </div>
  </div>;
}
