import type { CharacterStats, AccountProgress } from "./character";

export interface EnemyEncounter {
  additionalEnemies?: EnemyEncounter[];
  id: string; type: "warrior" | "slinger" | "boar" | "slime" | "plant" | "mutant-boar" | "coco-klan-chief"; name: string; stats: CharacterStats; gold: number;
  boss: boolean; wishCurrency: number; meadowProgress?: { defeated: number; target: number | null };
  forestProgress?: { defeated: number; target: number | null };
}
export interface BattleStep {
  at: number;
  actor: "team" | "enemy"; characterId: string; damage: number; enemyHp: number; teamHp: number[];
  kind?: "attack" | "cast" | "skill" | "heal" | "buff" | "poison" | "block" | "counter" | "double";
  label?: string; teamMp?: number[]; healing?: number; castEndsAt?: number; targetIds?: string[]; critical?: boolean;
  teamCasting?: ({ name: string; startedAt: number; endsAt: number } | null)[];
  enemyIndex?: number; enemyHps?: number[];
}
export interface BattleResult { won: boolean; steps: BattleStep[]; goldEarned: number; gold: number; expEarned: number; progression: AccountProgress;
  wishEarned?: number; wishCurrency?: number; enemyHps?: number[]; meadowProgress?: { defeated: number; target: number | null };
  levelsGained?: number;
  initialTeamHp?: number[]; initialTeamMp?: number[]; teamHp?: number[]; teamMp?: number[];
  forestProgress?: { defeated: number; target: number | null };
}
