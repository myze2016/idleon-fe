export const weapons = [
  { id: "sword-and-shield", label: "Sword and shield", description: "Stand your ground.", path: "M40 8v32m-9-9h18m-9 9v12M12 25l14-5 8 8-4 17-12 9-9-13Z" },
  { id: "bow", label: "Bow", description: "Find your mark.", path: "M18 7q38 25 0 50L30 32ZM8 32h46m-8-7 8 7-8 7" },
  { id: "wand", label: "Wand", description: "A spark of possibility.", path: "M13 53 41 25M43 8l3 8 9 3-9 3-3 8-3-8-9-3 9-3ZM16 10v8m-4-4h8M50 42v8m-4-4h8" },
  { id: "staff", label: "Staff", description: "Channel ancient magic.", path: "M28 56V26m0 0C6 12 28-4 40 9c8 12-8 22-12 9M20 27h16" },
  { id: "book", label: "Book", description: "Knowledge is power.", path: "M32 18Q19 9 7 15v35q12-6 25 3 13-9 25-3V15q-12-6-25 3v35M14 24l10 1m-10 8 10 1m16-9 10-1m-10 10 10-1" },
  { id: "spear", label: "Spear", description: "Keep danger at a distance.", path: "M12 56 43 25m-7-3L56 7l-7 25-13-10ZM28 33l7 7" },
  { id: "axe", label: "Axe", description: "Make every swing count.", path: "M17 56 44 9M29 16q-19-2-20 16l22 5 12-20q8 15 16 7L51 8 38 9" },
  { id: "rifle", label: "Rifle", description: "Precision from afar.", path: "M7 44 18 33l9 9-11 13ZM20 33l21-21 8 8-21 21ZM45 15l11-11M29 34l7 8 7-7-8-7M33 14l8-8 5 5" },
  { id: "dual-gun", label: "Dual gun", description: "Twice the firepower.", path: "M5 16h22v11H15v19H5ZM37 16h22v30H49V27H37ZM15 27v9h8v-9m26 0v9h-8v-9" },
  { id: "great-sword", label: "Great sword", description: "A mighty blade.", path: "M17 44 46 7l10-2-2 11-30 35ZM10 37l22 18M17 48 7 59m-3-3 7 6" },
  { id: "dual-knife", label: "Dual knife", description: "Quick and elusive.", path: "M10 8l17 16-6 13-8-8ZM8 35l17 5m-9-3-3 16M54 8 37 24l6 13 8-8ZM56 35l-17 5m9-3 3 16" },
] as const;

export type WeaponType = typeof weapons[number]["id"];
export interface CharacterStats {
  hp: number; mp: number; atk: number; def: number;
  magic: number; magicDef: number; speed: number; range: "melee" | "range";
}
export interface ActionTiming { attackInterval: number; baseSpellCastTime: number; spellCastTime: number }
export interface CharacterSkill { id: string; name: string; description: string; passive: boolean; mpCost: number; hpCost: number; baseCastTime: number; cooldown: number; unlocked: boolean }
export interface Character { name: string; weapon: WeaponType; id?: string; isStarter?: boolean; stats?: CharacterStats; skill2Unlocked?: boolean; timing?: ActionTiming; skills?: CharacterSkill[] }
export interface AccountProgress { level: number; totalExp: number; exp: number; expToNextLevel: number }
export interface CharacterState { character: Character | null; characters: Character[]; wishCurrency: number; gold: number; progression: AccountProgress }

export function weaponDetails(id: WeaponType) {
  return weapons.find((weapon) => weapon.id === id)!;
}
