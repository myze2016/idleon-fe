import { EconomyControls } from "@/components/admin/economy-controls";

export default function AdminEconomyPage() {
  return <><h1 className="font-sans text-3xl">Economy</h1><p className="mt-2 text-sm text-[#71583c]">Set EXP for each level, costs and stat gains for each upgrade, Skill 2 unlock cost, and shop prices.</p><EconomyControls /></>;
}
