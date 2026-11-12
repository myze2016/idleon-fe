export const artifactCatalog = [
  { stat: "hp", name: "Vitality Gem", label: "HP", color: "#dd8992" },
  { stat: "mp", name: "Mana Crystal", label: "MP", color: "#86b9ed" },
  { stat: "atk", name: "Power Fang", label: "ATK", color: "#e4ad7c" },
  { stat: "def", name: "Iron Crest", label: "DEF", color: "#b4c5cc" },
  { stat: "magic", name: "Arcane Orb", label: "Magic", color: "#c5a1e9" },
  { stat: "magicDef", name: "Ward Rune", label: "Magic DEF", color: "#83d1c4" },
  { stat: "speed", name: "Wind Feather", label: "Speed", color: "#cae19c" },
] as const;
const deepSeaArtifact = { stat: "deep-sea", name: "Deep Sea Artifact", label: "Magic and Defense", color: "#79d8d5" } as const;
export interface Artifact { id: string; stat: typeof artifactCatalog[number]["stat"] | "deep-sea"; characterId: string | null; enhancementLevel: number }
export const artifactBonus = (level = 0) => 5 + level * 2;
export const artifactDetails = (stat: string) => stat === "deep-sea" ? deepSeaArtifact : artifactCatalog.find((item) => item.stat === stat)!;
export const artifactStatText = (stat: string, level = 0) => stat === "deep-sea" ? `+${artifactBonus(level)} Magic · +${artifactBonus(level)} Defense` : `+${artifactBonus(level)} ${artifactDetails(stat).label}`;
