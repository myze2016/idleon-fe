"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore } from "zustand";
import type { Character } from "@/lib/character";

interface GameState {
  isExploring: boolean;
  startExploring: (starter: Character) => void;
  returnToRoom: () => void;
  teamSlots: (Character | null)[];
  assignCharacter: (slot: number, character: Character) => void;
  isPaused: boolean;
  isMapOpen: boolean;
  activePanel: "character" | "wish" | "team" | null;
  togglePanel: (panel: "character" | "wish" | "team") => void;
  selectedLocation: "meadow" | "forest";
  selectLocation: (location: "meadow" | "forest") => void;
  togglePause: () => void;
  toggleMap: () => void;
  startRoom: () => void;
}

function createGameStore() {
  return createStore<GameState>()((set) => ({
    isExploring: false,
    startExploring: (starter) => set((state) => ({
      isExploring: true, isPaused: false, isMapOpen: false, activePanel: null,
      teamSlots: state.teamSlots.some(Boolean) ? state.teamSlots : [starter, null, null, null, null, null],
    })),
    returnToRoom: () => set({ isExploring: false, isPaused: false, isMapOpen: false, activePanel: null }),
    teamSlots: Array.from({ length: 6 }, () => null),
    assignCharacter: (slot, character) => set((state) => {
      if (!Number.isInteger(slot) || slot < 0 || slot >= 6) return {};
      return { teamSlots: state.teamSlots.map((member, index) => index === slot ? character
        : member && (member.id && character.id ? member.id === character.id : member.name === character.name && member.weapon === character.weapon) ? null : member) };
    }),
    isPaused: false,
    isMapOpen: false,
    activePanel: null,
    togglePanel: (panel) => set((state) => ({ activePanel: state.activePanel === panel ? null : panel, isPaused: false, isMapOpen: false })),
    selectedLocation: "meadow",
    selectLocation: (selectedLocation) => set({ selectedLocation }),
    togglePause: () => set((state) => ({ isPaused: !state.isPaused, isMapOpen: false, activePanel: null })),
    toggleMap: () => set((state) => ({ isMapOpen: !state.isMapOpen, isPaused: false, activePanel: null })),
    startRoom: () => set({ isPaused: false, isMapOpen: false, activePanel: null }),
  }));
}

const GameContext = createContext<ReturnType<typeof createGameStore> | null>(null);

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createGameStore);
  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
}

export function useGameStoreApi() {
  const store = useContext(GameContext);
  if (!store) throw new Error("GameStoreProvider is required");
  return store;
}

export function useGameState<T>(selector: (state: GameState) => T) {
  return useStore(useGameStoreApi(), selector);
}
