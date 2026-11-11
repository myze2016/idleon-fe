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

function GameScene({ character, characters, gold, progression }: { character: Character; characters: Character[]; gold: number; progression: AccountProgress }) {
  const exploring = useGameState((state) => state.isExploring);
  const location = useGameState((state) => state.selectedLocation);
  const team = useGameState((state) => state.teamSlots);
  return exploring ? <ExpeditionCanvas location={location} team={team} gold={gold} characterName={character.name} characters={characters} progression={progression} /> : <RoomCanvas character={character} characters={characters} gold={gold} progression={progression} />;
}

export function GameEntry() {
  const router = useRouter();
  const session = useSession();
  const userId = session.data?.user.id;
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
  return <GameStoreProvider key={userId} initialTeam={savedTeam}><GameScene character={character.data.character} characters={character.data.characters} gold={character.data.gold} progression={character.data.progression} /></GameStoreProvider>;
}
