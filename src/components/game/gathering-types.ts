import type { WeaponType } from "@/lib/character";

export interface GatheringMembership { roomId: number; token: string; x: number; y: number }
export interface GatheringPlayer { id: string; username: string; name: string; weapon: WeaponType; x: number; y: number }
export interface GatheringState {
  roomId: number; capacity: number; serverNow: string;
  players: GatheringPlayer[];
  messages: { id: string; userId: string; username: string; body: string; createdAt: string }[];
  challenges: { id: string; fromId: string; toId: string; status: string; expiresAt: string }[];
  pvpCode: string | null;
}
