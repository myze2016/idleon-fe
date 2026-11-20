import type { ArenaFighter, DuelStep } from "@/components/game/pvp-types";

export const ENDLESS_STAT_STEP_METERS = 500;
export function endlessStatFactor(distance: number, multiplier: number) {
  return Math.min(1_000_000, multiplier ** Math.floor(Math.max(0, distance) / ENDLESS_STAT_STEP_METERS));
}

export interface EndlessConfig { enabled: boolean; enemyPool: string[]; statMultiplier: number }
export interface EndlessResult { fighters: ArenaFighter[]; steps: DuelStep[]; duration: number; winnerId: string | null }
export interface EndlessRun {
  id: string; season: number; status: string; wave: number; bestWave: number; distance: number;
  team: ArenaFighter[]; settings: EndlessConfig;
  pending: { enemyType: string; result: EndlessResult } | null;
  readyAt: string | null; serverNow: string; createdAt: string;
}
export interface EndlessHome { version: number; config: EndlessConfig; run: EndlessRun | null; enemies: { id: string; name: string }[] }
export interface EndlessLeaderboard { season: number; currentSeason: number; entries: { rank: number; username: string; bestWave: number; isMe: boolean }[]; mine: { rank: number; bestWave: number } | null }
