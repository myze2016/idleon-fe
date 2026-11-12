import type { CharacterStats, AccountProgress } from "./character";

export interface EnemyEncounter {
  summoned?: boolean; deepSeaProgress?: { defeated: number; target: number };
  yellowSpectator?: boolean;
  spectatorGroup?: number;
  additionalEnemies?: EnemyEncounter[];
  id: string; type: "warrior" | "slinger" | "boar" | "slime" | "plant" | "mutant-boar" | "coco-klan-chief" | "crab-day" | "crab-night" | "hermit" | "starfish" | "fishpeople-spearman" | "fishpeople-hunter" | "fishpeople-magos" | "fishpeople-guide" | "gladiator" | "spearman" | "assassin" | "zugwang" | "demon-prince" | "fishpeople-guard" | "fishpeople-archer" | "fishpeople-rider" | "fishpeople-guardian" | "baracudon" | "fishpeople-cleric" | "fishpeople-researcher" | "fishpeople-knight" | "fishpeople-rifler" | "fishpeople-baron" | "fishpeople-lord"; name: string; stats: CharacterStats; gold: number;
  boss: boolean; wishCurrency: number; meadowProgress?: { defeated: number; target: number | null };
  period?: "day" | "night"; harborProgress?: { defeated: number; target: number | null };
  tourneyProgress?: { defeated: number; target: number | null };
  forestProgress?: { defeated: number; target: number | null };
}
export interface BattleStep {
  at: number;
  actor: "team" | "enemy"; characterId: string; damage: number; enemyHp: number; teamHp: number[];
  kind?: "attack" | "cast" | "skill" | "heal" | "buff" | "poison" | "block" | "counter" | "double" | "mana" | "bleed";
  label?: string; teamMp?: number[]; healing?: number; castEndsAt?: number; targetIds?: string[]; critical?: boolean;
  teamCasting?: ({ name: string; startedAt: number; endsAt: number } | null)[];
  enemyIndex?: number; enemyHps?: number[];
}
export interface BattleResult { artifactsEarned?: (import("./artifact").Artifact & { name: string })[]; enemies?: EnemyEncounter[]; deepSeaFloor?: number; deepSeaJustUnlocked?: boolean; deepSeaProgress?: { defeated: number; target: number }; garnalandUnlocked?: boolean; garnalandJustUnlocked?: boolean; questItemsEarned?: import("./character").QuestItem[]; won: boolean; steps: BattleStep[]; goldEarned: number; gold: number; expEarned: number; progression: AccountProgress;
  wishEarned?: number; wishCurrency?: number; enemyHps?: number[]; meadowProgress?: { defeated: number; target: number | null };
  levelsGained?: number;
  initialTeamHp?: number[]; initialTeamMp?: number[]; teamHp?: number[]; teamMp?: number[];
  period?: "day" | "night"; harborProgress?: { defeated: number; target: number | null };
  tourneyProgress?: { defeated: number; target: number | null };
  forestProgress?: { defeated: number; target: number | null };
}
