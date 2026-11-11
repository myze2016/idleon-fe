"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Character, CharacterState } from "@/lib/character";

const characterKey = (userId?: string) => ["character", userId] as const;

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
      client.setQueryData(queryKey, { character: null, characters: [], wishCurrency: 0, gold: 0, progression: { level: 1, totalExp: 0, exp: 0, expToNextLevel: 10 } });
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

export function useWish(userId?: string) {
  const client = useQueryClient();
  const queryKey = characterKey(userId);
  return useMutation({
    mutationFn: () => api<CharacterState & { reward: Character }>("/character/wish", { method: "POST" }),
    onSuccess: async ({ character, characters, wishCurrency, gold, progression }) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, { character, characters, wishCurrency, gold, progression });
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
}
