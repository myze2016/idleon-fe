import { GameEntry } from "@/components/game/game-entry";
export const metadata = { title: "Your room | IdleOn" };
export default function GamePage() {
  return <main className="fixed inset-0 overflow-hidden bg-[#fafbf8] text-[#172e27]"><GameEntry /></main>;
}

