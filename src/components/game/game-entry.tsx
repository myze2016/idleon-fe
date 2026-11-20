"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCharacter, useCreateCharacter } from "@/lib/character-api";
import { Button } from "@/components/ui/button";
import { CharacterCreation } from "./creation-screen";
import { GameStoreProvider, useGameState } from "./game-store";
import { RoomCanvas } from "./room-canvas";
import { ExpeditionCanvas } from "./expedition-canvas";
import type { Character, AccountProgress } from "@/lib/character";
import { infoBoxStyle } from "./info-box-skins";

function GameScene({ character, characters, gold, wishCurrency, progression }: { character: Character; characters: Character[]; gold: number; wishCurrency: number; progression: AccountProgress }) {
  const exploring = useGameState((state) => state.isExploring);
  const location = useGameState((state) => state.selectedLocation);
  const team = useGameState((state) => state.teamSlots);
  const travel = useGameState((state) => state.travel);
  return <div className="relative h-full w-full" onKeyDownCapture={event => {
    if (!travel) return;
    event.preventDefault();
    event.stopPropagation();
  }}>
    {exploring ? <ExpeditionCanvas location={location} team={team} gold={gold} wishCurrency={wishCurrency} characterName={character.name} characters={characters} progression={progression} /> : <RoomCanvas character={character} characters={characters} gold={gold} wishCurrency={wishCurrency} progression={progression} />}
    {travel && <div role="status" className="absolute inset-0 z-[70] grid cursor-wait place-items-center bg-black/35">
      <div className="paper-card flex items-center gap-3 rounded bg-[#efdfb8] px-5 py-3 text-sm font-semibold text-[#43311f]">
        <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
        {travel === "expedition" ? "Loading Expedition…" : "Returning to My Room…"}
      </div>
    </div>}
  </div>;
}

export function GameEntry() {
  const router = useRouter();
  const session = useSession();
  const userId = session.data?.user.id;
  const donationTier = session.data?.user.donationTier ?? 0;
  useEffect(() => { window.dispatchEvent(new Event("info-skin-changed")); }, [donationTier]);
  const character = useCharacter(session.isError ? undefined : userId);
  const create = useCreateCharacter(userId);
  const failure = session.error ?? character.error ?? create.error;
  const unauthorized = failure instanceof ApiError && failure.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/login");
  }, [router, unauthorized]);

  if (unauthorized || session.isPending || (!failure && character.isPending)) {
    return <div role="status" className="flex h-full items-center justify-center gap-3"><LoaderCircle className="size-5 animate-spin" />Loading your character…</div>;
  }
  if (session.error || character.error) return <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
    <p role="alert">{failure?.message}</p><Button onClick={() => { if (session.error) void session.refetch(); else void character.refetch(); }}>Try again</Button><Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
  </div>;
  if (!character.data?.character) return <CharacterCreation pending={create.isPending} error={create.error?.message} onCreate={(input) => create.mutate(input)} />;
  const savedTeam = Array.from({ length: 6 }, (_, index) => character.data.characters.find((member) => member.id === character.data.teamSlots?.[index]) ?? null);
  return <div className="relative h-full w-full" data-donation-tier={donationTier} style={infoBoxStyle(donationTier)}><GameStoreProvider key={userId} initialTeam={savedTeam}><GameScene character={character.data.character} characters={character.data.characters} gold={character.data.gold} wishCurrency={character.data.wishCurrency} progression={character.data.progression} /></GameStoreProvider></div>;
}
