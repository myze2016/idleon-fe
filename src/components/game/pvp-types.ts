import type { CharacterStats, WeaponType } from "@/lib/character";

export interface DuelFighter { id: string; userId: string; name: string; weapon: WeaponType; stats: CharacterStats; skill2Unlocked: boolean }
export interface DuelStep { at: number; side: number; actor: number; targets: number[]; kind: string; label: string; damage: number; healing: number; critical: boolean; hp: number[]; mp: number[] }
export interface DuelResult { fighters: DuelFighter[]; steps: DuelStep[]; duration: number; winnerId: string | null }
export interface RoomState {
  code: string; phase: "waiting" | "countdown" | "battle" | "complete" | "canceled" | "closed" | "expired"; serverNow: string; startsAt: string | null;
  players: ({ id: string; name: string; username: string; ready: boolean; selected: boolean; selectedCount: number; characterIds: string[]; fighters: DuelFighter[] } | null)[];
  result: DuelResult | null;
}
