"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Character, CharacterState } from "@/lib/character";

const characterKey = (userId?: string) => ["character", userId] as const;

export function useUpgradeCharacter(userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<CharacterState>(`/character/${encodeURIComponent(id)}/upgrade`, { method: "POST" }),
    onSuccess: async (state) => { await client.cancelQueries({ queryKey: characterKey(userId) }); client.setQueryData(characterKey(userId), state); },
  });
}

export function useArtifactAction(userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { stat: string } | { enhanceId: string } | { characterId: string; artifactId: string | null }) => "enhanceId" in input
      ? api<CharacterState>(`/character/artifacts/${encodeURIComponent(input.enhanceId)}/enhance`, { method: "POST" }) : "stat" in input
      ? api<CharacterState>("/character/artifacts/buy", { method: "POST", body: JSON.stringify(input) })
      : api<CharacterState>(`/character/${encodeURIComponent(input.characterId)}/artifact`, { method: "POST", body: JSON.stringify({ artifactId: input.artifactId }) }),
    onSuccess: async (state) => { await client.cancelQueries({ queryKey: characterKey(userId) }); client.setQueryData(characterKey(userId), state); },
  });
}

export function useAssignTeamSlot(userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { slot: number; characterId: string }) => api<CharacterState>("/character/team", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async (state) => { await client.cancelQueries({ queryKey: characterKey(userId) }); client.setQueryData(characterKey(userId), state); },
  });
}

export function useUnlockSkill2(userId?: string) {
  const client = useQueryClient();
  const queryKey = characterKey(userId);
  return useMutation({
    mutationFn: (id: string) => api<CharacterState>(`/character/${encodeURIComponent(id)}/skill-2/unlock`, { method: "POST" }),
    onSuccess: async (state) => { await client.cancelQueries({ queryKey }); client.setQueryData(queryKey, state); },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
}

export function useDeleteCharacter(userId?: string) {
  const client = useQueryClient();
  const queryKey = characterKey(userId);
  return useMutation({
    mutationFn: () => api<void>("/character", { method: "DELETE" }),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<CharacterState>(queryKey);
      client.setQueryData(queryKey, { deepSeaFloor: previous?.deepSeaFloor ?? 1, deepSeaMothUnlocked: previous?.deepSeaMothUnlocked ?? false, garnalandUnlocked: previous?.garnalandUnlocked ?? false, questItems: previous?.questItems ?? [], character: null, characters: [], artifacts: [], teamSlots: [null, null, null, null, null, null], wishCurrency: 0, gold: 0, progression: { level: 1, totalExp: 0, exp: 0, expToNextLevel: 10 } });
    },
  });
}

export function useCharacter(userId?: string) {
  return useQuery({
    queryKey: characterKey(userId),
    queryFn: () => api<CharacterState>("/character"),
    enabled: !!userId,
  });
}

export function useCreateCharacter(userId?: string) {
  const client = useQueryClient();
  const queryKey = characterKey(userId);
  return useMutation({
    mutationFn: (input: Character) => api<CharacterState>("/character", {
      method: "POST", body: JSON.stringify(input),
    }),
    onSuccess: async (result) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, result);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void client.invalidateQueries({ queryKey });
    },
  });
}

export function useWish(userId?: string, pool: "normal" | "special" = "normal") {
  const client = useQueryClient();
  const queryKey = characterKey(userId);
  return useMutation({
    mutationFn: () => api<CharacterState & { reward: Character }>(pool === "special" ? "/character/wish/special" : "/character/wish", { method: "POST" }),
    onSuccess: async (state) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, state);
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
}
