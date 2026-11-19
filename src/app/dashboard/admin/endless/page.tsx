import { EndlessControls } from "@/components/admin/endless-controls";

export default function AdminEndlessPage() {
  return <><h1 className="font-sans text-3xl">Endless mode</h1><p className="mt-2 text-sm text-[#71583c]">Choose enemy spawns, set wave scaling, and manage leaderboard seasons.</p><EndlessControls /></>;
}
