import { CurrencyIcon } from "@/components/currency-icon";

export interface LevelUpNotice { level: number; wishes: number; levels: number }

export function LevelUpNotification({ notice }: { notice: LevelUpNotice }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-2xl border-2 border-[#d6af57] bg-[#fff1d6]/95 px-6 py-5 text-center text-[#43311f] shadow-2xl">
      <p className="font-serif text-3xl font-bold text-[#805523]">Level up!</p>
      <p className="mt-1 text-sm">Account level {notice.level}</p>
      <p className="mt-3 flex items-center justify-center gap-2 text-xl font-semibold"><CurrencyIcon kind="wish" size={40} />You gained {notice.wishes.toLocaleString()} wishes!</p>
      {notice.levels > 1 && <p className="mt-2 text-xs text-[#71583c]">{notice.levels} levels gained · 100 wishes per level</p>}
    </div>
  </div>;
}
