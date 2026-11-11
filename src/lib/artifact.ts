export const artifactCatalog = [
  { stat: "hp", name: "Vitality Gem", label: "HP", color: "#dd8992" },
  { stat: "mp", name: "Mana Crystal", label: "MP", color: "#86b9ed" },
  { stat: "atk", name: "Power Fang", label: "ATK", color: "#e4ad7c" },
  { stat: "def", name: "Iron Crest", label: "DEF", color: "#b4c5cc" },
  { stat: "magic", name: "Arcane Orb", label: "Magic", color: "#c5a1e9" },
  { stat: "magicDef", name: "Ward Rune", label: "Magic DEF", color: "#83d1c4" },
  { stat: "speed", name: "Wind Feather", label: "Speed", color: "#cae19c" },
] as const;
export interface Artifact { id: string; stat: typeof artifactCatalog[number]["stat"]; characterId: string | null }
export const artifactDetails = (stat: string) => artifactCatalog.find((item) => item.stat === stat)!;
